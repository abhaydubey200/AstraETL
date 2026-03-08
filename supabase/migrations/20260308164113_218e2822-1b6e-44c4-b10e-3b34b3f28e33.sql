-- Alert rules configured by users
CREATE TABLE public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'pipeline_failure',
  config jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read alert_rules" ON public.alert_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert alert_rules" ON public.alert_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update alert_rules" ON public.alert_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete alert_rules" ON public.alert_rules FOR DELETE TO authenticated USING (true);

-- Notifications generated from alert rules
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_rule_id uuid REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_alert_rules_pipeline_id ON public.alert_rules(pipeline_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;