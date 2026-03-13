// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExecuteRequest {
  pipeline_id: string;
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===============================
    // AUTHENTICATION
    // ===============================

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      // Fallback: check if it's the service role key
      const token = authHeader.replace("Bearer ", "");
      const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (token !== serviceRole) {
        return new Response(
          JSON.stringify({ error: "Unauthorized request" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { pipeline_id, user_id: bodyUserId } = await req.json() as ExecuteRequest;
    const finalUserId = bodyUserId || user?.id;

    if (!pipeline_id) {
      return new Response(JSON.stringify({ error: "pipeline_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch Latest Version
    const { data: latestVersion } = await supabase
      .from("pipeline_versions")
      .select("id, version_number")
      .eq("pipeline_id", pipeline_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Concurrency Gating & Resource Check
    const { data: pipelineData } = await supabase.from("pipelines").select("name, environment, max_concurrent_runs, partition_count").eq("id", pipeline_id).single();
    if (!pipelineData) throw new Error("Pipeline not found");
    
    const environment = pipelineData.environment || 'dev';
    const maxConcurrent = pipelineData.max_concurrent_runs || 5;
    const partitionCount = pipelineData.partition_count || 1;

    const { count: currentRunning } = await supabase
      .from("pipeline_runs")
      .select("*", { count: 'exact', head: true })
      .eq("pipeline_id", pipeline_id)
      .eq("status", "running");

    if (currentRunning && currentRunning >= maxConcurrent) {
      return new Response(
        JSON.stringify({ error: `Concurrency limit reached for pipeline. Max: ${maxConcurrent}`, status: 'queued' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const { data: run, error: runErr } = await supabase
      .from("pipeline_runs")
      .insert({
        pipeline_id,
        version_id: latestVersion?.id,
        status: "running",
        start_time: new Date().toISOString(),
        environment: environment
      })
      .select()
      .single();

    if (runErr) throw runErr;
    const runId = run.id;

    // Audit Log: Execution Started
    await supabase.from("audit_logs").insert({
      user_id: finalUserId,
      action: "EXECUTION_STARTED",
      entity_type: "pipeline",
      entity_id: pipeline_id,
      changes_json: { run_id: runId, version: latestVersion?.version_number }
    });

    await insertLog(supabase, runId, "orchestrator", "INFO", `Initializing distributed pipeline execution (Version: ${latestVersion?.version_number || 'LATEST'})...`);

    try {
      // 3. Fetch Configuration
      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from("pipeline_nodes").select("*").eq("pipeline_id", pipeline_id),
        supabase.from("pipeline_edges").select("*").eq("pipeline_id", pipeline_id),
      ]);

      const nodes = nodesRes.data || [];

      // 4. Simple Orchestration (Linear for V1)
      const sourceNode = nodes.find(n => n.node_type === "source");
      const transformNode = nodes.find(n => n.node_type === "transform");
      const loadNode = nodes.find(n => ["load", "destination"].includes(n.node_type));

      if (!sourceNode || !loadNode) {
        throw new Error("Pipeline must have at least a source and a destination node");
      }

      await insertLog(supabase, runId, "orchestrator", "INFO", `Pipeline topology validated. Creating distributed worker jobs via astra_worker_queue...`);

      // 5. Create the initial worker job(s) in the Queue
      const basePayload = {
        source_config: sourceNode.config_json || {},
        load_config: loadNode.config_json || {},
        user_id: finalUserId,
        pipeline_name: pipelineData.name,
        transformation_script: transformNode?.transformation_script,
        script_type: transformNode?.script_type || 'js',
        engine_type: transformNode?.config_json?.engine_type || 'internal'
      };

      const jobsToInsert = [];
      for (let i = 0; i < partitionCount; i++) {
        jobsToInsert.push({
          pipeline_id,
          run_id: runId,
          stage: "extract",
          status: "pending",
          engine_type: basePayload.engine_type,
          payload: { ...basePayload, partition_id: partitionCount > 1 ? `part_${i}` : 'default' },
          scheduled_at: new Date().toISOString()
        });
      }

      const { data: jobs, error: jobErr } = await supabase
        .from("astra_worker_queue")
        .insert(jobsToInsert)
        .select();

      if (jobErr) throw jobErr;

      await insertLog(supabase, runId, "orchestrator", "INFO", `Jobs Enqueued for Stage: EXTRACT. Awaiting available worker...`);

    } catch (err: any) {
      console.error("Orchestrator Setup failed:", err);
      await insertLog(supabase, runId, "orchestrator", "ERROR", `Setup failed: ${err.message}`);
      await supabase.from("pipeline_runs").update({
        status: "failed",
        end_time: new Date().toISOString(),
        error_message: err.message
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({ run_id: runId, status: "queued" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Execution error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
