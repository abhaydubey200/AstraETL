-- migration: 20260309150000_worker_upgrades.sql
-- Phase 1 Improvements: Scalability & Reliability

-- 1. Add scheduled_at to worker queue for delayed retries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'astra_worker_queue' AND column_name = 'scheduled_at') THEN
        ALTER TABLE public.astra_worker_queue ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. Update index to include scheduled_at for efficient polling
DROP INDEX IF EXISTS idx_astra_worker_queue_status;
CREATE INDEX idx_astra_worker_queue_polling ON public.astra_worker_queue(status, scheduled_at) WHERE status IN ('pending', 'retry');

-- 3. Create Atomic Claim RPC
-- This function uses FOR UPDATE SKIP LOCKED to ensure exactly-one-worker-claims-one-job
CREATE OR REPLACE FUNCTION public.claim_next_worker_job()
RETURNS SETOF public.astra_worker_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_job public.astra_worker_queue;
BEGIN
    RETURN QUERY
    UPDATE public.astra_worker_queue
    SET 
        status = 'processing',
        attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = (
        SELECT id
        FROM public.astra_worker_queue
        WHERE status IN ('pending', 'retry')
          AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING *;
END;
$$;
