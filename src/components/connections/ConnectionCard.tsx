import { Connection } from "@/types/connection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Database, DatabaseZap, Clock, Trash2, Eye, 
  ChevronRight, ArrowUpRight, Activity, 
  Lock, Globe, AlertCircle, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface ConnectionCardProps {
  connection: Connection;
  onEdit: (conn: Connection) => void;
  onDelete: (id: string) => void;
  onBrowse: (conn: Connection) => void;
  dbConfigs: any[];
}

export default function ConnectionCard({ 
  connection, onEdit, onDelete, onBrowse, dbConfigs 
}: ConnectionCardProps) {
  const cfg = useMemo(() => 
    dbConfigs.find((d) => d.type === connection.type) || dbConfigs[0],
    [connection.type, dbConfigs]
  );
  
  const Icon = cfg.icon;
  const isConnected = connection.status === "connected";
  const isError = connection.status === "error";

  return (
    <Card 
      onClick={() => onEdit(connection)}
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-500",
        "bg-card/30 backdrop-blur-xl border border-border/40 shadow-sm",
        "hover:border-primary/40 hover:shadow-[0_0_40px_-10px_rgba(var(--primary),0.15)] hover:-translate-y-1.5",
        isError && "border-destructive/20 hover:border-destructive/40"
      )}
    >
      {/* Background Gradient Mesh */}
      <div className={cn(
        "absolute -right-20 -top-20 w-48 h-48 blur-[80px] opacity-10 transition-opacity duration-1000 group-hover:opacity-20",
        cfg.color.replace('text-', 'bg-')
      )} />

      <CardContent className="p-7">
        <div className="flex items-start justify-between mb-8">
          <div className="flex gap-4.5">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 shadow-2xl relative",
              "bg-background/80 border border-border/50",
              cfg.color
            )}>
              <Icon className="w-7 h-7" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="font-extrabold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
                {connection.name}
              </h3>
              <div className="flex items-center gap-2.5 mt-1.5">
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 h-auto bg-muted/60 text-muted-foreground/80 border-none">
                  {connection.type}
                </Badge>
                {connection.ssl_enabled && (
                  <div className="flex items-center gap-1 text-success/80">
                    <Lock className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Secured</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5">
             <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-500",
                isConnected ? "bg-success/10 text-success border-success/30 shadow-[0_0_15px_-5px_rgba(var(--success),0.3)]" : 
                isError ? "bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_15px_-5px_rgba(var(--destructive),0.3)]" : 
                "bg-muted/40 text-muted-foreground/60 border-border/50"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-success animate-pulse" : isError ? "bg-destructive" : "bg-muted-foreground/40")} />
                {isConnected ? "Verified Live" : connection.status === "error" ? "System Failure" : "Bridge Offline"}
              </div>
          </div>
        </div>

        <div className="space-y-3.5 mb-8">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/30 group-hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center text-muted-foreground/60">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none mb-1">Host Endpoint</p>
                <p className="text-xs font-bold font-mono text-foreground/90 truncate max-w-[140px] tracking-tight">{connection.host}</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/30 group-hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center text-muted-foreground/60">
                {connection.type === "snowflake" ? <Database className="w-4 h-4 text-primary/70" /> : <DatabaseZap className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none mb-1">
                  {connection.type === "snowflake" ? "Warehouse / DB" : "Data Instance"}
                </p>
                <p className="text-xs font-bold font-mono text-foreground/90 truncate max-w-[140px] tracking-tight">
                  {connection.type === "snowflake" 
                    ? `${connection.warehouse_name || 'N/A'} · ${connection.database_name}`
                    : connection.database_name
                  }
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
          </div>
        </div>
          <div className="flex items-center justify-between pt-6 border-t border-border/40">
          <div className="flex gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Last Active
              </span>
              <span className="text-xs text-foreground/80 font-black tracking-tight">
                {connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Integrity
              </span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={cn("w-1 h-3 rounded-full", i <= (isConnected ? 5 : isError ? 1 : 0) ? "bg-success/60" : "bg-muted")} />
                  ))}
                </div>
                <span className="text-xs text-foreground/80 font-black tracking-tight">
                  {isConnected ? "Excellent" : isError ? "Critical" : "Unknown"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(connection.id);
              }}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              className="h-10 px-4 rounded-xl gap-2 font-black text-[11px] uppercase tracking-wider border-border/50 hover:bg-muted/50 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onBrowse(connection);
              }}
            >
              <Eye className="w-4 h-4" /> Browse
            </Button>
            <Button
              className="h-10 px-4 rounded-xl gap-2 font-black text-[11px] uppercase tracking-wider shadow-xl shadow-primary/20"
              onClick={(e) => { e.stopPropagation(); onEdit(connection); }}
            >
              Configure <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
