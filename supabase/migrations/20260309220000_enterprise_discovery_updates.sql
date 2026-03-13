-- Migration: 20260309220000_enterprise_discovery_updates.sql
-- Description: Add selected_tables and config to connections for enterprise discovery

ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS selected_tables JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.connections.selected_tables IS 'Array of selected/whitelisted table names for the connection';
COMMENT ON COLUMN public.connections.config IS 'Persistent connection settings and session data';
