-- Add warehouse and schema support to connections
ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS warehouse_name TEXT,
ADD COLUMN IF NOT EXISTS schema_name TEXT;

-- Update RLS if needed (though usually it covers all columns for authenticated users)
COMMENT ON COLUMN public.connections.warehouse_name IS 'Snowflake specific warehouse name';
COMMENT ON COLUMN public.connections.schema_name IS 'Default schema name for the connection (e.g. public, core, staging)';
