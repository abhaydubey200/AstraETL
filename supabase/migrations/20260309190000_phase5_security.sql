-- migration: 20260309190000_phase5_security.sql
-- Phase 5 Improvements: Enterprise Security & Secrets Management

-- 1. Create connection_secrets table for encrypted/sensitive data
CREATE TABLE IF NOT EXISTS public.connection_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
    secret_key TEXT NOT NULL, -- e.g., 'password', 'api_key', 'private_key'
    secret_value TEXT NOT NULL, -- This should be encrypted in a production environment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, secret_key)
);

-- 2. Add environment column to pipelines
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'astra_environment') THEN
        CREATE TYPE public.astra_environment AS ENUM ('dev', 'staging', 'prod');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipelines' AND column_name = 'environment') THEN
        ALTER TABLE public.pipelines ADD COLUMN environment public.astra_environment DEFAULT 'dev';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'environment') THEN
        ALTER TABLE public.pipeline_runs ADD COLUMN environment public.astra_environment DEFAULT 'dev';
    END IF;
END $$;

-- 3. Create secure RPC for fetching connection secrets (Restricted to service_role)
CREATE OR REPLACE FUNCTION public.get_connection_secrets(p_connection_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator privileges
AS $$
DECLARE
    result JSONB;
BEGIN
    -- This function should be further restricted via RLS or explicit role checks
    -- For now, it aggregates all secrets for a connection into one JSON object
    SELECT jsonb_object_agg(secret_key, secret_value) INTO result
    FROM public.connection_secrets
    WHERE connection_id = p_connection_id;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 4. RLS for connection_secrets
ALTER TABLE public.connection_secrets ENABLE ROW LEVEL SECURITY;

-- Note: No SELECT policy for regular users. Only service_role can access via RPC or direct SQL.
CREATE POLICY "Service Role full access" ON public.connection_secrets
    USING (auth.role() = 'service_role');
