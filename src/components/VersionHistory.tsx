import { usePipelineVersions } from "@/hooks/use-pipelines";
import { format } from "date-fns";
import { History, GitBranch, ChevronRight, RotateCcw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VersionHistoryProps {
  pipelineId: string;
}

export default function VersionHistory({ pipelineId }: VersionHistoryProps) {
  const { data: versions = [], isLoading } = usePipelineVersions(pipelineId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center text-center">
        <History className="w-10 h-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-display font-semibold text-foreground">No versions yet</h3>
        <p className="text-xs text-muted-foreground mt-1">Versions are created automatically when you save changes in the builder.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Version Control History
        </h3>
        <Badge variant="outline" className="text-[10px] font-bold">
          {versions.length} {versions.length === 1 ? 'Version' : 'Versions'}
        </Badge>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {versions.map((version: any, i: number) => (
            <div key={version.id} className="p-4 hover:bg-muted/30 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    i === 0 ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
                  )}>
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">v{version.version_number}</span>
                      {i === 0 && <Badge className="text-[9px] h-4 px-1.5 bg-success/20 text-success border-none">Current</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 italic">"{version.comment || 'No comment'}"</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(version.created_at), "PPp")}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                    onClick={() => console.log('Rollback to', version.id)}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
        <p className="text-[10px] text-primary leading-relaxed font-medium">
          AstraFlow automatically snapshots your DAG configuration on every save. Restoring an older version will update the current canvas while maintaining a trace of the rollback in audit logs.
        </p>
      </div>
    </div>
  );
}
