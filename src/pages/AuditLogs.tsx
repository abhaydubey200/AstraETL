import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, Shield, User, Clock, 
  Filter, Download, ArrowUpRight, 
  ExternalLink, FileText, Zap, 
  Activity, AlertTriangle, CheckCircle2
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";

const MOCK_LOGS = [
  { id: "1", timestamp: "2026-03-11 12:45:10", user: "abhay@astraflow.io", action: "Pipeline Created", resource: "Sales_Data_Lake", status: "success", severity: "info" },
  { id: "2", timestamp: "2026-03-11 12:30:22", user: "system", action: "Auto-Scale Up", resource: "Worker Cluster", status: "success", severity: "low" },
  { id: "3", timestamp: "2026-03-11 11:15:05", user: "admin@astraflow.io", action: "Connector Deleted", resource: "Legacy_MySQL", status: "warning", severity: "high" },
  { id: "4", timestamp: "2026-03-11 10:55:12", user: "dev_user@astraflow.io", action: "SLA Config Updated", resource: "Finance_Agg", status: "success", severity: "medium" },
  { id: "5", timestamp: "2026-03-11 09:12:44", user: "abhay@astraflow.io", action: "Credential Accessed", resource: "Snowflake_Prod", status: "info", severity: "critical" },
];

export default function AuditLogs() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold">Platform Audit System</h1>
          <p className="text-sm text-muted-foreground">Comprehensive trail of all administrative and system-level activities.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted border border-border rounded-lg text-xs font-bold transition-all">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
             <Shield className="w-3.5 h-3.5" />
             Verify Chain
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Actions (24h)" value="1,240" icon={Activity} />
        <StatCard label="Critical Alerts" value="2" icon={AlertTriangle} variant="destructive" />
        <StatCard label="Active Users" value="14" icon={User} />
        <StatCard label="Integrity Status" value="Verified" icon={CheckCircle2} variant="success" />
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold">System Activity Log</CardTitle>
              <CardDescription className="text-xs">Filter through thousands of encrypted audit records.</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search user, action..." 
                className="pl-9 h-9 text-xs bg-background border-border"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Timestamp</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">User</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Action</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Resource</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4">Severity</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LOGS.map((log) => (
                <TableRow key={log.id} className="group border-border/50 hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs font-mono py-4 text-muted-foreground">{log.timestamp}</TableCell>
                  <TableCell className="text-xs font-bold py-4">{log.user}</TableCell>
                  <TableCell className="py-4">
                     <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 border border-border/50">{log.action}</span>
                  </TableCell>
                  <TableCell className="text-xs py-4 text-muted-foreground">{log.resource}</TableCell>
                  <TableCell className="py-4">
                    <SeverityBadge severity={log.severity} />
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-md transition-all">
                       <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, variant = 'default' }: any) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/50 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "p-2 rounded-xl",
          variant === 'destructive' ? "bg-red-500/10 text-red-500" :
          variant === 'success' ? "bg-emerald-500/10 text-emerald-500" :
          "bg-primary/10 text-primary"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <h3 className="text-2xl font-display font-bold mt-1">{value}</h3>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    critical: "bg-red-500/10 text-red-500 border-red-500/20 py-1 font-black",
  };

  return (
    <Badge variant="outline" className={cn("text-[9px] uppercase tracking-tighter border", styles[severity] || styles.info)}>
      {severity}
    </Badge>
  );
}
