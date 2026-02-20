// Supabase Edge Function: finish-no-round
// 라운드 결과 확정 시 클라이언트가 호출. 서버가 no_round_results 기준으로 1등(duration_ms 최소) 계산 후 no_rounds.winner_client_id 저장.

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};
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

    const { data: results, error: resultsError } = await supabase
      .from("no_round_results")
      .select("client_id, duration_ms")
      .eq("round_id", round_id);

    if (resultsError) {
      return new Response(
        JSON.stringify({ error: resultsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let winnerClientId: string | null = null;
    let bestDuration = Infinity;

    for (const r of results ?? []) {
      const d = r.duration_ms ?? Infinity;
      if (d < bestDuration) {
        bestDuration = d;
        winnerClientId = r.client_id;
      }
    }

    const { error: updateError } = await supabase
      .from("no_rounds")
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
