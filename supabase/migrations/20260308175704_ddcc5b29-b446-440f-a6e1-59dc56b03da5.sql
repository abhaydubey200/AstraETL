-- Add email recipient column to alert_rules
ALTER TABLE public.alert_rules ADD COLUMN IF NOT EXISTS notify_email text DEFAULT null;

-- Create a function to invoke the send-alert-email edge function via pg_net
CREATE OR REPLACE FUNCTION public.send_alert_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_pipeline_name text;
  v_rule record;
  v_title text;
  v_message text;
  v_severity text;
  v_request_id bigint;
  v_supabase_url text;
  v_service_key text;
BEGIN
  IF NEW.status NOT IN ('success', 'failed') THEN
    RETURN NEW;
  END IF;

  IF OLD IS NOT NULL AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_supabase_url := current_setting('supabase.url', true);
  v_service_key := current_setting('supabase.service_role_key', true);

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_pipeline_name FROM public.pipelines WHERE id = NEW.pipeline_id;

  FOR v_rule IN
    SELECT * FROM public.alert_rules
    WHERE enabled = true
      AND notify_email IS NOT NULL
      AND notify_email != ''
      AND (pipeline_id IS NULL OR pipeline_id = NEW.pipeline_id)
      AND (
        (rule_type = 'pipeline_failure' AND NEW.status = 'failed')
        OR (rule_type = 'pipeline_success' AND NEW.status = 'success')
        OR (rule_type = 'any_completion')
      )
  LOOP
    IF NEW.status = 'failed' THEN
      v_title := 'Pipeline Failed: ' || COALESCE(v_pipeline_name, 'Unknown');
      v_message := COALESCE(NEW.error_message, 'Pipeline run failed without error details.');
      v_severity := 'error';
    ELSE
      v_title := 'Pipeline Completed: ' || COALESCE(v_pipeline_name, 'Unknown');
      v_message := 'Processed ' || NEW.rows_processed || ' rows successfully.';
      v_severity := 'success';
    END IF;

    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/send-alert-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'to', v_rule.notify_email,
        'title', v_title,
        'message', v_message,
        'severity', v_severity,
        'pipeline_name', COALESCE(v_pipeline_name, 'Unknown'),
        'pipeline_id', NEW.pipeline_id,
        'run_id', NEW.id,
        'rows_processed', NEW.rows_processed,
        'status', NEW.status
      )
    ) INTO v_request_id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on pipeline_runs for email alerts
DROP TRIGGER IF EXISTS trg_send_alert_email ON public.pipeline_runs;
CREATE TRIGGER trg_send_alert_email
  AFTER UPDATE ON public.pipeline_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.send_alert_email();