import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

import type { PipelineRun, ExecutionLog, RunStatus, LogLevel } from "@/types/execution";

const RUNS_KEY = ["pipeline_runs"];


export interface RunFilters {
  pipelineId?: string;
  status?: RunStatus;
  from?: string;
  to?: string;
}

export function usePipelineRuns(filters?: RunFilters) {
  return useQuery<PipelineRun[]>({
    queryKey: [RUNS_KEY, filters],
    queryFn: async () => {
      const queryFilters: Record<string, any> = {};
      if (filters?.pipelineId) queryFilters.pipeline_id = filters.pipelineId;
      if (filters?.status) queryFilters.status = filters.status;
      if (filters?.from) queryFilters.from = filters.from;
      if (filters?.to) queryFilters.to = filters.to;

      return apiClient.get<PipelineRun[]>("/pipelines/runs", queryFilters);
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.some((r) => r.status === "running")) return 3000;
      return false;
    },
  });
}

export function usePipelineRun(runId: string | undefined) {
  return useQuery<PipelineRun>({
    queryKey: ["pipeline_runs", runId],
    enabled: !!runId,
    queryFn: async () => {
      return apiClient.get<PipelineRun>(`/pipelines/runs/${runId}`);
    },
  });
}


export function useWorkerJobs(runId?: string) {
  return useQuery({
    queryKey: ["worker_jobs", runId],
    enabled: !!runId,
    queryFn: async () => {
      return apiClient.get<any[]>(`/pipelines/runs/${runId}/worker-jobs`);
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.some((r: any) => r.status === "pending" || r.status === "processing")) return 2000;
      return false;
    },
  });
}

export function useRunTasks(runId?: string) {
  return useQuery({
    queryKey: ["run_tasks", runId],
    enabled: !!runId,
    queryFn: async () => {
      return apiClient.get<any[]>(`/pipelines/runs/${runId}/tasks`);
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.some((t: any) => t.status === "pending" || t.status === "running")) return 2000;
      return false;
    },
  });
}

export interface LogFilters {
  runId?: string;
  stage?: string;
  logLevel?: LogLevel;
  search?: string;
}

export function useExecutionLogs(filters: LogFilters) {
  return useQuery<ExecutionLog[]>({
    queryKey: ["execution_logs", filters],
    enabled: !!filters.runId,
    queryFn: async () => {
      const queryFilters: Record<string, any> = {};
      if (filters.stage) queryFilters.stage = filters.stage;
      if (filters.logLevel) queryFilters.log_level = filters.logLevel;
      if (filters.search) queryFilters.search = filters.search;

      return apiClient.get<ExecutionLog[]>(`/pipelines/runs/${filters.runId}/logs`, queryFilters);
    },
    refetchInterval: 3000
  });
}



export function useTriggerRun() {

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pipelineId }: { pipelineId: string; userId?: string }) => {
      // In the new backend, we trigger via the pipeline run endpoint
      // We might need to pass source/destination if they are not stored, but for now 
      // let's assume the backend retrieves them by DB lookup.
      return apiClient.post<{ run_id: string; status: string; rows_processed: number }>(`/pipelines/${pipelineId}/run`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RUNS_KEY });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });
}


export function useSystemMetrics(metricName?: string) {
  return useQuery({
    queryKey: ["system_metrics", metricName],
    queryFn: async () => {
      const queryFilters: Record<string, any> = {};
      if (metricName) queryFilters.metric_name = metricName;
      return apiClient.get<any[]>("/monitoring/metrics", queryFilters);
    },
    refetchInterval: 5000
  });
}

export function useWorkerStatus() {
  return useQuery<any[]>({
    queryKey: ["worker_status"],
    queryFn: async () => {
      return apiClient.get<any[]>("/monitoring/worker-status");
    },
    refetchInterval: 5000,
  });
}

export function useQueueMetrics() {
  return useQuery<{ pending: number, processing: number, failed: number, completed: number }>({
    queryKey: ["queue_metrics"],
    queryFn: async () => {
      return apiClient.get<any>("/monitoring/queue-metrics");
    },
    refetchInterval: 5000,
  });
}

