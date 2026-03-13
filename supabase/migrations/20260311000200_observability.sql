-- Migration: 20260311000200_observability.sql
-- Phase 1 - Core Platform Stabilization: Observability

-- 1. Pipeline Logs Table
CREATE TABLE IF NOT EXISTS public.pipeline_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage TEXT,
    log_level TEXT DEFAULT 'INFO' CHECK (log_level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for log retrieval
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_run_id ON public.pipeline_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_timestamp ON public.pipeline_logs(timestamp);

-- 2. Enhanced Alerts Table (if not exists or needs upgrade)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity TEXT DEFAULT 'warning',
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'muted'))
);
