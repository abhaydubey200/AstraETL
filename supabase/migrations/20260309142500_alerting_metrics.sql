-- migration: 20260309142500_alerting_metrics.sql
-- Phase 14: Alerting System & System Metrics

-- 1. Pipeline Alert Configurations
CREATE TABLE IF NOT EXISTS public.pipeline_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    alert_name TEXT NOT NULL,
    trigger_on TEXT[] NOT NULL DEFAULT '{"failure"}',  -- failure, success, long_runtime, drift_detected
    channel TEXT NOT NULL DEFAULT 'webhook',            -- webhook, email, slack
    webhook_url TEXT,
    email_address TEXT,
    slack_webhook TEXT,
    threshold_minutes INT DEFAULT 30,                   -- trigger if runtime > this
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_pipeline ON public.pipeline_alerts(pipeline_id);

-- 2. Alert Delivery Log - records every alert fired
CREATE TABLE IF NOT EXISTS public.alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES public.pipeline_alerts(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
    trigger_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
    error_message TEXT,
    fired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_events_pipeline ON public.alert_events(pipeline_id, fired_at DESC);

-- 3. System Metrics Snapshots
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,      -- pipeline_throughput, rows_per_second, worker_utilization, queue_depth
    metric_value NUMERIC NOT NULL,
    dimensions JSONB DEFAULT '{}',  -- { pipeline_id, stage, worker_id }
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at DESC);

-- 4. RLS
ALTER TABLE public.pipeline_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all" ON public.pipeline_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all" ON public.alert_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all" ON public.system_metrics FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_events;
