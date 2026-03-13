import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { 
  Shield, Lock, History, User, Activity, 
  AlertTriangle, FileText, CheckCircle2, 
  Users, Key, Fingerprint, Globe, Plus, Edit3, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineageGraph } from "@/components/LineageGraph";

const ROLES = [
  { name: "Principal Admin", users: 2, permissions: "Full Access", color: "text-red-500", bg: "bg-red-500/10" },
  { name: "Data Engineer", users: 5, permissions: "Write Pipelines, Read Data", color: "text-blue-500", bg: "bg-blue-500/10" },
  { name: "Data Analyst", users: 8, permissions: "Read Catalog, Run Queries", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { name: "Auditor", users: 1, permissions: "Read Audit Logs", color: "text-purple-500", bg: "bg-purple-500/10" },
];

const TEAM_MEMBERS = [
  { name: "Abhay Dubey", email: "abhay@astraflow.io", role: "Principal Admin", status: "Active" },
  { name: "Sarah Chen", email: "sarah@astraflow.io", role: "Data Engineer", status: "Active" },
  { name: "Michael Ross", email: "mross@astraflow.io", role: "Data Analyst", status: "Away" },
];

export default function Governance() {
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiClient.get<any[]>("/monitoring/audit-logs"),
    initialData: [
      { id: "1", action: "CREDENTIAL_ACCESS", user_email: "abhay@astraflow.io", resource_type: "CONNECTION", timestamp: new Date().toISOString() },
      { id: "2", action: "PIPELINE_DELETE", user_email: "system", resource_type: "PIPELINE", timestamp: new Date().toISOString() },
    ]
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold">Enterprise Governance</h1>
          <p className="text-sm text-muted-foreground">Manage RBAC, compliance policies, and data asset lineage.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted border border-border rounded-lg text-xs font-bold transition-all">
              <DownloadIcon className="w-3.5 h-3.5" />
              Compliance Export
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-lg shadow-primary/20">
              <Plus className="w-3.5 h-3.5" />
              New Policy
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Security Score" value="98%" sub="A+ Platform Health" icon={Shield} color="text-emerald-500" />
        <StatCard label="Active Roles" value="4" sub="Defined RBAC Groups" icon={Fingerprint} color="text-blue-500" />
        <StatCard label="Data Masking" value="Active" sub="PII Classification On" icon={Lock} color="text-amber-500" />
        <StatCard label="Audit Retention" value="365d" sub="Compliant Storage" icon={History} color="text-purple-500" />
      </div>

      <Tabs defaultValue="access" className="space-y-6">
        <TabsList className="bg-muted/30 p-1 border border-border/50">
          <TabsTrigger value="access" className="text-xs font-bold uppercase">Access Control (RBAC)</TabsTrigger>
          <TabsTrigger value="lineage" className="text-xs font-bold uppercase">Asset Lineage</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs font-bold uppercase">Policies & Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="space-y-8 outline-none animate-in slide-in-from-left-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-6">
                <Card className="border-border/50 shadow-sm">
                   <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                         <CardTitle className="text-sm font-bold">Team Members</CardTitle>
                         <CardDescription className="text-xs">Manage workspace access and role assignments.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase">Add Member</Button>
                   </CardHeader>
                   <CardContent className="p-0 border-t border-border/50">
                      <table className="w-full text-left">
                         <thead>
                            <tr className="bg-muted/5 border-b border-border/50">
                               <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground">User</th>
                               <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground">Role</th>
                               <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground">Status</th>
                               <th className="px-6 py-3 text-[10px] font-black uppercase text-muted-foreground text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-border/50 text-xs">
                            {TEAM_MEMBERS.map(m => (
                               <tr key={m.email} className="hover:bg-muted/10 transition-colors">
                                  <td className="px-6 py-4">
                                     <div className="font-bold">{m.name}</div>
                                     <div className="text-[10px] text-muted-foreground">{m.email}</div>
                                  </td>
                                  <td className="px-6 py-4 font-medium px-2 py-0.5 rounded bg-muted w-fit">{m.role}</td>
                                  <td className="px-6 py-4">
                                     <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none text-[9px]">{m.status}</Badge>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end gap-2">
                                        <button className="p-1.5 hover:bg-muted rounded transition-colors"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                                        <button className="p-1.5 hover:bg-red-500/10 rounded transition-colors group"><Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-red-500" /></button>
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </CardContent>
                </Card>
             </div>

             <div className="space-y-6">
                <Card className="border-border/50 shadow-sm bg-muted/10">
                   <CardHeader>
                      <CardTitle className="text-sm font-bold">Role Definitions</CardTitle>
                      <CardDescription className="text-xs">System-defined security scopes.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      {ROLES.map(role => (
                         <div key={role.name} className="p-3 rounded-xl border border-border/50 bg-background hover:border-primary/50 transition-all">
                            <div className="flex items-center justify-between mb-2">
                               <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded", role.bg, role.color)}>{role.name}</span>
                               <span className="text-[10px] font-bold text-muted-foreground">{role.users} Users</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium">{role.permissions}</p>
                         </div>
                      ))}
                   </CardContent>
                </Card>
             </div>
          </div>
        </TabsContent>

        <TabsContent value="lineage" className="space-y-4 outline-none">
           <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-sm font-bold">Global Data Lineage</h3>
                    <p className="text-xs text-muted-foreground">End-to-end asset dependency map for all tenants.</p>
                 </div>
                 <Badge variant="outline">Enterprise View</Badge>
              </div>
              <div className="h-[500px] bg-muted/10 rounded-xl relative overflow-hidden border border-border/50">
                 <LineageGraph pipelineName="Global Enterprise Graph" sourceTable="All Sources" targetTable="Multi-Tenant Warehouse" />
              </div>
           </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-8 outline-none">
           <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-muted/5 border-b border-border/50">
                 <div className="flex items-center justify-between">
                    <div>
                       <CardTitle className="text-sm font-bold tracking-tight">System Audit Log</CardTitle>
                       <CardDescription className="text-xs">Record of every administrative action in the workspace.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary">View Full Trail</Button>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <table className="w-full text-left text-xs">
                    <thead>
                       <tr className="border-b border-border/50 bg-muted/10">
                          <th className="px-6 py-4 font-black uppercase text-muted-foreground">Action</th>
                          <th className="px-6 py-4 font-black uppercase text-muted-foreground">User</th>
                          <th className="px-6 py-4 font-black uppercase text-muted-foreground">Resource</th>
                          <th className="px-6 py-4 font-black uppercase text-muted-foreground">Time</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                       {auditLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                             <td className="px-6 py-4 font-bold text-foreground">{log.action}</td>
                             <td className="px-6 py-4 text-muted-foreground">{log.user_email || "System"}</td>
                             <td className="px-6 py-4">
                                <Badge variant="secondary" className="text-[9px] uppercase font-black">{log.resource_type}</Badge>
                             </td>
                             <td className="px-6 py-4 text-muted-foreground font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:border-primary/50 transition-all group">
      <div className="flex items-center gap-4 mb-4">
        <div className={cn("p-2.5 rounded-xl bg-muted group-hover:bg-muted/80 transition-colors", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
         <h3 className="text-3xl font-display font-bold mt-1">{value}</h3>
         <p className="text-[10px] text-muted-foreground/60 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
   return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
   );
}
