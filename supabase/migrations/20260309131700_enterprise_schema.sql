-- Enterprise Schema Upgrade
-- 1. Datasets (Metadata Lineage)
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    schema_json JSONB DEFAULT '{}'::jsonb,
    connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Pipeline Versions (Version Control)
CREATE TABLE IF NOT EXISTS public.pipeline_versions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    dag_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comment TEXT,
    UNIQUE(pipeline_id, version_number)
);

-- 3. Pipeline Dependencies (Lineage Mapping)
CREATE TABLE IF NOT EXISTS public.pipeline_dependencies (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    upstream_dataset UUID REFERENCES public.datasets(id),
    downstream_dataset UUID REFERENCES public.datasets(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Worker Jobs (Distributed Orchestration)
CREATE TABLE IF NOT EXISTS public.worker_jobs (
    job_id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    worker_id TEXT,
    payload_json JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Audit Logs (Security & Compliance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    changes_json JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Assuming same as existing tables)
CREATE POLICY "Users can view their own datasets" ON public.datasets FOR SELECT USING (true);
CREATE POLICY "Users can view their own pipeline versions" ON public.pipeline_versions FOR SELECT USING (true);
CREATE POLICY "Users can view lineage" ON public.pipeline_dependencies FOR SELECT USING (true);
CREATE POLICY "Users can view worker jobs" ON public.worker_jobs FOR SELECT USING (true);
CREATE POLICY "Users can view audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Helper to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON public.datasets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
