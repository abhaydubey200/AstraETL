CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_checkpoints_unique 
ON public.pipeline_checkpoints (pipeline_id, source_table);