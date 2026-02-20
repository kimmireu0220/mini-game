// Supabase Edge Function: finish-timing-round
// 라운드 결과 확정 시 클라이언트가 호출. 서버가 presses 기준으로 1등 계산 후 timing_rounds.winner_client_id 저장.

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
    const { round_id } = await req.json();
    if (!round_id) {
      return new Response(
        JSON.stringify({ error: "round_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: round, error: roundError } = await supabase
      .from("timing_rounds")
      .select("id, start_at, target_seconds")
      .eq("id", round_id)
      .single();

    if (roundError || !round) {
      return new Response(
        JSON.stringify({ error: "Round not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: presses, error: pressesError } = await supabase
      .from("timing_round_presses")
      .select("client_id, created_at")
      .eq("round_id", round_id);

    if (pressesError) {
      return new Response(
        JSON.stringify({ error: pressesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startAt = new Date(round.start_at).getTime();
    const targetMs = (round.target_seconds ?? 0) * 1000;
    let winnerClientId: string | null = null;
    let bestOffset = Infinity;

    for (const p of presses ?? []) {
      const created = new Date(p.created_at).getTime();
      const offset = Math.abs(created - startAt - targetMs);
      if (offset < bestOffset) {
        bestOffset = offset;
        winnerClientId = p.client_id;
      }
    }

    const { error: updateError } = await supabase
      .from("timing_rounds")
      .update({ winner_client_id: winnerClientId })
      .eq("id", round_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, winner_client_id: winnerClientId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
