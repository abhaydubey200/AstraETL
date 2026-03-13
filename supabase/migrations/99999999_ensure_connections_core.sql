-- Run this directly in Supabase SQL Editor or via migration script
-- Creates all essential tables needed for AstraFlow backend

-- 1. connections table (if not exists)
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 5432,
  database_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  ssl_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'disconnected',
  last_tested_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (IF not already enabled)
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Allow all operations (dev mode)
DROP POLICY IF EXISTS "Allow read access to connections" ON public.connections;
DROP POLICY IF EXISTS "Allow insert connections" ON public.connections;
DROP POLICY IF EXISTS "Allow update connections" ON public.connections;
DROP POLICY IF EXISTS "Allow delete connections" ON public.connections;

CREATE POLICY "Allow read access to connections" ON public.connections FOR SELECT USING (true);
CREATE POLICY "Allow insert connections" ON public.connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update connections" ON public.connections FOR UPDATE USING (true);
CREATE POLICY "Allow delete connections" ON public.connections FOR DELETE USING (true);

-- 2. update_updated_at function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger on connections
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. connection_secrets table (if not exists)
CREATE TABLE IF NOT EXISTS public.connection_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
    secret_key TEXT NOT NULL,
    secret_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, secret_key)
);

ALTER TABLE public.connection_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role full access" ON public.connection_secrets;
CREATE POLICY "Service Role full access" ON public.connection_secrets USING (true);

-- 4. Secure RPC for secrets
CREATE OR REPLACE FUNCTION public.get_connection_secrets(p_connection_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(secret_key, secret_value) INTO result
    FROM public.connection_secrets
    WHERE connection_id = p_connection_id;
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
