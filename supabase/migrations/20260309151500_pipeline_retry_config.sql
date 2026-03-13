-- migration: 20260309151500_pipeline_retry_config.sql

-- Add max_retries to pipelines
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipelines' AND column_name = 'max_retries') THEN
        ALTER TABLE public.pipelines ADD COLUMN max_retries INT DEFAULT 3;
    END IF;
END $$;
