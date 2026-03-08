import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Database, Cog, CheckCircle, Upload, Plus, Trash2, ArrowLeft, Play, Save,
  Zap, Filter, Merge, Table, FileCheck, Loader2, X, GripVertical,
  ChevronRight, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
} from "lucide-react";
import { useCreatePipeline, useUpdatePipeline } from "@/hooks/use-pipelines";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type NodeType = "source" | "transform" | "validate" | "load" | "filter" | "join" | "aggregate";

interface BuilderNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

interface BuilderEdge {
  from: string;
  to: string;
}

const nodeConfig: Record<NodeType, { icon: typeof Database; color: string; borderColor: string; bgColor: string; description: string }> = {
  source: { icon: Database, color: "text-primary", borderColor: "border-primary/40", bgColor: "bg-primary/10", description: "Extract data from a source" },
  transform: { icon: Cog, color: "text-warning", borderColor: "border-warning/40", bgColor: "bg-warning/10", description: "Apply transformations" },
  validate: { icon: FileCheck, color: "text-success", borderColor: "border-success/40", bgColor: "bg-success/10", description: "Validate data quality" },
  load: { icon: Upload, color: "text-primary", borderColor: "border-primary/40", bgColor: "bg-primary/10", description: "Load to destination" },
  filter: { icon: Filter, color: "text-warning", borderColor: "border-warning/40", bgColor: "bg-warning/10", description: "Filter rows by condition" },
  join: { icon: Merge, color: "text-warning", borderColor: "border-warning/40", bgColor: "bg-warning/10", description: "Join multiple datasets" },
  aggregate: { icon: Table, color: "text-warning", borderColor: "border-warning/40", bgColor: "bg-warning/10", description: "Group and aggregate" },
};

const toolboxItems: { type: NodeType; label: string }[] = [
  { type: "source", label: "Source" },
  { type: "transform", label: "Transform" },
  { type: "filter", label: "Filter" },
  { type: "join", label: "Join" },
  { type: "aggregate", label: "Aggregate" },
  { type: "validate", label: "Validate" },
  { type: "load", label: "Load" },
];

interface PipelineBuilderProps {
  onBack: () => void;
  pipelineId?: string;
  initialName?: string;
  initialNodes?: BuilderNode[];
  initialEdges?: BuilderEdge[];
}

const PipelineBuilder = ({ onBack, pipelineId, initialName, initialNodes, initialEdges }: PipelineBuilderProps) => {
  const isMobile = useIsMobile();
  const [pipelineName, setPipelineName] = useState(initialName || "Untitled Pipeline");
  const [nodes, setNodes] = useState<BuilderNode[]>(initialNodes || []);
  const [edges, setEdges] = useState<BuilderEdge[]>(initialEdges || []);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showToolbox, setShowToolbox] = useState(!isMobile);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const saving = createPipeline.isPending || updatePipeline.isPending;

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNode || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - dragOffset.current.x) / zoom;
      const y = (e.clientY - rect.top - dragOffset.current.y) / zoom;
      setNodes((prev) => prev.map((n) => (n.id === draggingNode ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)));
    },
    [draggingNode, zoom]
  );

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left - node.x * zoom, y: e.clientY - rect.top - node.y * zoom };
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
  };

  const handleCanvasMouseUp = () => setDraggingNode(null);

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        setEdges((prev) => [...prev, { from: connectingFrom, to: nodeId }]);
      }
      setConnectingFrom(null);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const addNode = (type: NodeType, label: string) => {
    const id = `n${Date.now()}`;
    const x = 200 + Math.random() * 200;
    const y = 100 + nodes.length * 80;
    setNodes((prev) => [...prev, { id, type, label, x, y, config: {} }]);
  };

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    setSelectedNode(null);
  };

  const handleSave = async () => {
    try {
      const mappedNodes = nodes.map((n, i) => ({
        node_type: n.type as any,
        label: n.label,
        config_json: n.config as any,
        position_x: n.x,
        position_y: n.y,
        order_index: i,
      }));

      if (pipelineId) {
        await updatePipeline.mutateAsync({ id: pipelineId, name: pipelineName });
        toast({ title: "Pipeline updated" });
      } else {
        await createPipeline.mutateAsync({
          pipeline: {
            name: pipelineName,
            description: null,
            status: "draft",
            schedule_type: "manual",
            schedule_config: { edges } as any,
            created_by: null,
            last_run_at: null,
            next_run_at: null,
          },
          nodes: mappedNodes,
          edges: [],
        });
        toast({ title: "Pipeline saved" });
        onBack();
      }
    } catch (err: any) {
      toast({ title: "Error saving pipeline", description: err.message, variant: "destructive" });
    }
  };

  const getNodeCenter = (node: BuilderNode) => ({ x: node.x + 80, y: node.y + 30 });
  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  const ToolboxContent = () => (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Components</p>
      {toolboxItems.map((item) => {
        const cfg = nodeConfig[item.type];
        return (
          <button
            key={item.type}
            onClick={() => { addNode(item.type, item.label); if (isMobile) setShowToolbox(false); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all group/item"
          >
            <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors", cfg.bgColor, "group-hover/item:scale-110 transition-transform")}>
              <cfg.icon className={cn("w-4 h-4", cfg.color)} />
            </div>
            <div className="text-left min-w-0">
              <span className="block text-xs font-medium">{item.label}</span>
              <span className="block text-[10px] text-muted-foreground">{cfg.description}</span>
            </div>
          </button>
        );
      })}
      <div className="pt-3 mt-3 border-t border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Actions</p>
        <button
          onClick={() => setConnectingFrom(selectedNode)}
          disabled={!selectedNode}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
        >
          <Zap className="w-3.5 h-3.5 text-primary" /> Connect Nodes
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={onBack} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <input
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              className="text-sm font-display font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 w-full max-w-[200px] sm:max-w-[300px]"
              placeholder="Pipeline name..."
            />
            <p className="text-xs text-muted-foreground">{nodes.length} nodes · {edges.length} connections</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isMobile && (
            <Button variant="outline" size="sm" onClick={() => setShowToolbox(true)} className="gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 h-8 text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
          </Button>
          <Button size="sm" onClick={() => {}} className="gap-1.5 h-8 text-xs bg-success text-success-foreground hover:bg-success/90">
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Run</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Toolbox */}
        {!isMobile && (
          <div className="w-56 border-r border-border bg-card p-3 overflow-y-auto hidden md:block">
            <ToolboxContent />
          </div>
        )}

        {/* Mobile Toolbox Sheet */}
        {isMobile && (
          <Sheet open={showToolbox} onOpenChange={setShowToolbox}>
            <SheetContent side="left" className="w-72 p-4">
              <SheetHeader>
                <SheetTitle>Add Component</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <ToolboxContent />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-background"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => { setSelectedNode(null); setConnectingFrom(null); }}
          style={{ cursor: connectingFrom ? "crosshair" : draggingNode ? "grabbing" : "default" }}
        >
          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {edges.map((edge, i) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              const from = getNodeCenter(fromNode);
              const to = getNodeCenter(toNode);
              const midX = (from.x + to.x) / 2;
              return (
                <g key={i}>
                  <path
                    d={`M ${from.x * zoom} ${from.y * zoom} C ${midX * zoom} ${from.y * zoom}, ${midX * zoom} ${to.y * zoom}, ${to.x * zoom} ${to.y * zoom}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.5"
                    className="transition-all"
                  />
                  <circle cx={to.x * zoom} cy={to.y * zoom} r="4" fill="hsl(var(--primary))" opacity="0.7" />
                </g>
              );
            })}
          </svg>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Build your pipeline</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isMobile ? 'Tap "Add" to add components' : "Click components from the left panel"}
                </p>
              </div>
            </div>
          )}

          {/* Nodes */}
          {nodes.map((node) => {
            const cfg = nodeConfig[node.type];
            const Icon = cfg.icon;
            const isSelected = selectedNode === node.id;
            const isConnectSource = connectingFrom === node.id;
            return (
              <div
                key={node.id}
                className={cn(
                  "absolute w-44 rounded-xl border-2 bg-card p-3.5 cursor-grab active:cursor-grabbing transition-all select-none shadow-sm hover:shadow-md",
                  cfg.borderColor,
                  isSelected && "ring-2 ring-primary shadow-lg border-primary/50",
                  isConnectSource && "ring-2 ring-primary animate-pulse"
                )}
                style={{ left: node.x * zoom, top: node.y * zoom, zIndex: isSelected ? 10 : 2, transform: `scale(${zoom})`, transformOrigin: "top left" }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={(e) => handleNodeClick(e, node.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bgColor)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground truncate block">{node.label}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{node.type}</span>
                  </div>
                </div>
                {/* Connection dots */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-border bg-card hover:bg-primary hover:border-primary transition-colors" />
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-border bg-card hover:bg-primary hover:border-primary transition-colors" />
              </div>
            );
          })}

          {/* Connect mode indicator */}
          {connectingFrom && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-xs text-primary font-medium backdrop-blur-sm">
              Click a target node to connect
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-muted-foreground w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoom(1)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Properties Panel - Desktop inline, Mobile Sheet */}
        {selectedNodeData && !isMobile && (
          <div className="w-72 border-l border-border bg-card p-4 space-y-4 overflow-y-auto animate-fade-in">
            <PropertiesPanel node={selectedNodeData} nodes={nodes} edges={edges} onUpdate={(updated) => setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))} onDelete={deleteNode} onClose={() => setSelectedNode(null)} />
          </div>
        )}
        {selectedNodeData && isMobile && (
          <Sheet open={!!selectedNodeData} onOpenChange={(open) => !open && setSelectedNode(null)}>
            <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl p-4">
              <PropertiesPanel node={selectedNodeData} nodes={nodes} edges={edges} onUpdate={(updated) => setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))} onDelete={deleteNode} onClose={() => setSelectedNode(null)} />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
};

/* Extracted properties panel */
function PropertiesPanel({
  node, nodes, edges, onUpdate, onDelete, onClose,
}: {
  node: BuilderNode;
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  onUpdate: (node: BuilderNode) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const cfg = nodeConfig[node.type];
  const Icon = cfg.icon;
  const outEdges = edges.filter((e) => e.from === node.id);
  const inEdges = edges.filter((e) => e.to === node.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-display font-semibold text-foreground uppercase tracking-wider">Properties</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => onDelete(node.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={cn("flex items-center gap-3 p-3 rounded-lg border", cfg.borderColor, cfg.bgColor + "/30")}>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", cfg.bgColor)}>
          <Icon className={cn("w-5 h-5", cfg.color)} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground capitalize">{node.type}</p>
          <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Label</label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdate({ ...node, label: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-border space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Connections</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{inEdges.length} incoming</span>
          <span>{outEdges.length} outgoing</span>
        </div>
        {inEdges.length > 0 && (
          <div className="space-y-1">
            {inEdges.map((e, i) => {
              const from = nodes.find((n) => n.id === e.from);
              return from ? (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ChevronRight className="w-3 h-3" />
                  <span>From: {from.label}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Need to import GitBranch for empty state
import { GitBranch } from "lucide-react";

export default PipelineBuilder;
