-- Migration: 20260311000000_worker_resilience.sql
-- Phase 1 - Core Platform Stabilization: Worker Reliability

-- 1. Worker Heartbeats Table
CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
    worker_id UUID PRIMARY KEY,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'suspended')),
    metadata JSONB DEFAULT '{}'
);

-- Index for quick timeout detection
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_seen ON public.worker_heartbeats(last_seen);

-- 2. Dead Letter Queue (Failed Jobs) Table
CREATE TABLE IF NOT EXISTS public.failed_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID, -- Reference to original astra_worker_queue.id (optional if we move data)
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    payload JSONB,
    error_message TEXT,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enhance astra_worker_queue with retry columns
ALTER TABLE public.astra_worker_queue ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.astra_worker_queue ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- 4. Enable RLS
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for all (internal workers)" ON public.worker_heartbeats FOR ALL USING (true);
CREATE POLICY "Enable read for monitoring" ON public.failed_jobs FOR SELECT USING (true);
