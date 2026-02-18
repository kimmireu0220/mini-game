// Supabase Edge Function: start-round
// 호스트만 호출. rounds에 start_at = now() + 4초, target_seconds = 5~10 랜덤 insert.
// Realtime이 rounds 테이블 변경을 구독자에게 전파함.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { room_id, client_id } = await req.json();
    if (!room_id || !client_id) {
      return new Response(
        JSON.stringify({ error: "room_id and client_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, host_client_id, closed_at")
      .eq("id", room_id)
      .single();

    if (roomError || !room || room.closed_at) {
      return new Response(
        JSON.stringify({ error: "Room not found or closed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (room.host_client_id !== client_id) {
      return new Response(
        JSON.stringify({ error: "Only host can start round" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetSeconds = Math.floor(Math.random() * 6) + 5;
    const startAt = new Date(Date.now() + 4000).toISOString();

    const { data: round, error: insertError } = await supabase
      .from("rounds")
      .insert({
        room_id,
        start_at: startAt,
        target_seconds: targetSeconds,
      })
      .select("id, start_at, target_seconds")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(round), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
