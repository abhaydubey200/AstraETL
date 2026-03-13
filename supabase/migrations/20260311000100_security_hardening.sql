-- Migration: 20260311000100_security_hardening.sql
-- Phase 1 - Core Platform Stabilization: Security

-- 1. Enhance connection_credentials for encryption key management
ALTER TABLE public.connection_credentials ADD COLUMN IF NOT EXISTS encryption_key_id TEXT;
ALTER TABLE public.connection_credentials ADD COLUMN IF NOT EXISTS iv TEXT; -- Initialization vector for AES-GCM/CBC

-- 2. Audit Logs Enhancement
-- (Already exists in 20260310000000_astraflow_elite_schema.sql, but we ensure it's robust)

-- 3. Rate Limiting Metrics Table (Optional, or handled by middleware)
CREATE TABLE IF NOT EXISTS public.api_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    endpoint TEXT,
    call_count INT DEFAULT 1,
    last_called TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_user_endpoint ON public.api_usage_metrics(user_id, endpoint);
