-- Migration: 20260311000400_dag_orchestration.sql
-- Phase 3 - Workflow Orchestration Engine

-- 1. Tasks Table
-- Defines individual units of work within a pipeline
CREATE TABLE IF NOT EXISTS public.pipeline_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('EXTRACT', 'TRANSFORM', 'LOAD', 'SQL', 'PYTHON', 'API', 'VALIDATION', 'ALERT')),
    config_json JSONB DEFAULT '{}',
    retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 3600,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Task Dependencies
-- Defines the Directed Acyclic Graph edges
CREATE TABLE IF NOT EXISTS public.pipeline_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES public.pipeline_tasks(id) ON DELETE CASCADE,
    child_task_id UUID REFERENCES public.pipeline_tasks(id) ON DELETE CASCADE,
    UNIQUE(pipeline_id, parent_task_id, child_task_id)
);

-- 3. Task Execution Runs
-- Tracks execution of individual tasks per pipeline run
CREATE TABLE IF NOT EXISTS public.task_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.pipeline_tasks(id) ON DELETE CASCADE,
    worker_id UUID, -- References a worker instance
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'retrying', 'skipped')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Granular Task Logs
-- Fine-grained logging for each task run
CREATE TABLE IF NOT EXISTS public.task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_run_id UUID REFERENCES public.task_runs(id) ON DELETE CASCADE,
    log_level TEXT DEFAULT 'INFO' CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_tasks_pipeline_id ON public.pipeline_tasks(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deps_pipeline_id ON public.pipeline_dependencies(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_run_id ON public.task_runs(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_run_id ON public.task_logs(task_run_id);

-- Add a column to pipelines for default execution mode (LINEAR vs DAG)
ALTER TABLE public.pipelines ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'LINEAR' CHECK (execution_mode IN ('LINEAR', 'DAG'));
