-- Refinement migration for AstraFlow Enterprise readiness

-- 1. Enable pgcrypto for advanced encryption if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Refine connections table
ALTER TABLE public.connections 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS credentials_encrypted JSONB, -- For encrypted creds if not using Vault
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- 3. Refine pipeline_runs table for better monitoring
ALTER TABLE public.pipeline_runs
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS processed_bytes BIGINT DEFAULT 0;

-- 4. Refine pipeline_checkpoints table
ALTER TABLE public.pipeline_checkpoints
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- 5. Add audit_logs table for enterprise governance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all audit logs" 
  ON public.audit_logs FOR SELECT 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Ensure indexes for performance on large volumes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_metadata ON public.pipeline_runs USING gin (metadata);
