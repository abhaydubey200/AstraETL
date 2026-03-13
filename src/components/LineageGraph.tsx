import React, { useMemo } from "react";
import ReactFlow, { 
  Handle, 
  Position, 
  Background, 
  Controls,
  NodeProps,
  Edge,
  Node
} from "reactflow";
import "reactflow/dist/style.css";
import { Database, GitBranch, Table, Share2 } from "lucide-react";

const CustomNode = ({ data }: NodeProps) => {
  const Icon = data.icon || Database;
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-card border-2 border-primary/20 min-w-[150px]">
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-primary/10 text-primary mr-2">
          <Icon className="w-4 h-4" />
        </div>
        <div className="ml-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{data.label}</div>
          <div className="text-xs font-semibold text-foreground truncate max-w-[100px]">{data.name}</div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-primary" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-primary" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

interface LineageGraphProps {
  pipelineName: string;
  sourceTable: string;
  targetTable: string;
}

export const LineageGraph = ({ pipelineName, sourceTable, targetTable }: LineageGraphProps) => {
  const initialNodes: Node[] = [
    {
      id: "source",
      type: "custom",
      data: { label: "Source", name: sourceTable, icon: Database },
      position: { x: 0, y: 100 },
    },
    {
      id: "pipeline",
      type: "custom",
      data: { label: "Pipeline", name: pipelineName, icon: GitBranch },
      position: { x: 250, y: 100 },
    },
    {
      id: "target",
      type: "custom",
      data: { label: "Warehouse", name: targetTable, icon: Table },
      position: { x: 500, y: 100 },
    },
  ];

  const initialEdges: Edge[] = [
    { id: "e1-2", source: "source", target: "pipeline", animated: true },
    { id: "e2-3", source: "pipeline", target: "target", animated: true },
  ];

  return (
    <div className="h-[300px] w-full bg-muted/5 rounded-xl border border-border/50 relative overflow-hidden group">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
         <Share2 className="w-4 h-4 text-primary" />
         <h4 className="text-xs font-display font-bold text-foreground">Data Lineage Explorer</h4>
      </div>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-dot-pattern"
      >
        <Background color="#888" strokeWidth={0.5} gap={20} />
        <Controls showInteractive={false} className="hidden group-hover:block" />
      </ReactFlow>
    </div>
  );
};
