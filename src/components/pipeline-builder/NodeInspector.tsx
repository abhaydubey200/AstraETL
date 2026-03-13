import { cn } from "@/lib/utils";
import { BuilderNode, BuilderEdge, NODE_CONFIG } from "./types";
import { Trash2, X, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SourceNodeConfig from "./SourceNodeConfig";
import LoadNodeConfig from "./LoadNodeConfig";
import TransformNodeConfig from "./TransformNodeConfig";
import ValidateNodeConfig from "./ValidateNodeConfig";
import FilterNodeConfig from "./FilterNodeConfig";
import ColumnMappingConfig from "./ColumnMappingConfig";

interface Props {
  node: BuilderNode;
  edges: BuilderEdge[];
  nodes: BuilderNode[];
  onUpdate: (id: string, updates: Partial<BuilderNode>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function NodeInspector({ node, edges, nodes, onUpdate, onDelete, onClose }: Props) {
  const cfg = NODE_CONFIG[node.type];
  const Icon = cfg.icon;
  const inCount = edges.filter((e) => e.to === node.id).length;
  const outCount = edges.filter((e) => e.from === node.id).length;
  const inEdges = edges.filter((e) => e.to === node.id);

  return (
    <div className="w-80 border-l border-border/50 bg-card/95 backdrop-blur-xl p-6 space-y-6 overflow-y-auto animate-in slide-in-from-right duration-500 shadow-2xl">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-border/20", cfg.bg)}>
            <Icon className={cn("w-5 h-5", cfg.color)} />
          </div>
          <div>
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">Node Identity</span>
             <h3 className="text-sm font-bold text-foreground capitalize leading-tight">{node.type}</h3>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onDelete(node.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Display Identifier</label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="w-full h-10 px-3 py-2 rounded-xl border border-border/50 bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g. Master Sales Data"
          />
        </div>

        {/* Source Node Configuration */}
        {node.type === "source" && (
          <div className="pt-4 border-t border-border/10">
            <SourceNodeConfig node={node} onUpdate={onUpdate} />
          </div>
        )}

        {/* Transform Node Configuration */}
        {node.type === "transform" && (
          <div className="pt-4 border-t border-border/10">
            <TransformNodeConfig node={node} onUpdate={onUpdate} />
          </div>
        )}

        {/* Validate Node Configuration */}
        {node.type === "validate" && (
          <div className="pt-4 border-t border-border/10">
            <ValidateNodeConfig node={node} onUpdate={onUpdate} />
          </div>
        )}

        {/* Filter Node Configuration */}
        {node.type === "filter" && (
          <div className="pt-4 border-t border-border/10">
            <FilterNodeConfig node={node} onUpdate={onUpdate} />
          </div>
        )}

        {/* Load Node Configuration */}
        {node.type === "load" && (
          <div className="space-y-6">
            <div className="pt-4 border-t border-border/10">
              <LoadNodeConfig node={node} onUpdate={onUpdate} />
            </div>
            <div className="pt-4 border-t border-border/10">
              <ColumnMappingConfig node={node} nodes={nodes} edges={edges} onUpdate={onUpdate} />
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-border/10">
         <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Connectivity Map</span>
            <div className="flex gap-3 text-[10px] items-center">
              <Badge variant="secondary" className="h-5 text-[9px] bg-muted/50 border-none">{inCount} IN</Badge>
              <Badge variant="secondary" className="h-5 text-[9px] bg-muted/50 border-none">{outCount} OUT</Badge>
            </div>
         </div>
        
        {inEdges.length > 0 && (
          <div className="space-y-2">
            {inEdges.map((e) => {
              const from = nodes.find((n) => n.id === e.from);
              return from ? (
                <div key={e.from} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/30 bg-muted/10">
                  <div className="w-6 h-6 rounded-lg bg-background flex items-center justify-center border border-border/50">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground truncate flex-1">{from.label}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
