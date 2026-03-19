-- Migration to structure pipeline configurations and add execution tracking

-- 1. Create pipeline_task_runs table
CREATE TABLE IF NOT EXISTS public.pipeline_task_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_run_id UUID NOT NULL REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.pipeline_nodes(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_task_runs_run_id ON public.pipeline_task_runs(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_task_runs_node_id ON public.pipeline_task_runs(node_id);

-- 2. Create pipeline_checkpoints table
CREATE TABLE IF NOT EXISTS public.pipeline_checkpoints (
    task_id UUID NOT NULL REFERENCES public.pipeline_task_runs(id) ON DELETE CASCADE,
    last_processed_offset VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id)
);

-- We won't tightly rename config_json to avoid destroying existing pipelines unless required.
-- However, we ensure node structures are respected via the API models.
