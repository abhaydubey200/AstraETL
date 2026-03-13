import React from "react";
import { Database, RefreshCw, Layers, Table } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchemaDiscovery } from "@/hooks/use-connections";
import { useToast } from "@/hooks/use-toast";

interface SchemaCachePanelProps {
  connectionId: string;
  tableCount: number;
  lastRefreshed: string | null | undefined;
}

export const SchemaCachePanel: React.FC<SchemaCachePanelProps> = ({ connectionId, tableCount, lastRefreshed }) => {
  const { mutate: refreshSchema, isPending } = useSchemaDiscovery();
  const { toast } = useToast();

  const handleRefresh = () => {
    refreshSchema(
      { connection_id: connectionId, force_refresh: true },
      {
        onSuccess: () => {
          toast({
            title: "Metadata Refreshed",
            description: "Connection schema cache has been updated successfully.",
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Refresh Failed",
            description: err.message,
          });
        },
      }
    );
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Schema Snapshot
        </CardTitle>
        <CardDescription>Managing cached metadata for this connection.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Table className="h-3 w-3" /> Tables Cached
            </span>
            <span className="text-xl font-bold">{tableCount}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Last Refresh
            </span>
            <span className="text-sm font-medium">
              {lastRefreshed ? new Date(lastRefreshed).toLocaleString() : "Never"}
            </span>
          </div>
        </div>
        <Button 
          variant="default" 
          size="sm" 
          className="w-full gap-2" 
          onClick={handleRefresh}
          disabled={isPending}
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? "Refreshing..." : "Refresh Metadata"}
        </Button>
      </CardContent>
    </Card>
  );
};
