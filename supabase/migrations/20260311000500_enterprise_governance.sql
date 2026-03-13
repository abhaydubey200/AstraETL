-- Phase 4: Enterprise Governance & Data Platform Layer

-- 1. Data Lineage System
CREATE TABLE IF NOT EXISTS public.data_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'table', 'view', 'file', 'bucket', 'topic'
    source_type TEXT NOT NULL, -- 'postgres', 'snowflake', 's3', 'kafka'
    owner UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: The existing data_lineage table might exist, we expand or create a new structured one.
CREATE TABLE IF NOT EXISTS public.data_lineage_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_asset_id UUID REFERENCES public.data_assets(id),
    target_asset_id UUID REFERENCES public.data_assets(id),
    pipeline_id UUID REFERENCES public.pipelines(id),
    transformation_type TEXT, -- 'extract', 'transform', 'mask', 'aggregate'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Data Catalog
CREATE TABLE IF NOT EXISTS public.catalog_datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_name TEXT NOT NULL,
    description TEXT,
    owner UUID REFERENCES auth.users(id),
    source_system TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalog_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES public.catalog_datasets(id) ON DELETE CASCADE,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    description TEXT,
    sensitivity_level TEXT DEFAULT 'internal', -- 'public', 'internal', 'sensitive', 'highly_sensitive'
    classification UUID -- Linked to data_classifications
);

-- 3. Data Quality Monitoring
CREATE TABLE IF NOT EXISTS public.data_quality_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES public.catalog_datasets(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL, -- 'null_check', 'row_count', 'duplicate_check', 'range_check', 'regex'
    rule_definition JSONB NOT NULL, -- { "column": "id", "min": 0 }
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'error'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.data_quality_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES public.data_quality_rules(id) ON DELETE CASCADE,
    pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'pass', 'fail', 'warning'
    failed_rows BIGINT DEFAULT 0,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Schema Evolution Engine
CREATE TABLE IF NOT EXISTS public.table_schema_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES public.connections(id),
    table_name TEXT NOT NULL,
    schema_json JSONB NOT NULL,
    version INT DEFAULT 1,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RBAC (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.astra_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.astra_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name TEXT UNIQUE NOT NULL, -- 'create_pipeline', 'delete_connector', etc.
    resource_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.astra_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.astra_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Extend users with a role_id (joining with existing auth if possible, or a profile table)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.astra_roles(id),
    full_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Audit Logging (Improved)
CREATE TABLE IF NOT EXISTS public.audit_logs_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Cost Monitoring
CREATE TABLE IF NOT EXISTS public.cost_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    compute_units DECIMAL(12, 4) DEFAULT 0,
    compute_cost DECIMAL(12, 4) DEFAULT 0,
    storage_cost DECIMAL(12, 4) DEFAULT 0,
    data_transfer_cost DECIMAL(12, 4) DEFAULT 0,
    total_cost DECIMAL(12, 4) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Data Governance & Classification
CREATE TABLE IF NOT EXISTS public.data_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classification_type TEXT NOT NULL, -- 'PII', 'PCI', 'HIPAA', 'GDPR'
    policy_applied TEXT, -- 'masking', 'encryption', 'restricted'
    description TEXT
);

-- 9. General Alerts
CREATE TABLE IF NOT EXISTS public.astra_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type TEXT NOT NULL, -- 'failure', 'quality_breach', 'schema_change', 'cost_spike'
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'resolved', 'muted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Roles
INSERT INTO public.astra_roles (role_name, description) VALUES 
('admin', 'Full system access'),
('data_engineer', 'Pipeline and connector management'),
('analyst', 'Visualizes lineage and catalog, runs reports'),
('viewer', 'Read-only access')
ON CONFLICT DO NOTHING;
