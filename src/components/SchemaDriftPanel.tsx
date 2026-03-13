import { useState } from "react";
import { useSchemaDrift, useResolveDrift } from "@/hooks/use-metadata";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle, CheckCircle, Shield, RefreshCw,
  Plus, Minus, ArrowRightLeft, Loader2, GitCompare,
} from "lucide-react";

const DRIFT_TYPE_META: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
  column_added:     { label: "Column Added",    icon: Plus,           color: "text-emerald-400 bg-emerald-400/10" },
  column_removed:   { label: "Column Removed",  icon: Minus,          color: "text-red-400 bg-red-400/10" },
  type_changed:     { label: "Type Changed",    icon: ArrowRightLeft,  color: "text-amber-400 bg-amber-400/10" },
  nullable_changed: { label: "Nullable Changed", icon: ArrowRightLeft, color: "text-blue-400 bg-blue-400/10" },
  renamed:          { label: "Renamed",          icon: GitCompare,     color: "text-purple-400 bg-purple-400/10" },
};

const RESOLUTION_OPTIONS = [
  { value: "auto_mapped",  label: "Auto Map" },
  { value: "deprecated",   label: "Deprecate" },
  { value: "ignored",      label: "Ignore" },
];

export default function SchemaDriftPanel({ pipelineId }: { pipelineId?: string }) {
  const { data: driftEvents = [], isLoading } = useSchemaDrift(pipelineId);
  const resolveDrift = useResolveDrift();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");

  const filtered = driftEvents.filter((e: any) => {
    if (filter === "unresolved") return e.resolution === "unresolved";
    if (filter === "resolved")   return e.resolution !== "unresolved";
    return true;
  });

  const handleResolve = (driftId: string, resolution: string) => {
    resolveDrift.mutate({ driftId, resolution }, {
      onSuccess: () => toast({ title: "Drift resolved", description: `Marked as: ${resolution.replace("_", " ")}` }),
      onError: (e: any)  => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Schema Drift Events</h3>
          {driftEvents.filter((e: any) => e.resolution === "unresolved").length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-400">
              {driftEvents.filter((e: any) => e.resolution === "unresolved").length} unresolved
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(["all", "unresolved", "resolved"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              "px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Drift Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">No {filter !== "all" ? filter : ""} drift events</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            {filter === "unresolved"
              ? "All schema changes have been reviewed. Your pipelines are clean."
              : "Run pipelines against live sources to begin automatic drift detection."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Column</th>
                <th className="text-left px-5 py-3">Dataset</th>
                <th className="text-left px-5 py-3">Change</th>
                <th className="text-left px-5 py-3">Detected</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((event: any) => {
                const meta = DRIFT_TYPE_META[event.drift_type] || DRIFT_TYPE_META.type_changed;
                const Icon = meta.icon;
                const isResolved = event.resolution !== "unresolved";
                return (
                  <tr key={event.id} className={cn("hover:bg-muted/10 transition-colors", isResolved && "opacity-60")}>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold", meta.color)}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[11px] font-mono text-foreground font-semibold">
                      {event.column_name}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-muted-foreground">
                      {event.datasets?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-muted-foreground">
                      {event.previous_type && event.new_type ? (
                        <span className="flex items-center gap-1">
                          <code className="rounded bg-muted px-1">{event.previous_type}</code>
                          <ArrowRightLeft className="w-3 h-3" />
                          <code className="rounded bg-primary/10 text-primary px-1">{event.new_type}</code>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.detected_at), "MMM d, HH:mm")}
                    </td>
                    <td className="px-5 py-3">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          {event.resolution.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400">Unresolved</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {!isResolved && (
                        <div className="flex items-center gap-1">
                          {RESOLUTION_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handleResolve(event.id, opt.value)}
                              disabled={resolveDrift.isPending}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
