import React from "react";
import { Activity, Zap, AlertTriangle, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionPerformance } from "@/types/connection";

interface PerformanceTabProps {
  performance?: ConnectionPerformance;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ performance }) => {
  if (!performance) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>Performance metrics not available. Run a health check to aggregate data.</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: "Avg Latency", value: `${performance.avg_latency_ms}ms`, icon: Timer, color: "text-blue-500" },
    { label: "Avg Query Time", value: `${performance.avg_query_time_ms}ms`, icon: Zap, color: "text-yellow-500" },
    { label: "Req per Min", value: performance.requests_per_minute, icon: Activity, color: "text-green-500" },
    { label: "Error Rate", value: `${performance.error_rate}%`, icon: AlertTriangle, color: performance.error_rate > 5 ? "text-red-500" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic Analysis</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground italic">Chart: Historical latency and throughput visualization would be rendered here.</p>
        </CardContent>
      </Card>
    </div>
  );
};
