import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all connections
    const { data: connections, error: fetchErr } = await supabase
      .from("connections")
      .select("*");

    if (fetchErr) throw fetchErr;

    const results = [];

    for (const conn of connections ?? []) {
      console.log(`Checking health for connection: ${conn.name} (${conn.id})`);
      
      // We invoke the existing connection-test function to avoid code duplication
      // and ensure consistent testing logic across manual and automatic checks.
      try {
        const { data: testResult, error: testErr } = await supabase.functions.invoke("connection-test", {
          body: { connection_id: conn.id },
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        });

        results.push({
          id: conn.id,
          name: conn.name,
          success: !testErr && testResult?.success,
          error: testErr?.message || testResult?.error || null,
        });
      } catch (e) {
        results.push({
          id: conn.id,
          name: conn.name,
          success: false,
          error: (e as Error).message,
        });
      }
    }

    return new Response(
      JSON.stringify({ checked: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Health check error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
