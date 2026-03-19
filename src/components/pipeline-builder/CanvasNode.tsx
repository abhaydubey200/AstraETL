import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { BuilderNode, NODE_CONFIG, NODE_WIDTH, NODE_HEIGHT, PORT_RADIUS } from "./types";
import { X } from "lucide-react";

interface Props {
  node: BuilderNode;
  selected: boolean;
  zoom: number;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onClick: (e: React.MouseEvent, id: string) => void;
  onPortDown: (e: React.MouseEvent, nodeId: string, port: "out" | "in") => void;
  onPortUp: (e: React.MouseEvent, nodeId: string, port: "out" | "in") => void;
  onDelete: (id: string) => void;
}

const CanvasNode = memo(({ node, selected, zoom, onMouseDown, onClick, onPortDown, onPortUp, onDelete }: Props) => {
  const cfg = NODE_CONFIG[node.type];
  const Icon = cfg.icon;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, node.id); }}
      onClick={(e) => { e.stopPropagation(); onClick(e, node.id); }}
      className="cursor-grab active:cursor-grabbing"
    >
      {/* Node body */}
      <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT} overflow="visible">
        <div
          className={cn(
            "w-full h-full rounded-lg border bg-card flex items-center gap-2.5 px-3 transition-all select-none",
            selected ? "shadow-md shadow-primary/20 ring-1 ring-primary/30" : "hover:border-muted-foreground/30",
            node.status === "running" ? "border-warning animate-pulse ring-1 ring-warning/30" :
            node.status === "success" ? "border-success ring-1 ring-success/30" :
            node.status === "failed" ? "border-destructive ring-1 ring-destructive/30" :
            selected ? "border-primary" : "border-border"
          )}
        >
          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", cfg.bg)}>
            <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
             {(() => {
               const st = node.config.source_table || node.config.target_table;
               const sd = node.config.source_database || node.config.target_database;
               const ss = node.config.source_schema || node.config.target_schema;
               const sw = node.config.source_warehouse || node.config.target_warehouse;

               if (st) {
                 return (
                   <div className="flex flex-col">
                     <span className="text-[7px] font-black uppercase tracking-tighter text-muted-foreground/50 truncate leading-none mb-0.5">
                        {sw ? `${sw}.` : ""}{sd}.{ss}
                     </span>
                     <span className="text-[11px] font-black text-foreground truncate leading-none">
                        {st}
                     </span>
                   </div>
                 );
               }
               return <span className="text-xs font-bold text-foreground truncate">{node.label}</span>;
             })()}
          </div>
          {selected && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </foreignObject>

      {/* Input port (top center) */}
      <circle
        cx={NODE_WIDTH / 2}
        cy={0}
        r={PORT_RADIUS}
        className="fill-background stroke-border hover:fill-primary hover:stroke-primary transition-colors cursor-crosshair"
        strokeWidth={2}
        onMouseDown={(e) => { e.stopPropagation(); onPortDown(e, node.id, "in"); }}
        onMouseUp={(e) => { e.stopPropagation(); onPortUp(e, node.id, "in"); }}
      />

      {/* Output port (bottom center) */}
      <circle
        cx={NODE_WIDTH / 2}
        cy={NODE_HEIGHT}
        r={PORT_RADIUS}
        className="fill-background stroke-border hover:fill-primary hover:stroke-primary transition-colors cursor-crosshair"
        strokeWidth={2}
        onMouseDown={(e) => { e.stopPropagation(); onPortDown(e, node.id, "out"); }}
        onMouseUp={(e) => { e.stopPropagation(); onPortUp(e, node.id, "out"); }}
      />
    </g>
  );
});

CanvasNode.displayName = "CanvasNode";
export default CanvasNode;
