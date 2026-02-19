// Supabase Edge Function: submit-updown-guess
// 숫자 제출 처리. 서버만 secret_number를 보므로 여기서 판정.

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
    const { round_id, client_id, guess } = await req.json();
    if (!round_id || !client_id || guess === undefined || guess === null) {
      return new Response(
        JSON.stringify({ error: "round_id, client_id, guess required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const g = Number(guess);
    if (!Number.isInteger(g) || g < 1 || g > 1) {
      return new Response(
        JSON.stringify({ error: "guess must be integer 1~1 (임시)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: round, error: roundError } = await supabase
      .from("updown_rounds")
      .select("id, secret_number, status")
      .eq("id", round_id)
      .single();

    if (roundError || !round) {
      return new Response(
        JSON.stringify({ error: "Round not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (round.status !== "playing") {
      return new Response(
        JSON.stringify({ error: "게임이 이미 종료되었습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: rangeRow, error: rangeError } = await supabase
      .from("updown_round_player_ranges")
      .select("min, max")
      .eq("round_id", round_id)
      .eq("client_id", client_id)
      .single();

    if (rangeError || !rangeRow) {
      return new Response(
        JSON.stringify({ error: "You are not in this round" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { min, max } = rangeRow;
    if (g < min || g > max) {
      return new Response(
        JSON.stringify({ error: "현재 범위 안의 숫자만 입력하세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secret = Number(round.secret_number);

    if (g === secret) {
      const { error: updateError } = await supabase
        .from("updown_rounds")
        .update({
          status: "finished",
          winner_client_id: client_id,
          winner_at: new Date().toISOString(),
        })
        .eq("id", round_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ result: "correct" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (g < secret) {
      const newMin = g + 1;
      const { error: updateError } = await supabase
        .from("updown_round_player_ranges")
        .update({ min: newMin })
        .eq("round_id", round_id)
        .eq("client_id", client_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ result: "up", min: newMin, max }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newMax = g - 1;
    const { error: updateError } = await supabase
      .from("updown_round_player_ranges")
      .update({ max: newMax })
      .eq("round_id", round_id)
      .eq("client_id", client_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ result: "down", min, max: newMax }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
