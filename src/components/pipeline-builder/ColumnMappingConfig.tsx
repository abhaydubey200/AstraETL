import { useMemo } from "react";
import { BuilderNode, BuilderEdge } from "./types";
import { ArrowRight, Zap, CheckCircle2, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface Props {
  node: BuilderNode;
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  onUpdate: (id: string, updates: Partial<BuilderNode>) => void;
}

interface Column {
  name: string;
  data_type: string;
  is_primary_key?: boolean;
}

export default function ColumnMappingConfig({ node, nodes, edges, onUpdate }: Props) {
  // Find source node connected to this load node
  const sourceNode = useMemo(() => {
    // Walk back through edges to find a source node
    const visited = new Set<string>();
    const queue = [node.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const incoming = edges.filter((e) => e.to === current);
      for (const edge of incoming) {
        const upstream = nodes.find((n) => n.id === edge.from);
        if (upstream?.type === "source") return upstream;
        queue.push(edge.from);
      }
    }
    return null;
  }, [node.id, nodes, edges]);

  const sourceColumns: Column[] = useMemo(() => {
    if (!sourceNode?.config.source_columns) return [];
    try {
      return JSON.parse(sourceNode.config.source_columns);
    } catch {
      return [];
    }
  }, [sourceNode?.config.source_columns]);

  const targetColumns: Column[] = useMemo(() => {
    if (!node.config.target_columns) return [];
    try {
      return JSON.parse(node.config.target_columns);
    } catch {
      return [];
    }
  }, [node.config.target_columns]);

  // Parse existing mappings
  const mappings: Record<string, string> = useMemo(() => {
    try {
      return node.config.column_mappings ? JSON.parse(node.config.column_mappings) : {};
    } catch {
      return {};
    }
  }, [node.config.column_mappings]);

  const updateMapping = (sourceCol: string, targetCol: string) => {
    const newMappings = { ...mappings, [sourceCol]: targetCol };
    if (!targetCol) delete newMappings[sourceCol];
    onUpdate(node.id, {
      config: { ...node.config, column_mappings: JSON.stringify(newMappings) },
    });
  };

  const autoMap = () => {
    const newMappings: Record<string, string> = {};
    for (const sc of sourceColumns) {
      // 1. Exact match
      let match = targetColumns.find(tc => tc.name.toLowerCase() === sc.name.toLowerCase());
      
      // 2. Prefix/Suffix match (e.g. "user_id" matches "id" if unique-ish)
      if (!match) {
        match = targetColumns.find(tc => 
          tc.name.toLowerCase().includes(sc.name.toLowerCase()) || 
          sc.name.toLowerCase().includes(tc.name.toLowerCase())
        );
      }

      if (match) newMappings[sc.name] = match.name;
    }
    onUpdate(node.id, {
      config: { ...node.config, column_mappings: JSON.stringify(newMappings) },
    });
  };

  const getTypeStatus = (sourceType: string, targetName: string) => {
    if (!targetName) return null;
    const target = targetColumns.find(tc => tc.name === targetName);
    if (!target) return null;

    const s = sourceType.toLowerCase();
    const t = target.data_type.toLowerCase();

    if (s === t) return { icon: CheckCircle2, color: "text-success", label: "Type Match" };
    
    // Compatible types (very simplified)
    const numeric = ["int", "integer", "bigint", "decimal", "numeric", "float", "double"];
    if (numeric.some(x => s.includes(x)) && numeric.some(x => t.includes(x))) {
      return { icon: Info, color: "text-blue-400", label: "Compatible Casting" };
    }

    return { icon: AlertTriangle, color: "text-warning", label: "Type Mismatch" };
  };

  if (!sourceNode) {
    return (
      <div className="p-2 rounded-md bg-muted/50 border border-border">
        <p className="text-[10px] text-muted-foreground">Connect a Source node upstream to configure column mapping.</p>
      </div>
    );
  }

  if (sourceColumns.length === 0) {
    return (
      <div className="p-2 rounded-md bg-muted/50 border border-border">
        <p className="text-[10px] text-muted-foreground">Select a source table first to map columns.</p>
      </div>
    );
  }

  if (targetColumns.length === 0 && node.config.load_mode !== "auto") {
    return (
      <div className="p-2 rounded-md bg-muted/50 border border-border">
        <p className="text-[10px] text-muted-foreground">Select a target table first to map columns.</p>
      </div>
    );
  }

  // For auto-create mode, target columns = source columns
  const effectiveTargetCols = node.config.load_mode === "auto" ? sourceColumns : targetColumns;

  const mappedCount = Object.keys(mappings).filter((k) => mappings[k]).length;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">
              Alignment Matrix
            </label>
            <span className="text-[11px] font-bold text-foreground/80">
              {mappedCount} of {sourceColumns.length} Mapped
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={autoMap}
            className="h-8 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
          >
            <Zap className="w-3 h-3" /> Auto-Align
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-border/40 hover:scrollbar-thumb-primary/20">
          {sourceColumns.map((sc) => {
            const mappedTo = mappings[sc.name];
            const status = getTypeStatus(sc.data_type, mappedTo);
            const StatusIcon = status?.icon;

            return (
              <div key={sc.name} className={cn(
                "flex items-center gap-2 p-1.5 rounded-xl border transition-all",
                mappedTo ? "bg-card/40 border-border/40" : "bg-muted/5 border-transparent opacity-60 hover:opacity-100"
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black font-mono truncate text-foreground/80">{sc.name}</span>
                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">{sc.data_type}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                   <ArrowRight className={cn("w-3 h-3", mappedTo ? "text-primary/60" : "text-muted-foreground/20")} />
                   {StatusIcon && (
                     <Tooltip>
                        <TooltipTrigger>
                           <StatusIcon className={cn("w-2.5 h-2.5", status.color)} />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] font-black uppercase tracking-widest bg-card border-border/40">
                           {status.label}
                        </TooltipContent>
                     </Tooltip>
                   )}
                </div>

                <div className="flex-1 min-w-0">
                  <select
                    value={mappedTo || ""}
                    onChange={(e) => updateMapping(sc.name, e.target.value)}
                    className={cn(
                      "w-full h-8 px-2 rounded-lg border bg-background/50 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer transition-all",
                      mappedTo ? "border-primary/20 text-primary" : "border-border/30 text-muted-foreground/40"
                    )}
                  >
                    <option value="">— DISCON —</option>
                    {effectiveTargetCols.map((tc) => (
                      <option key={tc.name} value={tc.name}>
                        {tc.name} ({tc.data_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        
        {mappedCount < sourceColumns.length && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-warning/5 border border-warning/10">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            <p className="text-[9px] font-bold text-warning/80 leading-tight">
              Partial alignment detected. Unmapped artifacts will be omitted from the terminal load stage.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
