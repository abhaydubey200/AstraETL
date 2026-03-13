-- migration: 20260309200000_phase6_orchestration.sql
-- Phase 6 Improvements: Advanced Orchestration & Cross-Pipeline Dependencies

-- 1. Create pipeline_triggers table for chaining
CREATE TABLE IF NOT EXISTS public.pipeline_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    child_pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    trigger_type TEXT DEFAULT 'on_success' CHECK (trigger_type IN ('on_success', 'on_failure', 'on_complete')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_pipeline_id, child_pipeline_id)
);

-- 2. Add resource management columns to pipelines
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipelines' AND column_name = 'max_concurrent_runs') THEN
        ALTER TABLE public.pipelines ADD COLUMN max_concurrent_runs INTEGER DEFAULT 5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipelines' AND column_name = 'priority') THEN
        ALTER TABLE public.pipelines ADD COLUMN priority INTEGER DEFAULT 1;
    END IF;
END $$;

-- 3. Add dependency status to runs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'dependency_status') THEN
        ALTER TABLE public.pipeline_runs ADD COLUMN dependency_status TEXT DEFAULT 'none';
    END IF;
END $$;

-- RLS
ALTER TABLE public.pipeline_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on pipeline_triggers" ON public.pipeline_triggers FOR SELECT USING (true);
