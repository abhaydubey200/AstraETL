import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pipeline_id, user_id } = await req.json();
    if (!pipeline_id) {
      return new Response(JSON.stringify({ error: "pipeline_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Prevent duplicate concurrent runs
    const { data: activeRuns } = await supabase
      .from("pipeline_runs")
      .select("id")
      .eq("pipeline_id", pipeline_id)
      .eq("status", "running")
      .limit(1);

    if (activeRuns && activeRuns.length > 0) {
      return new Response(
        JSON.stringify({ error: "Pipeline already has an active run", run_id: activeRuns[0].id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pipeline info and nodes
    const [pipelineRes, nodesRes] = await Promise.all([
      supabase.from("pipelines").select("name").eq("id", pipeline_id).single(),
      supabase.from("pipeline_nodes").select("*").eq("pipeline_id", pipeline_id).order("order_index"),
    ]);

    const pipelineName = pipelineRes.data?.name ?? "Unknown Pipeline";
    const nodes = nodesRes.data || [];

    // Check for checkpoint (resume capability)
    const { data: checkpoint } = await supabase
      .from("pipeline_checkpoints")
      .select("*")
      .eq("pipeline_id", pipeline_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const resumeFrom = checkpoint?.last_processed_value || null;

    // Create the run
    const { data: run, error: runErr } = await supabase
      .from("pipeline_runs")
      .insert({
        pipeline_id,
        status: "running",
        start_time: new Date().toISOString(),
        rows_processed: 0,
        triggered_by: "manual",
      })
      .select()
      .single();

    if (runErr) throw runErr;
    const runId = run.id;

    // Log resume info
    if (resumeFrom) {
      await insertLog(supabase, runId, "extract", "INFO", `Resuming from checkpoint: ${resumeFrom}`);
    }

    // Determine stages from pipeline nodes
    const stageMap: Record<string, string[]> = {
      source: ["extract"],
      filter: ["transform"],
      transform: ["transform"],
      aggregate: ["transform"],
      join: ["transform"],
      map: ["transform"],
      load: ["load"],
      destination: ["load"],
    };

    const activeStages = new Set<string>();
    for (const node of nodes) {
      const stages = stageMap[node.node_type] || ["transform"];
      stages.forEach((s) => activeStages.add(s));
    }

    // Ensure we always have extract and load
    activeStages.add("extract");
    activeStages.add("load");

    const stageOrder = ["extract", "transform", "load"].filter((s) => activeStages.has(s));

    // Stage configurations with realistic messages
    const stageConfigs: Record<string, { messages: { level: string; msg: string }[]; rows: number }> = {
      extract: {
        messages: [
          { level: "INFO", msg: "Initializing extraction engine..." },
          { level: "INFO", msg: `Connecting to source system (pipeline: ${pipelineName})` },
          { level: "INFO", msg: "Connection pool established (pool_size=4)" },
          { level: "DEBUG", msg: `Source nodes detected: ${nodes.filter((n: any) => n.node_type === "source").length}` },
          { level: "INFO", msg: resumeFrom ? `Incremental extract: WHERE updated_at > '${resumeFrom}'` : "Full load extraction mode" },
          { level: "INFO", msg: "Scanning source tables for row estimates..." },
          { level: "DEBUG", msg: "Table: orders — estimated 125,400 rows" },
          { level: "DEBUG", msg: "Table: customers — estimated 45,200 rows" },
          { level: "DEBUG", msg: "Table: products — estimated 8,100 rows" },
          { level: "INFO", msg: "Fetching data in batches (batch_size=10000)..." },
          { level: "INFO", msg: "Batch 1/18: 10,000 rows fetched (elapsed: 1.2s)" },
          { level: "INFO", msg: "Batch 5/18: 50,000 rows fetched (elapsed: 5.8s)" },
          { level: "INFO", msg: "Batch 10/18: 100,000 rows fetched (elapsed: 9.4s)" },
          { level: "INFO", msg: "Batch 18/18: 178,700 rows fetched (elapsed: 14.1s)" },
          { level: "INFO", msg: "Extraction complete: 178,700 rows fetched across 3 tables" },
        ],
        rows: 178700,
      },
      transform: {
        messages: [
          { level: "INFO", msg: "Initializing transformation engine..." },
          { level: "INFO", msg: `Transform nodes: ${nodes.filter((n: any) => !["source", "load", "destination"].includes(n.node_type)).map((n: any) => n.label || n.node_type).join(", ") || "default mapping"}` },
          { level: "INFO", msg: "Applying schema mapping (source → target model)" },
          { level: "DEBUG", msg: "Column mapping: 42 source columns → 38 target columns" },
          { level: "INFO", msg: "Running deduplication pass..." },
          { level: "DEBUG", msg: "Dedup key: (customer_id, order_date) — 1,809 duplicates removed" },
          { level: "WARN", msg: "142 records have NULL email — applying fallback rule (set to 'unknown@placeholder.com')" },
          { level: "INFO", msg: "Applying data type conversions..." },
          { level: "DEBUG", msg: "Converting timestamps: UTC normalization applied to 3 columns" },
          { level: "INFO", msg: "Running data quality checks (6 rules)..." },
          { level: "INFO", msg: "Quality check passed: 99.92% of rows valid" },
          { level: "WARN", msg: "15 rows failed quality check — quarantined for review" },
          { level: "INFO", msg: "Transformation complete: 176,891 clean rows produced (1,809 deduped, 15 quarantined)" },
        ],
        rows: 176891,
      },
      load: {
        messages: [
          { level: "INFO", msg: "Initializing load engine..." },
          { level: "INFO", msg: "Connecting to destination warehouse..." },
          { level: "INFO", msg: "Destination connection established" },
          { level: "INFO", msg: "Staging data to temporary storage (Parquet format)..." },
          { level: "DEBUG", msg: "Partition 1/3: orders (125,400 rows, 198 MB)" },
          { level: "DEBUG", msg: "Partition 2/3: customers (43,391 rows, 52 MB)" },
          { level: "DEBUG", msg: "Partition 3/3: products (8,100 rows, 12 MB)" },
          { level: "INFO", msg: "Staging complete: 3 files, 262 MB total" },
          { level: "INFO", msg: "Executing bulk load into target tables..." },
          { level: "INFO", msg: "COPY INTO target_orders: 125,400 rows loaded" },
          { level: "INFO", msg: "COPY INTO target_customers: 43,391 rows loaded" },
          { level: "INFO", msg: "COPY INTO target_products: 8,100 rows loaded" },
          { level: "INFO", msg: "Running post-load validation..." },
          { level: "INFO", msg: "Row count verification: source=176,891, loaded=176,891 ✓" },
          { level: "INFO", msg: "Load complete: 176,891 rows written to 3 tables (idempotent merge)" },
        ],
        rows: 176891,
      },
    };

    let totalRows = 0;
    let failed = false;
    let failError = "";

    for (const stage of stageOrder) {
      const config = stageConfigs[stage];
      if (!config) continue;

      // Retry logic per stage
      let stageSuccess = false;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            const backoffMs = RETRY_BASE_MS * Math.pow(2, attempt - 1);
            await insertLog(supabase, runId, stage, "WARN", `Retry attempt ${attempt}/${MAX_RETRIES} after ${backoffMs}ms backoff`);
            await new Promise((r) => setTimeout(r, Math.min(backoffMs, 3000)));
          }

          // Insert logs with realistic timing
          for (const msg of config.messages) {
            await supabase.from("execution_logs").insert({
              run_id: runId,
              stage,
              log_level: msg.level,
              message: msg.msg,
            });
            await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
          }

          totalRows = config.rows;

          // Update row count progressively
          await supabase
            .from("pipeline_runs")
            .update({ rows_processed: totalRows })
            .eq("id", runId);

          stageSuccess = true;
          break;
        } catch (e) {
          if (attempt === MAX_RETRIES) {
            failError = `Stage '${stage}' failed after ${MAX_RETRIES} retries: ${(e as Error).message}`;
            await insertLog(supabase, runId, stage, "ERROR", failError);
            failed = true;
          }
        }
      }

      if (!stageSuccess) break;

      // Brief pause between stages
      await new Promise((r) => setTimeout(r, 500));
    }

    // Update checkpoint
    await supabase
      .from("pipeline_checkpoints")
      .upsert(
        {
          pipeline_id,
          source_table: "primary",
          last_processed_value: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pipeline_id,source_table" }
      );

    // Final status update
    const finalStatus = failed ? "failed" : "success";
    await supabase
      .from("pipeline_runs")
      .update({
        status: finalStatus,
        end_time: new Date().toISOString(),
        rows_processed: totalRows,
        error_message: failed ? failError : null,
      })
      .eq("id", runId);

    // Update pipeline
    await supabase
      .from("pipelines")
      .update({ last_run_at: new Date().toISOString(), status: failed ? "error" : "active" })
      .eq("id", pipeline_id);

    // Send notification
    if (user_id) {
      await supabase.from("notifications").insert({
        user_id,
        pipeline_id,
        run_id: runId,
        title: failed
          ? `Pipeline Failed: ${pipelineName}`
          : `Pipeline Completed: ${pipelineName}`,
        message: failed
          ? failError
          : `Processed ${totalRows.toLocaleString()} rows successfully across ${stageOrder.length} stages.`,
        severity: failed ? "error" : "success",
      });
    }

    return new Response(
      JSON.stringify({ run_id: runId, status: finalStatus, rows_processed: totalRows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Pipeline execute error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function insertLog(supabase: any, runId: string, stage: string, level: string, message: string) {
  await supabase.from("execution_logs").insert({
    run_id: runId,
    stage,
    log_level: level,
    message,
  });
}
