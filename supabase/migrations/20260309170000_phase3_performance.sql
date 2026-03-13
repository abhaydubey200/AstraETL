-- migration: 20260309170000_phase3_performance.sql
-- Phase 3 Improvements: Parallel Processing & Performance Monitoring

-- 1. Add partition_count to pipelines for parallel extraction
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipelines' AND column_name = 'partition_count') THEN
        ALTER TABLE public.pipelines ADD COLUMN partition_count INT DEFAULT 1;
    END IF;
END $$;

-- 2. Add performance-specific indexes to system_metrics if not already optimal
CREATE INDEX IF NOT EXISTS idx_system_metrics_dimensions ON public.system_metrics USING gin (dimensions);
