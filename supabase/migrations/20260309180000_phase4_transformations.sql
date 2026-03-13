-- migration: 20260309180000_phase4_transformations.sql
-- Phase 4 Improvements: Advanced Transformations & External Engine Support

-- 1. Extend astra_worker_queue for external engines
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'astra_worker_queue' AND column_name = 'engine_type') THEN
        ALTER TABLE public.astra_worker_queue ADD COLUMN engine_type TEXT DEFAULT 'internal' CHECK (engine_type IN ('internal', 'spark', 'databricks'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'astra_worker_queue' AND column_name = 'external_job_id') THEN
        ALTER TABLE public.astra_worker_queue ADD COLUMN external_job_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'astra_worker_queue' AND column_name = 'engine_status') THEN
        ALTER TABLE public.astra_worker_queue ADD COLUMN engine_status TEXT;
    END IF;
END $$;

-- 2. Extend pipeline_nodes for custom logic
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipeline_nodes' AND column_name = 'transformation_script') THEN
        ALTER TABLE public.pipeline_nodes ADD COLUMN transformation_script TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipeline_nodes' AND column_name = 'script_type') THEN
        ALTER TABLE public.pipeline_nodes ADD COLUMN script_type TEXT DEFAULT 'js' CHECK (script_type IN ('js', 'sql'));
    END IF;
END $$;
