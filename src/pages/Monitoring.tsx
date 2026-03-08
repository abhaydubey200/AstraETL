import { useNavigate } from "react-router-dom";
import MetricCard from "@/components/MetricCard";
import { Activity, CheckCircle, XCircle, Clock, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { usePipelineRuns } from "@/hooks/use-executions";
import { useMemo } from "react";

const customTooltipStyle = {
  backgroundColor: "hsl(222, 44%, 8%)",
  border: "1px solid hsl(222, 30%, 16%)",
  borderRadius: "6px",
  fontSize: "11px",
  color: "hsl(210, 40%, 92%)",
  fontFamily: "var(--font-display)",
};

const severityConfig = {
  critical: { icon: XCircle, color: "text-destructive", border: "border-destructive/20", bg: "bg-destructive/5", badge: "bg-destructive/10 text-destructive border-destructive/20" },
  warning: { icon: AlertTriangle, color: "text-warning", border: "border-warning/20", bg: "bg-warning/5", badge: "bg-warning/10 text-warning border-warning/20" },
  info: { icon: CheckCircle, color: "text-success", border: "border-border", bg: "bg-muted/20", badge: "bg-muted text-muted-foreground border-border" },
};

const Monitoring = () => {
  const navigate = useNavigate();
  const { data: allRuns = [], isLoading } = usePipelineRuns();

  // Compute metrics from real data
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return allRuns.filter((r) => new Date(r.start_time).getTime() > cutoff);
  }, [allRuns]);

  const totalRuns = last24h.length;
  const successRuns = last24h.filter((r) => r.status === "success").length;
  const failedRuns = last24h.filter((r) => r.status === "failed").length;
  const runningRuns = last24h.filter((r) => r.status === "running").length;
  const pendingRuns = last24h.filter((r) => r.status === "pending").length;
  const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) + "%" : "—";
  const totalRows = last24h.reduce((sum, r) => sum + r.rows_processed, 0);

  const avgDuration = useMemo(() => {
    const completed = last24h.filter((r) => r.end_time);
    if (completed.length === 0) return "—";
    const avgMs = completed.reduce((sum, r) => sum + (new Date(r.end_time!).getTime() - new Date(r.start_time).getTime()), 0) / completed.length;
    return `${(avgMs / 60000).toFixed(1)}m`;
  }, [last24h]);

  // Build chart data from runs
  const throughputData = useMemo(() => {
    const buckets: Record<string, number> = {};
    last24h.forEach((r) => {
      const hour = new Date(r.start_time).getHours();
      const key = `${hour.toString().padStart(2, "0")}:00`;
      buckets[key] = (buckets[key] || 0) + r.rows_processed;
    });
    return Array.from({ length: 24 }, (_, i) => {
      const key = `${i.toString().padStart(2, "0")}:00`;
      return { time: key, rows: buckets[key] || 0 };
    });
  }, [last24h]);

  const executionTrend = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<string, { total: number; count: number }> = {};
    allRuns.forEach((r) => {
      if (!r.end_time) return;
      const day = days[new Date(r.start_time).getDay()];
      if (!buckets[day]) buckets[day] = { total: 0, count: 0 };
      buckets[day].total += (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 60000;
      buckets[day].count++;
    });
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      avgTime: buckets[day] ? +(buckets[day].total / buckets[day].count).toFixed(1) : 0,
    }));
  }, [allRuns]);

  const statusDistribution = [
    { name: "Success", value: successRuns, color: "hsl(152, 69%, 45%)" },
    { name: "Failed", value: failedRuns, color: "hsl(0, 72%, 51%)" },
    { name: "Running", value: runningRuns, color: "hsl(187, 85%, 53%)" },
    { name: "Pending", value: pendingRuns, color: "hsl(38, 92%, 50%)" },
  ].filter((s) => s.value > 0);

  // Build alerts from recent failed runs
  const alerts = useMemo(() => {
    return allRuns
      .filter((r) => r.status === "failed" && r.error_message)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        severity: "critical" as const,
        message: r.error_message!,
        time: new Date(r.start_time).toLocaleString(),
      }));
  }, [allRuns]);

  const formatRows = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M rows`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K rows`;
    return `${n} rows`;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Monitoring</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time pipeline health and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Runs (24h)" value={totalRuns} icon={Activity} variant="primary" />
        <MetricCard title="Success Rate" value={successRate} icon={CheckCircle} variant="success" />
        <MetricCard title="Avg Execution Time" value={avgDuration} icon={Clock} variant="default" />
        <MetricCard title="Data Processed" value={formatRows(totalRows)} icon={Zap} variant="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Data Throughput (Rows)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={throughputData}>
              <defs>
                <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [formatRows(value), "Throughput"]} />
              <Area type="monotone" dataKey="rows" stroke="hsl(187, 85%, 53%)" fill="url(#throughputGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Avg Execution Time (min)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={executionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="avgTime" fill="hsl(187, 85%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {statusDistribution.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-display font-semibold text-foreground mb-4">Run Status (24h)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(value) => <span style={{ color: "hsl(215, 20%, 55%)", fontSize: "11px" }}>{value}</span>} iconSize={8} />
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className={cn("rounded-lg border border-border bg-card p-5", statusDistribution.length > 0 ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-semibold text-foreground">Recent Alerts</h3>
            <button onClick={() => navigate("/logs")} className="text-xs text-primary hover:underline">View All →</button>
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-md border border-border bg-muted/10">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">No alerts — all pipelines running smoothly</span>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const cfg = severityConfig[alert.severity];
                const Icon = cfg.icon;
                return (
                  <div key={alert.id} className={cn("flex items-start gap-3 p-3 rounded-md border", cfg.border, cfg.bg)}>
                    <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{alert.time}</p>
                    </div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize", cfg.badge)}>
                      {alert.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
