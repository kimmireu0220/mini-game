// Supabase Edge Function: get-server-time
// 클라이언트가 서버 시각을 맞춰 카운트다운/시작 시점을 동기화할 때 사용.

declare const Deno: { serve: (handler: (req: Request) => Promise<Response>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const now = new Date().toISOString();
  return new Response(JSON.stringify({ now }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
