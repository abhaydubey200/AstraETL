import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Database,
  Cog,
  CheckCircle,
  Upload,
  Plus,
  Trash2,
  ArrowLeft,
  Play,
  Save,
  GripVertical,
  Zap,
  Filter,
  Merge,
  Table,
  FileCheck,
} from "lucide-react";

type NodeType = "extract" | "transform" | "validate" | "load" | "filter" | "join" | "aggregate";

interface PipelineNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

interface PipelineEdge {
  from: string;
  to: string;
}

const nodeConfig: Record<NodeType, { icon: typeof Database; color: string; borderColor: string; bgColor: string }> = {
  extract: { icon: Database, color: "text-primary", borderColor: "border-primary/30", bgColor: "bg-primary/10" },
  transform: { icon: Cog, color: "text-warning", borderColor: "border-warning/30", bgColor: "bg-warning/10" },
  validate: { icon: FileCheck, color: "text-success", borderColor: "border-success/30", bgColor: "bg-success/10" },
  load: { icon: Upload, color: "text-primary", borderColor: "border-primary/30", bgColor: "bg-primary/10" },
  filter: { icon: Filter, color: "text-warning", borderColor: "border-warning/30", bgColor: "bg-warning/10" },
  join: { icon: Merge, color: "text-warning", borderColor: "border-warning/30", bgColor: "bg-warning/10" },
  aggregate: { icon: Table, color: "text-warning", borderColor: "border-warning/30", bgColor: "bg-warning/10" },
};

const toolboxItems: { type: NodeType; label: string }[] = [
  { type: "extract", label: "Extract" },
  { type: "transform", label: "Transform" },
  { type: "filter", label: "Filter" },
  { type: "join", label: "Join" },
  { type: "aggregate", label: "Aggregate" },
  { type: "validate", label: "Validate" },
  { type: "load", label: "Load" },
];

const defaultNodes: PipelineNode[] = [
  { id: "n1", type: "extract", label: "MSSQL Extract", x: 80, y: 120, config: { source: "MSSQL", table: "dbo.orders" } },
  { id: "n2", type: "transform", label: "Clean & Map", x: 340, y: 80, config: { engine: "Spark", operation: "dropDuplicates, filterNulls" } },
  { id: "n3", type: "filter", label: "Amount > 0", x: 340, y: 220, config: { condition: "amount > 0" } },
  { id: "n4", type: "validate", label: "Row Count Check", x: 600, y: 120, config: { checks: "row_count, null_check, schema_validation" } },
  { id: "n5", type: "load", label: "Snowflake Load", x: 860, y: 120, config: { destination: "Snowflake", method: "COPY INTO", warehouse: "COMPUTE_WH" } },
];

const defaultEdges: PipelineEdge[] = [
  { from: "n1", to: "n2" },
  { from: "n1", to: "n3" },
  { from: "n2", to: "n4" },
  { from: "n3", to: "n4" },
  { from: "n4", to: "n5" },
];

const PipelineBuilder = ({ onBack }: { onBack: () => void }) => {
  const [nodes, setNodes] = useState<PipelineNode[]>(defaultNodes);
  const [edges, setEdges] = useState<PipelineEdge[]>(defaultEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNode || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.current.x;
      const y = e.clientY - rect.top - dragOffset.current.y;
      setNodes((prev) => prev.map((n) => (n.id === draggingNode ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)));
    },
    [draggingNode]
  );

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y };
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
  };

  const handleCanvasMouseUp = () => {
    setDraggingNode(null);
  };

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
    setNodes((prev) => [...prev, { id, type, label, x: 200 + Math.random() * 200, y: 100 + Math.random() * 200, config: {} }]);
  };

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    setSelectedNode(null);
  };

  const getNodeCenter = (node: PipelineNode) => ({ x: node.x + 80, y: node.y + 30 });

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-display font-semibold text-foreground">Pipeline Builder</h2>
            <p className="text-xs text-muted-foreground">Sales MSSQL → Snowflake</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success text-success-foreground text-xs font-medium hover:bg-success/90 transition-colors">
            <Play className="w-3.5 h-3.5" /> Run Pipeline
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbox */}
        <div className="w-48 border-r border-border bg-card p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Components</p>
          {toolboxItems.map((item) => {
            const cfg = nodeConfig[item.type];
            return (
              <button
                key={item.type}
                onClick={() => addNode(item.type, item.label)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <cfg.icon className={cn("w-3.5 h-3.5", cfg.color)} />
                {item.label}
                <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
              </button>
            );
          })}
          <div className="pt-3 mt-3 border-t border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Actions</p>
            <button
              onClick={() => setConnectingFrom(selectedNode)}
              disabled={!selectedNode}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              Connect Nodes
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-background"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => { setSelectedNode(null); setConnectingFrom(null); }}
          style={{ cursor: connectingFrom ? "crosshair" : draggingNode ? "grabbing" : "default" }}
        >
          {/* Grid pattern */}
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
                    d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.4"
                  />
                  <circle cx={to.x} cy={to.y} r="3" fill="hsl(var(--primary))" opacity="0.6" />
                </g>
              );
            })}
          </svg>

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
                  "absolute w-40 rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow select-none",
                  cfg.borderColor,
                  isSelected && "ring-1 ring-primary shadow-lg",
                  isConnectSource && "ring-2 ring-primary animate-pulse"
                )}
                style={{ left: node.x, top: node.y, zIndex: isSelected ? 10 : 2 }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={(e) => handleNodeClick(e, node.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center", cfg.bgColor)}>
                    <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate">{node.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground capitalize">{node.type}</p>
              </div>
            );
          })}

          {connectingFrom && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-xs text-primary font-display">
              Click a target node to connect
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedNodeData && (
          <div className="w-64 border-l border-border bg-card p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-display font-semibold text-foreground uppercase tracking-wider">Properties</h3>
              <button onClick={() => deleteNode(selectedNodeData.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Node ID</label>
                <p className="text-xs font-display text-foreground mt-0.5">{selectedNodeData.id}</p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</label>
                <p className="text-xs font-display text-foreground mt-0.5 capitalize">{selectedNodeData.type}</p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</label>
                <input
                  type="text"
                  value={selectedNodeData.label}
                  onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNodeData.id ? { ...n, label: e.target.value } : n)))}
                  className="w-full mt-0.5 px-2 py-1 rounded border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {Object.entries(selectedNodeData.config).map(([key, val]) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</label>
                  <p className="text-xs font-display text-foreground mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                Connections: {edges.filter((e) => e.from === selectedNodeData.id).length} out, {edges.filter((e) => e.to === selectedNodeData.id).length} in
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineBuilder;
