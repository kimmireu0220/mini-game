// Supabase Edge Function: start-updown-round
// 호스트만 호출. updown_rounds에 secret_number(1~1 임시) 생성,
// 해당 방 참가자 전원에 대해 updown_round_player_ranges에 min=1, max=1 삽입.

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
      .from("updown_rooms")
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

    const secretNumber = 1; // 임시 1~1
    const startAt = new Date(Date.now() + 3000).toISOString(); // 3초 후 입력 가능(카운트다운 동기화용)

    const { data: round, error: insertRoundError } = await supabase
      .from("updown_rounds")
      .insert({
        room_id,
        secret_number: secretNumber,
        status: "playing",
        winner_client_id: null,
        start_at: startAt,
      })
      .select("id, created_at, start_at")
      .single();

    if (insertRoundError || !round) {
      return new Response(
        JSON.stringify({ error: insertRoundError?.message || "Failed to create round" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: players, error: playersError } = await supabase
      .from("updown_room_players")
      .select("client_id")
      .eq("room_id", room_id);

    if (playersError || !players?.length) {
      return new Response(
        JSON.stringify({ error: "No players in room" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ranges = players.map((p: { client_id: string }) => ({
      round_id: round.id,
      client_id: p.client_id,
      min: 1,
      max: 1,
    }));

    const { error: rangesError } = await supabase
      .from("updown_round_player_ranges")
      .insert(ranges);

    if (rangesError) {
      return new Response(
        JSON.stringify({ error: rangesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ round_id: round.id, created_at: round.created_at, start_at: round.start_at }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
