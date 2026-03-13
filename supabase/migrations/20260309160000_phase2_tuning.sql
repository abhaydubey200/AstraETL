-- migration: 20260309160000_phase2_tuning.sql
-- Phase 2 Improvements: Governance & Schema Drift Linking

-- 1. Link pipeline_runs to specific versions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'version_id') THEN
        ALTER TABLE public.pipeline_runs ADD COLUMN version_id UUID REFERENCES public.pipeline_versions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Ensure RLS for schema_drift_events and audit_logs is consistent
-- (The enterprise_schema migration already enabled it, but we refine here)
ALTER TABLE public.schema_drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all" ON public.schema_drift_events;
CREATE POLICY "Enable read access for all" ON public.schema_drift_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable read access for all" ON public.audit_logs;
CREATE POLICY "Enable read access for all" ON public.audit_logs FOR SELECT USING (true);

-- 3. Add column_lineage table if not exists (Enterprise roadmap P1)
CREATE TABLE IF NOT EXISTS public.column_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    source_dataset_id UUID REFERENCES public.datasets(id),
    target_dataset_id UUID REFERENCES public.datasets(id),
    source_column TEXT NOT NULL,
    target_column TEXT NOT NULL,
    transformation_logic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.column_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all" ON public.column_lineage FOR SELECT USING (true);
