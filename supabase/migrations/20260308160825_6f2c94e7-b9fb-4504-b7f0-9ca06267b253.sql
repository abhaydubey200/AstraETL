-- Create pipelines table
CREATE TABLE public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft', 'error')),
  schedule_type TEXT NOT NULL DEFAULT 'manual' CHECK (schedule_type IN ('manual', 'hourly', 'daily', 'cron')),
  schedule_config JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pipeline_nodes table
CREATE TABLE public.pipeline_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('source', 'transform', 'filter', 'join', 'aggregate', 'validate', 'load')),
  label TEXT NOT NULL DEFAULT '',
  config_json JSONB NOT NULL DEFAULT '{}',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Create pipeline_edges table
CREATE TABLE public.pipeline_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.pipeline_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.pipeline_nodes(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_edges ENABLE ROW LEVEL SECURITY;

-- V1 open policies (tightened when auth is added)
CREATE POLICY "Allow all select on pipelines" ON public.pipelines FOR SELECT USING (true);
CREATE POLICY "Allow all insert on pipelines" ON public.pipelines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on pipelines" ON public.pipelines FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on pipelines" ON public.pipelines FOR DELETE USING (true);

CREATE POLICY "Allow all select on pipeline_nodes" ON public.pipeline_nodes FOR SELECT USING (true);
CREATE POLICY "Allow all insert on pipeline_nodes" ON public.pipeline_nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on pipeline_nodes" ON public.pipeline_nodes FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on pipeline_nodes" ON public.pipeline_nodes FOR DELETE USING (true);

CREATE POLICY "Allow all select on pipeline_edges" ON public.pipeline_edges FOR SELECT USING (true);
CREATE POLICY "Allow all insert on pipeline_edges" ON public.pipeline_edges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on pipeline_edges" ON public.pipeline_edges FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on pipeline_edges" ON public.pipeline_edges FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_pipelines_updated_at
  BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_pipeline_nodes_pipeline_id ON public.pipeline_nodes(pipeline_id);
CREATE INDEX idx_pipeline_edges_pipeline_id ON public.pipeline_edges(pipeline_id);