import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

MIGRATION_SQL = """
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

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'Allow read access to connections') THEN
    CREATE POLICY "Allow read access to connections" ON public.connections FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'Allow insert connections') THEN
    CREATE POLICY "Allow insert connections" ON public.connections FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'Allow update connections') THEN
    CREATE POLICY "Allow update connections" ON public.connections FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'Allow delete connections') THEN
    CREATE POLICY "Allow delete connections" ON public.connections FOR DELETE USING (true);
  END IF;
END $$;

-- 2. update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. connection_secrets table
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'connection_secrets' AND policyname = 'Allow secrets access') THEN
    CREATE POLICY "Allow secrets access" ON public.connection_secrets USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Secure RPC
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
"""

async def run():
    db_url = os.environ.get("DATABASE_URL")
    print(f"Connecting to database...")
    
    try:
        conn = await asyncpg.connect(db_url, timeout=30)
        try:
            print("Running core table migration...")
            await conn.execute(MIGRATION_SQL)
            print("✅ Migration completed successfully!")
            
            # Verify the table exists
            count = await conn.fetchval("SELECT COUNT(*) FROM public.connections")
            print(f"✅ Connections table verified. Current rows: {count}")
        finally:
            await conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(run())
