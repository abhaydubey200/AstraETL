-- Migration: 20260311000300_staging_architecture.sql
-- Phase 2 - Scalable Data Plane: Staging & Partitioning

-- 1. Pipeline Partitions
-- Used to split large tables into parallel extraction segments
CREATE TABLE IF NOT EXISTS public.pipeline_partitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    partition_key TEXT,
    range_start TEXT,
    range_end TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    worker_id UUID,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Staging Files
-- Tracks files uploaded to object storage (MinIO/S3)
CREATE TABLE IF NOT EXISTS public.staging_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    partition_id UUID REFERENCES public.pipeline_partitions(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL, -- e.g., staging/run_id/table_part_001.parquet
    file_format TEXT NOT NULL DEFAULT 'parquet',
    file_size_bytes BIGINT,
    row_count INTEGER,
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'loading', 'loaded', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bulk Load Jobs
-- Tracks native warehouse bulk load operations
CREATE TABLE IF NOT EXISTS public.bulk_load_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    target_table TEXT NOT NULL,
    command_type TEXT NOT NULL, -- e.g., SNOWFLAKE_COPY, POSTGRES_COPY
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
    rows_loaded INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_partitions_run_id ON public.pipeline_partitions(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_staging_run_id ON public.staging_files(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_bulk_load_run_id ON public.bulk_load_jobs(pipeline_run_id);
