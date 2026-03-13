-- Enterprise Connection System Upgrade
-- Adds support for capabilities, performance metrics, secret management, and schema caching.

-- 1. Update connections table
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'standard';

-- 2. connection_credentials (Vault References)
CREATE TABLE IF NOT EXISTS public.connection_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
    secret_ref TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. connection_capabilities
CREATE TABLE IF NOT EXISTS public.connection_capabilities (
    connection_id UUID PRIMARY KEY REFERENCES public.connections(id) ON DELETE CASCADE,
    supports_cdc BOOLEAN DEFAULT false,
    supports_incremental BOOLEAN DEFAULT false,
    supports_parallel_reads BOOLEAN DEFAULT false,
    supports_transactions BOOLEAN DEFAULT false,
    max_connections INTEGER DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. connection_performance
CREATE TABLE IF NOT EXISTS public.connection_performance (
    connection_id UUID PRIMARY KEY REFERENCES public.connections(id) ON DELETE CASCADE,
    avg_latency_ms FLOAT DEFAULT 0,
    avg_query_time_ms FLOAT DEFAULT 0,
    requests_per_minute FLOAT DEFAULT 0,
    error_rate FLOAT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. schema_metadata (Cache)
CREATE TABLE IF NOT EXISTS public.schema_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
    schema_name TEXT NOT NULL,
    table_count INTEGER DEFAULT 0,
    last_discovered TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, schema_name)
);

-- 6. table_metadata (Cache)
CREATE TABLE IF NOT EXISTS public.table_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    row_count BIGINT DEFAULT 0,
    table_size BIGINT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, schema_name, table_name)
);

-- 7. column_metadata (Cache)
CREATE TABLE IF NOT EXISTS public.column_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES public.table_metadata(id) ON DELETE CASCADE,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    is_nullable BOOLEAN DEFAULT true,
    is_primary_key BOOLEAN DEFAULT false,
    UNIQUE(table_id, column_name)
);

-- 8. Enable RLS
ALTER TABLE public.connection_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_metadata ENABLE ROW LEVEL SECURITY;

-- 9. Allow read access (Simplified for dev)
CREATE POLICY "Allow select on enterprise tables" ON public.connection_credentials FOR SELECT USING (true);
CREATE POLICY "Allow select on connection_capabilities" ON public.connection_capabilities FOR SELECT USING (true);
CREATE POLICY "Allow select on connection_performance" ON public.connection_performance FOR SELECT USING (true);
CREATE POLICY "Allow select on schema_metadata" ON public.schema_metadata FOR SELECT USING (true);
CREATE POLICY "Allow select on table_metadata" ON public.table_metadata FOR SELECT USING (true);
CREATE POLICY "Allow select on column_metadata" ON public.column_metadata FOR SELECT USING (true);
