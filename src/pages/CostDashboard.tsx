import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { 
  DollarSign, TrendingUp, CreditCard, BarChart3, PieChart, 
  Activity, Calendar, ArrowUpRight, ArrowDownRight,
  Database, Zap, Share2, Filter, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from "recharts";

export default function CostDashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["cost-summary"],
    queryFn: () => apiClient.get<any>("/cost/summary"),
    initialData: { 
      total_spend: 1240.50, 
      total_runs: 1540, 
      compute_cost: 930.37, 
      transfer_cost: 248.10, 
      storage_cost: 62.03,
      currency: "USD" 
    }
  });

  const { data: expensivePipelines = [] } = useQuery({
    queryKey: ["expensive-pipelines"],
    queryFn: () => apiClient.get<any[]>("/cost/expensive-pipelines")
  });

  const totalCost = summary.total_spend;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold">Financial Governance</h1>
          <p className="text-sm text-muted-foreground">Monitor warehouse compute credits and data transfer expenses.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted border border-border rounded-lg text-xs font-bold transition-all">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CostStatCard label="Total Spend (MTD)" value={`$${totalCost.toLocaleString()}`} trend="+12.5%" trendType="up" icon={DollarSign} />
        <CostStatCard label="Compute Credits" value={`${(summary.compute_cost/0.1).toFixed(0)}`} icon={Zap} trend="+8.2%" trendType="up" />
        <CostStatCard label="Data Transfer" value={`${(summary.transfer_cost/0.05).toFixed(1)} GB`} icon={Share2} trend="-3.2%" trendType="down" />
        <CostStatCard label="Avg. Pipeline Cost" value={`$${(totalCost / summary.total_runs).toFixed(2)}`} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-primary" />
               Spend Distribution by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <VerticalProgress label="Compute" value={summary.compute_cost} total={totalCost} color="bg-primary" />
                <VerticalProgress label="Transfer" value={summary.transfer_cost} total={totalCost} color="bg-blue-500" />
                <VerticalProgress label="Storage" value={summary.storage_cost} total={totalCost} color="bg-amber-500" />
             </div>
             
             <ResponsiveContainer width="100%" height={180}>
                <BarChart data={expensivePipelines.length > 0 ? expensivePipelines : [
                  { name: "Orders_Extract", total_spend: 450 },
                  { name: "Finance_Agg", total_spend: 320 },
                  { name: "User_Sync", total_spend: 210 },
                  { name: "Logs_Backup", total_spend: 95 },
                ]}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                   <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                   <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                   <Tooltip />
                   <Bar dataKey="total_spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40}>
                      {expensivePipelines.map((_, index) => (
                        <Cell key={`cell-${index}`} fillOpacity={1 - index * 0.15} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
           <CardHeader>
             <CardTitle className="text-sm font-bold">Top Cost Contributors</CardTitle>
             <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary/70">Highest daily spend</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6 pt-2">
              {(expensivePipelines.length > 0 ? expensivePipelines : [
                { name: "Sales_Data_Lake_Sync", total_spend: 580.20, run_count: 142 },
                { name: "Legacy_Customer_Import", total_spend: 420.50, run_count: 89 },
                { name: "Realtime_Sensor_Stream", total_spend: 280.12, run_count: 1540 },
                { name: "Daily_GL_Export", total_spend: 190.00, run_count: 1 },
              ]).map((ds: any) => (
                <ConsumerItem key={ds.name} name={ds.name} cost={`$${ds.total_spend.toFixed(2)}`} percent={(ds.total_spend / totalCost) * 100} runs={ds.run_count} />
              ))}
              
              <div className="pt-6 border-t border-border/50">
                 <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Budget Optimization Alert</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                       <strong>Legacy_Customer_Import</strong> is consuming 34% more compute than expected. Recommendation: Enable partitioned extraction.
                    </p>
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CostStatCard({ label, value, trend, trendType, icon: Icon }: any) {
  return (
    <div className="relative overflow-hidden p-6 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all group">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-primary group-hover:scale-110 transition-transform">
        <Icon size={80} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md",
            trendType === 'up' ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
          )}>
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <h3 className="text-3xl font-display font-bold mt-1">{value}</h3>
      </div>
    </div>
  );
}

function VerticalProgress({ label, value, total, color }: any) {
  const percent = Math.round((value / total) * 100);
  return (
    <div className="space-y-3">
       <div className="flex items-end justify-between">
          <div className="space-y-0.5">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
             <p className="text-lg font-bold">${value.toFixed(2)}</p>
          </div>
          <span className="text-xs font-black text-muted-foreground/50">{percent}%</span>
       </div>
       <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percent}%` }} />
       </div>
    </div>
  );
}

function ConsumerItem({ name, cost, percent, runs }: any) {
  return (
    <div className="group cursor-pointer">
       <div className="flex justify-between items-start mb-1.5">
          <div className="space-y-0.5 min-w-0">
             <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{name}</p>
             <p className="text-[9px] text-muted-foreground uppercase font-medium">{runs} Executions</p>
          </div>
          <p className="text-xs font-black">{cost}</p>
       </div>
       <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent * 2.5}%` }} />
       </div>
    </div>
  );
}
