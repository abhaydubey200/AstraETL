-- migration: 20260309140000_distributed_engine.sql

-- 1. Create astra_worker_queue table
CREATE TABLE IF NOT EXISTS public.astra_worker_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('extract', 'transform', 'validate', 'load')),
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retry')),
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for queue workers to quickly find pending jobs
CREATE INDEX IF NOT EXISTS idx_astra_worker_queue_status ON public.astra_worker_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_astra_worker_queue_run_id ON public.astra_worker_queue(run_id);

-- 2. Upgrade pipeline_checkpoints table for exactly-once processing
-- Assuming pipeline_checkpoints already exists, we will alter it to add new columns.
-- If it doesn't exist from a previous phase, this will act as the creation.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pipeline_checkpoints') THEN
        CREATE TABLE public.pipeline_checkpoints (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
            source_table TEXT NOT NULL,
            last_processed_value TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE UNIQUE INDEX idx_pipeline_checkpoints_pipeline_source ON public.pipeline_checkpoints(pipeline_id, source_table);
    END IF;
END $$;

-- Add new enterprise checkpointing columns safely
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.pipeline_checkpoints ADD COLUMN partition_id TEXT DEFAULT 'default';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    
    BEGIN
        ALTER TABLE public.pipeline_checkpoints ADD COLUMN offset_value TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    BEGIN
        ALTER TABLE public.pipeline_checkpoints ADD COLUMN status TEXT DEFAULT 'committed' CHECK (status IN ('pending', 'committed'));
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;

-- Update the unique constraint to include partition
DO $$ 
BEGIN
    -- Drop old constraint if we are upgrading it
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pipeline_checkpoints_pipeline_source') THEN
        DROP INDEX idx_pipeline_checkpoints_pipeline_source;
    END IF;
    -- Create new comprehensive unique index
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_checkpoints_composite 
    ON public.pipeline_checkpoints(pipeline_id, source_table, partition_id);
EXCEPTION
    WHEN others THEN null;
END $$;

-- 3. RLS Policies
ALTER TABLE public.astra_worker_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.astra_worker_queue FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.astra_worker_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.astra_worker_queue FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.pipeline_checkpoints FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.pipeline_checkpoints FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.pipeline_checkpoints FOR UPDATE USING (true);

-- Enable Realtime for the queue to allow monitoring Dashboards to see worker jobs
alter publication supabase_realtime add table public.astra_worker_queue;
