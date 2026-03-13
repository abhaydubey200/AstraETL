import React from "react";
import { Activity, Cpu, Database, Layers } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface WorkerStats {
  active_workers: number;
  total_workers: number;
  cpu_usage: number;
  memory_usage: number;
  queue_depth: number;
}

export const WorkerStatusCard = ({ stats, className }: { stats: WorkerStats, className?: string }) => {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Worker Cluster Status
        </h3>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Healthy
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">CPU Load</span>
              </div>
              <span className="text-[10px] font-display font-bold">{stats.cpu_usage}%</span>
            </div>
            <Progress value={stats.cpu_usage} className="h-1" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Memory</span>
              </div>
              <span className="text-[10px] font-display font-bold">{stats.memory_usage}%</span>
            </div>
            <Progress value={stats.memory_usage} className="h-1" />
          </div>
        </div>

        <div className="flex flex-col justify-center border-l border-border pl-4 space-y-3">
          <div className="flex items-center justify-between">
             <span className="text-[10px] text-muted-foreground font-semibold uppercase">Active Nodes</span>
             <span className="text-xs font-display font-bold text-foreground">{stats.active_workers}/{stats.total_workers}</span>
          </div>
          <div className="flex items-center justify-between">
             <span className="text-[10px] text-muted-foreground font-semibold uppercase">Queue Depth</span>
             <span className="text-xs font-display font-bold text-primary">{stats.queue_depth} jobs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
