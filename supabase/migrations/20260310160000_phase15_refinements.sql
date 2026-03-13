-- migration: 20260310160000_phase15_refinements.sql
-- Upgrading job claiming for Priority and Concurrency

CREATE OR REPLACE FUNCTION public.claim_next_worker_job()
RETURNS SETOF public.astra_worker_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_job_id UUID;
BEGIN
    -- Select the next job considering priority and concurrency limits
    SELECT q.id INTO target_job_id
    FROM public.astra_worker_queue q
    JOIN public.pipelines p ON q.pipeline_id = p.id
    WHERE q.status IN ('pending', 'retry')
      AND (q.scheduled_at IS NULL OR q.scheduled_at <= NOW())
      -- Check concurrency limit: count of processing jobs for this pipeline across all runs
      AND (
          SELECT count(*) 
          FROM public.astra_worker_queue inner_q 
          WHERE inner_q.pipeline_id = q.pipeline_id 
            AND inner_q.status = 'processing'
      ) < COALESCE(p.max_concurrent_runs, 5)
    ORDER BY COALESCE(p.priority, 1) DESC, q.created_at ASC
    FOR UPDATE OF q SKIP LOCKED
    LIMIT 1;

    IF target_job_id IS NOT NULL THEN
        RETURN QUERY
        UPDATE public.astra_worker_queue
        SET 
            status = 'processing',
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = target_job_id
        RETURNING *;
    END IF;
END;
$$;
