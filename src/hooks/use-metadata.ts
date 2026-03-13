import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface MetadataTable {
  schema: string;
  table: string;
  columns: Array<{ name: string; type: string }>;
}

export function useConnectionMetadata(connectionId: string | undefined) {
  return useQuery<MetadataTable[]>({
    queryKey: ["metadata", connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      return apiClient.get<MetadataTable[]>(`/metadata/${connectionId}`);
    },
  });
}

export function useSearchMetadata(query: string) {
  return useQuery<any[]>({
    queryKey: ["metadata-search", query],
    enabled: query.length > 2,
    queryFn: async () => {
      return apiClient.get<any[]>(`/metadata/search?q=${encodeURIComponent(query)}`);
    },
  });
}

export function usePipelineNodes() {
  return useQuery({
    queryKey: ["all_pipeline_nodes"],
    queryFn: async () => {
      return apiClient.get<any[]>("/pipelines/nodes");
    },
  });
}

export function useSchemaDrift(pipelineId?: string, datasetId?: string) {
  return useQuery<any[]>({
    queryKey: ["schema_drift", pipelineId, datasetId],
    queryFn: async () => {
      const params: any = {};
      if (pipelineId) params.pipeline_id = pipelineId;
      if (datasetId) params.dataset_id = datasetId;
      return apiClient.get<any[]>("/monitoring/schema-drift", params);
    },
  });
}

export function useSchemaVersions(datasetId: string | undefined) {
  return useQuery<any[]>({
    queryKey: ["schema_versions", datasetId],
    enabled: !!datasetId,
    queryFn: async () => {
      return apiClient.get<any[]>(`/monitoring/datasets/${datasetId}/versions`);
    },
  });
}

export function useResolveDrift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ driftId, resolution }: { driftId: string; resolution: string }) => {
      return apiClient.post(`/monitoring/schema-drift/${driftId}/resolve?resolution=${encodeURIComponent(resolution)}`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schema_drift"] });
    },
  });
}
