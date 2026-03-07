import MetricCard from "@/components/MetricCard";
import { Activity, CheckCircle, XCircle, Clock, Zap, Server } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const throughputData = [
  { time: "00:00", rows: 120000 },
  { time: "02:00", rows: 2100000 },
  { time: "04:00", rows: 450000 },
  { time: "06:00", rows: 890000 },
  { time: "08:00", rows: 1500000 },
  { time: "10:00", rows: 3200000 },
  { time: "12:00", rows: 4100000 },
  { time: "14:00", rows: 2800000 },
];

const executionTrend = [
  { day: "Mon", avgTime: 5.2, pipelines: 18 },
  { day: "Tue", avgTime: 4.8, pipelines: 22 },
  { day: "Wed", avgTime: 6.1, pipelines: 20 },
  { day: "Thu", avgTime: 4.5, pipelines: 24 },
  { day: "Fri", avgTime: 5.0, pipelines: 19 },
  { day: "Sat", avgTime: 3.2, pipelines: 8 },
  { day: "Sun", avgTime: 2.8, pipelines: 6 },
];

const statusDistribution = [
  { name: "Success", value: 156, color: "hsl(152, 69%, 45%)" },
  { name: "Failed", value: 4, color: "hsl(0, 72%, 51%)" },
  { name: "Running", value: 3, color: "hsl(187, 85%, 53%)" },
  { name: "Pending", value: 2, color: "hsl(38, 92%, 50%)" },
];

const alerts = [
  { id: 1, severity: "critical", message: "Product Catalog Sync failed: Schema mismatch", time: "22 min ago" },
  { id: 2, severity: "warning", message: "Marketing API connection timeout (retry 2/3)", time: "3 hrs ago" },
  { id: 3, severity: "info", message: "Financial Reports ETL completed successfully", time: "12 hrs ago" },
];

const customTooltipStyle = {
  backgroundColor: "hsl(222, 44%, 8%)",
  border: "1px solid hsl(222, 30%, 16%)",
  borderRadius: "6px",
  fontSize: "11px",
  color: "hsl(210, 40%, 92%)",
  fontFamily: "var(--font-display)",
};

const Monitoring = () => {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Monitoring</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time pipeline health and performance metrics</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Runs (24h)" value={165} icon={Activity} variant="primary" trend={{ value: "18% vs yesterday", positive: true }} />
        <MetricCard title="Success Rate" value="97.6%" icon={CheckCircle} variant="success" />
        <MetricCard title="Avg Execution Time" value="5.2m" icon={Clock} variant="default" trend={{ value: "12% faster", positive: true }} />
        <MetricCard title="Data Processed" value="48.3M rows" icon={Zap} variant="primary" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Throughput Chart */}
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
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M rows`, "Throughput"]} />
              <Area type="monotone" dataKey="rows" stroke="hsl(187, 85%, 53%)" fill="url(#throughputGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Execution Time Trend */}
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
        {/* Status Distribution */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Run Status (24h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                {statusDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => <span style={{ color: "hsl(215, 20%, 55%)", fontSize: "11px" }}>{value}</span>}
                iconSize={8}
              />
              <Tooltip contentStyle={customTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-md border ${
                  alert.severity === "critical" ? "border-destructive/20 bg-destructive/5" : alert.severity === "warning" ? "border-warning/20 bg-warning/5" : "border-border bg-muted/20"
                }`}
              >
                {alert.severity === "critical" ? (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                ) : alert.severity === "warning" ? (
                  <Clock className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
