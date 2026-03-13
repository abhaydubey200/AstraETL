import React, { useState } from "react";
import { 
  Zap, Server, Activity, ArrowUpRight, 
  ArrowDownRight, Settings, Info, AlertTriangle,
  CheckCircle, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AutoscalingConfig() {
  const [enabled, setEnabled] = useState(true);
  const [minWorkers, setMinWorkers] = useState([2]);
  const [maxWorkers, setMaxWorkers] = useState([20]);
  const [queueThreshold, setQueueThreshold] = useState([50]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Worker Autoscaling</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5 text-primary/70">Dynamic Load Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-xl border border-border">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Status: {enabled ? 'Active' : 'Paused'}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
               <Server className="w-4 h-4 text-primary" />
               Cluster Bounds
            </CardTitle>
            <CardDescription className="text-xs">Define the minimum and maximum worker nodes for this cluster.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
             <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                   <span className="text-muted-foreground uppercase">Minimum Workers</span>
                   <span className="text-primary">{minWorkers[0]} Nodes</span>
                </div>
                <Slider value={minWorkers} onValueChange={setMinWorkers} max={10} step={1} className="py-2" />
             </div>

             <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                   <span className="text-muted-foreground uppercase">Maximum Workers</span>
                   <span className="text-primary">{maxWorkers[0]} Nodes</span>
                </div>
                <Slider value={maxWorkers} onValueChange={setMaxWorkers} min={10} max={100} step={5} className="py-2" />
             </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
               <Activity className="w-4 h-4 text-primary" />
               Scaling Triggers
            </CardTitle>
            <CardDescription className="text-xs">Configure the workload thresholds that trigger a scale operation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
             <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold">
                   <span className="text-muted-foreground uppercase">Queue Backlog Threshold</span>
                   <span className="text-primary">{queueThreshold[0]} Tasks</span>
                </div>
                <Slider value={queueThreshold} onValueChange={setQueueThreshold} max={500} step={10} className="py-2" />
             </div>
             
             <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                   <Info className="w-3 h-3" /> Rule Preview
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                   If tasks in queue exceed <strong>{queueThreshold[0]}</strong>, scale cluster by <strong>2x</strong> until <strong>{maxWorkers[0]}</strong> nodes are reached.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" className="text-xs h-9">Reset Defaults</Button>
        <Button className="text-xs h-9 bg-primary shadow-lg shadow-primary/20">Apply Configuration</Button>
      </div>
    </div>
  );
}
