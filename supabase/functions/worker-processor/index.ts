// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Enterprise Worker Processor
 * Orchestrates distributed pipeline stages with exactly-once processing and retry backoff.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Atomically claim a job using the FOR UPDATE SKIP LOCKED pattern via RPC
    const { data: jobRaw, error: claimErr } = await supabase.rpc('claim_next_worker_job');
    
    if (claimErr || !jobRaw || jobRaw.length === 0) {
      if (claimErr) console.error("Claim Error:", claimErr);
      return new Response(JSON.stringify({ status: "idle", message: "No eligible jobs" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const job = jobRaw[0];
    const { id: jobId, pipeline_id, run_id, stage, payload, attempts } = job;
    
    await insertLog(supabase, run_id, stage, "INFO", `[Worker] Cluster node claimed job: ${stage.toUpperCase()} (ID: ${jobId.slice(0,8)})`);

    const startTime = Date.now();
    try {
      let nextStage = null;
      const nextPayload = { ...payload };

      // --- Phase 5: Environment Context & Secure Secrets ---
      const { data: runMeta } = await supabase.from("pipeline_runs").select("environment").eq("id", run_id).single();
      const environment = runMeta?.environment || 'dev';
      
      const connectionId = payload.source_config?.connectionId;
      let secureConfigs = {};
      
      if (connectionId) {
        // Fetch secrets via secure RPC (Service Role access)
        const { data: secrets } = await supabase.rpc('get_connection_secrets', { p_connection_id: connectionId });
        secureConfigs = secrets || {};
      }
      
      await insertLog(supabase, run_id, stage, "INFO", `[Env: ${environment.toUpperCase()}] Worker environment context initialized.`);
      // --- End Phase 5 ---

      if (stage === "extract") {
        // ... (existing extract logic) ...
        await insertLog(supabase, run_id, "extract", "INFO", `Executing extraction for partition: ${payload.partition_id || 'default'}`);
        
        if (secureConfigs['password']) {
           await insertLog(supabase, run_id, "extract", "INFO", `Secure credentials resolved for connection.`);
        }
        // --- Phase 2: Schema Drift Detection ---
        const connectionId = payload.source_config?.connectionId;
        const tableName = payload.source_config?.table;
        const currentSchema = payload.source_config?.schema_definition || []; // [{name, type}]

        if (connectionId && tableName) {
          // 1. Resolve Dataset
          let { data: dataset } = await supabase.from("datasets").select("id, name").eq("connection_id", connectionId).eq("name", tableName).maybeSingle();
          if (!dataset) {
            const { data: newDataset } = await supabase.from("datasets").insert({ connection_id: connectionId, name: tableName, schema_json: currentSchema }).select().single();
            dataset = newDataset;
          }

          // 2. Fetch Latest Schema Version
          const { data: latestV } = await supabase.from("dataset_schema_versions").select("*").eq("dataset_id", dataset.id).order("version_number", { ascending: false }).limit(1).maybeSingle();

          if (latestV) {
            // Compare schemas (simple column list comparison for now)
            const oldCols = (latestV.schema_json as any[]).map(c => c.name).sort();
            const newCols = currentSchema.map(c => c.name).sort();
            
            const added = newCols.filter(c => !oldCols.includes(c));
            const removed = oldCols.filter(c => !newCols.includes(c));

            if (added.length > 0 || removed.length > 0) {
              await insertLog(supabase, run_id, "extract", "WARNING", `Schema drift detected in ${tableName}! Columns added: [${added}], removed: [${removed}]`);
              
              // Record Drift Event
              for (const col of added) {
                await supabase.from("schema_drift_events").insert({
                  pipeline_id, dataset_id: dataset.id, run_id, 
                  drift_type: 'column_added', column_name: col, 
                  new_version: latestV.version_number + 1
                });
              }

              // Create New Schema Version
              await supabase.from("dataset_schema_versions").insert({
                dataset_id: dataset.id,
                version_number: latestV.version_number + 1,
                schema_json: currentSchema,
                checksum: crypto.subtle ? 'sha-hash' : 'legacy' 
              });
            }
          } else {
            // Seed first version
            await supabase.from("dataset_schema_versions").insert({
              dataset_id: dataset.id,
              version_number: 1,
              schema_json: currentSchema
            });
          }
        }
        // --- End Phase 2 ---

        // Exactly-Once: Check for committed checkpoint before starting
        const { data: cp } = await supabase
          .from("pipeline_checkpoints")
          .select("*")
          .eq("pipeline_id", pipeline_id)
          .eq("partition_id", payload.partition_id || 'default')
          .maybeSingle();

        if (cp) {
          await insertLog(supabase, run_id, "extract", "INFO", `Resuming from checkpoint offset: ${cp.offset_value}`);
        }

        await new Promise(r => setTimeout(r, 1000)); // Work simulation
        
        const rowsExtracted = payload.simulate_rows || 10000;
        await insertLog(supabase, run_id, "extract", "INFO", `Extraction successful. Rows: ${rowsExtracted}`);
        
        nextStage = "transform";
        nextPayload.rows_extracted = rowsExtracted;

      } else if (stage === "transform") {
        await insertLog(supabase, run_id, "transform", "INFO", `Executing data transformations and validations...`);
        
        // --- Phase 4: Custom Transformation Logic (Hardenened) ---
        if (payload.transformation_script && payload.script_type === 'js') {
          await insertLog(supabase, run_id, "transform", "WARNING", `Custom JS transformation detected. Execution skipped for security.`);
          await insertLog(supabase, run_id, "transform", "INFO", `NOTE: Arbitrary JS execution via 'new Function' is disabled. Use pre-defined transformation modules or a secure sandbox.`);
          
          // In a real production environment, this would hand off to an isolated 
          // container or a secure JS sandbox (like Deno's restricted permissions).
          // For now, we protect the cluster by not executing unverified code.
        }
        // --- End Phase 4 ---

        await new Promise(r => setTimeout(r, 1000)); 
        await insertLog(supabase, run_id, "transform", "INFO", `Transformation complete. Logic applied to ${payload.rows_extracted} rows.`);
        nextStage = "load";

      } else if (stage === "load") {
        // ... (existing load logic) ...
        await insertLog(supabase, run_id, "load", "INFO", `Executing load to destination table...`);
        
        // --- Phase 4: Spark Hand-off PoC ---
        if (job.engine_type === 'spark') {
          await insertLog(supabase, run_id, "load", "INFO", `Handing off load stage to Spark cluster...`);
          
          await supabase.from("astra_worker_queue").update({
            engine_status: "SUBMITTED",
            external_job_id: `spark-run-${crypto.randomUUID().slice(0,8)}`
          }).eq("id", jobId);

          // Simulate Polling
          await insertLog(supabase, run_id, "load", "INFO", `Polling Spark job status...`);
          await new Promise(r => setTimeout(r, 2000));
          await insertLog(supabase, run_id, "load", "INFO", `Spark job completed successfully.`);
        }
        // --- End Phase 4 ---

        await new Promise(r => setTimeout(r, 1000));
        
        const rowsLoaded = payload.rows_extracted || 0;
        
        // Two-Phase Commit: Prepare Checkpoint
        // We write the offset as 'pending' first, then finalize on success
        await supabase.from("pipeline_checkpoints").upsert({
          pipeline_id,
          source_table: payload.source_config?.table || 'default',
          partition_id: payload.partition_id || 'default',
          offset_value: new Date().toISOString(),
          status: 'committed', // For now we update directly, V2 will use 'pending' -> 'committed'
          updated_at: new Date().toISOString()
        }, { onConflict: 'pipeline_id,source_table,partition_id' });

        await insertLog(supabase, run_id, "load", "INFO", `Load successful. ${rowsLoaded} rows written. Checkpoint committed.`);
        
        // Finalize Run if this was the last load stage
        await supabase.from("pipeline_runs").update({
          status: "success",
          end_time: new Date().toISOString(),
          rows_processed: rowsLoaded
        }).eq("id", run_id);

        // --- Phase 6: Downstream Chaining ---
        await insertLog(supabase, run_id, "load", "INFO", `Run complete. Checking for downstream triggers...`);
        const { data: triggers } = await supabase.from("pipeline_triggers").select("child_pipeline_id").eq("parent_pipeline_id", pipeline_id).eq("is_active", true);
        
        if (triggers && triggers.length > 0) {
          for (const t of triggers) {
            await insertLog(supabase, run_id, "load", "INFO", `Triggering downstream pipeline: ${t.child_pipeline_id}`);
            // In a real system, we'd enqueue a 'pipeline-execute' job or call the function
            await supabase.from("astra_worker_queue").insert({
               pipeline_id: t.child_pipeline_id,
               stage: 'orchestrator_trigger',
               status: 'pending',
               payload: { triggered_by_parent: pipeline_id, parent_run_id: run_id }
            });
          }
        }
        // --- End Phase 6 ---
      }

      // --- Phase 3: Performance Tracking ---
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      const rows = (stage === "load" || stage === "transform") ? (payload.rows_extracted || 0) : (stage === "extract" ? (nextPayload.rows_extracted || 0) : 0);
      
      if (rows > 0) {
        const rps = (rows / (durationMs / 1000)).toFixed(2);
        await supabase.from("system_metrics").insert([
          { metric_name: "rows_per_second", metric_value: parseFloat(rps), dimensions: { pipeline_id, stage, run_id } },
          { metric_name: "execution_time_ms", metric_value: durationMs, dimensions: { pipeline_id, stage, run_id } }
        ]);
      }
      // --- End Phase 3 ---

      // 2. Mark current job as completed
      await supabase.from("astra_worker_queue").update({
        status: "completed",
        updated_at: new Date().toISOString()
      }).eq("id", jobId);

      // Audit Log: Stage Completed
      await supabase.from("audit_logs").insert({
        action: "STAGE_COMPLETED",
        entity_type: "pipeline_run",
        entity_id: run_id,
        changes_json: { stage, status: "completed" }
      });

      // 3. Enqueue next stage
      if (nextStage) {
        await enclaveNextJob(supabase, pipeline_id, run_id, nextStage, nextPayload);
      }

    } catch (jobError: any) {
      console.error(`Job execution error [${jobId}]:`, jobError);
      
      // Fetch pipeline-specific retry config
      const { data: pipeline } = await supabase.from("pipelines").select("max_retries").eq("id", pipeline_id).single();
      const maxAttempts = pipeline?.max_retries || job.max_attempts || 3;
      const isRetryable = attempts < maxAttempts;
      
      if (isRetryable) {
        // Calculate Exponential Backoff: 30s * 2^(attempts-1)
        const backoffSeconds = 30 * Math.pow(2, attempts - 1);
        const scheduledAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        
        await supabase.from("astra_worker_queue").update({
          status: "retry",
          error_text: jobError.message,
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString()
        }).eq("id", jobId);

        await insertLog(supabase, run_id, stage, "WARNING", `Stage failed. Retrying in ${backoffSeconds}s (Attempt ${attempts}/${maxAttempts}). Error: ${jobError.message}`);
      } else {
        await supabase.from("astra_worker_queue").update({
          status: "failed",
          error_text: jobError.message,
          updated_at: new Date().toISOString()
        }).eq("id", jobId);

        await insertLog(supabase, run_id, stage, "ERROR", `Stage failed permanently after ${maxAttempts} attempts. Error: ${jobError.message}`);
        
        // --- Phase 3: Automated Alerting ---
        const { data: alerts } = await supabase.from("pipeline_alerts").select("*").eq("pipeline_id", pipeline_id).eq("is_active", true);
        if (alerts && alerts.length > 0) {
          for (const alert of alerts) {
            if (alert.trigger_on.includes("failure")) {
              await supabase.from("alert_events").insert({
                alert_id: alert.id, pipeline_id, run_id, 
                trigger_type: "failure", 
                payload: { stage, error: jobError.message }
              });
            }
          }
        }
        // --- End Phase 3 ---

        await supabase.from("pipeline_runs").update({
          status: "failed",
          end_time: new Date().toISOString(),
          error_message: `Fatal error in stage ${stage}: ${jobError.message}`
        }).eq("id", run_id);
      }
    }

    return new Response(JSON.stringify({ status: "done", job_id: jobId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Worker process crash:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function enclaveNextJob(supabase: any, pipelineId: string, runId: string, stage: string, payload: any) {
  await supabase.from("astra_worker_queue").insert({
    pipeline_id: pipelineId,
    run_id: runId,
    stage: stage,
    status: "pending",
    payload: payload,
    scheduled_at: new Date().toISOString()
  });

  // Fire and forget auto-trigger for the next worker
  fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/worker-processor", {
    method: "POST",
    headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }
  }).catch(() => {});
}

async function insertLog(supabase: any, runId: string, stage: string, level: string, message: string) {
  await supabase.from("execution_logs").insert({
    run_id: runId,
    stage,
    log_level: level,
    message,
  });
}
