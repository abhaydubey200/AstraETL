import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { apiClient } from "@/lib/api-client";

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/monitoring/notifications/${id}/read`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return apiClient.post("/monitoring/notifications/read-all", {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export interface Notification {
  id: string;
  user_id: string;
  alert_rule_id: string | null;
  pipeline_id: string | null;
  run_id: string | null;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  created_at: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  pipeline_id: string | null;
  rule_type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  created_by: string | null;
  notify_email: string | null;
  created_at: string;
  updated_at: string;
}

const NOTIFICATIONS_KEY = ["notifications"];
const ALERT_RULES_KEY = ["alert_rules"];

export function useNotifications() {
  const { user } = useAuth();

  return useQuery<Notification[]>({
    queryKey: NOTIFICATIONS_KEY,
    enabled: !!user,
    queryFn: async () => {
      return apiClient.get<Notification[]>("/monitoring/notifications");
    },
    refetchInterval: 30000, // Poll every 30s as fallback for realtime
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.read).length ?? 0;
}

export function useAlertRules() {
  return useQuery<AlertRule[]>({
    queryKey: ALERT_RULES_KEY,
    queryFn: async () => {
      return apiClient.get<AlertRule[]>("/monitoring/alert-rules");
    },
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Omit<AlertRule, "id" | "created_at" | "updated_at">) => {
      return apiClient.post<AlertRule>("/monitoring/alert-rules", rule);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERT_RULES_KEY }),
  });
}

export function useToggleAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return apiClient.put(`/monitoring/alert-rules/${id}`, { enabled });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERT_RULES_KEY }),
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/monitoring/alert-rules/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERT_RULES_KEY }),
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; notify_email?: string | null }) => {
      return apiClient.put(`/monitoring/alert-rules/${id}`, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERT_RULES_KEY }),
  });
}

