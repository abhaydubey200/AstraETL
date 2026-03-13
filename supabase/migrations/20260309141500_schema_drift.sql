-- migration: 20260309141500_schema_drift.sql
-- Phase 13: Schema Drift Detection & Automated Tracking

-- 1. Dataset Schema Versions -- tracks the "snapshot" of schema over time
CREATE TABLE IF NOT EXISTS public.dataset_schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    schema_json JSONB NOT NULL DEFAULT '[]',   -- Array of column definitions: [{name, type, nullable}]
    checksum TEXT,                              -- SHA-256 hash of schema for fast comparison
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schema_versions_dataset_v ON public.dataset_schema_versions(dataset_id, version_number DESC);

-- 2. Schema Drift Events -- records detected drift incidents
CREATE TABLE IF NOT EXISTS public.schema_drift_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
    run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
    previous_version INT,
    new_version INT,
    drift_type TEXT NOT NULL CHECK (drift_type IN ('column_added', 'column_removed', 'type_changed', 'nullable_changed', 'renamed')),
    column_name TEXT NOT NULL,
    previous_type TEXT,
    new_type TEXT,
    resolution TEXT DEFAULT 'unresolved' CHECK (resolution IN ('unresolved', 'auto_mapped', 'deprecated', 'ignored')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_drift_events_pipeline ON public.schema_drift_events(pipeline_id, detected_at DESC);

-- 3. RLS Policies
ALTER TABLE public.dataset_schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_drift_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON public.dataset_schema_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.schema_drift_events FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for drift events (so UI can show live drift alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.schema_drift_events;
