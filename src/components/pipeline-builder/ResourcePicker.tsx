import { useState, useEffect } from "react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  Database, Snowflake, ChevronRight, ChevronDown, 
  Table2, Box, Loader2, Search, HardDrive, Layout,
  SearchCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Connection } from "@/types/connection";
import { useResourceDiscovery } from "@/hooks/use-connections";
import { Input } from "@/components/ui/input";

interface ResourcePickerProps {
  connection: Connection | null;
  selectedPath?: string; // e.g. "WH.DB.SCHEMA.TABLE"
  onSelect: (path: { warehouse?: string; database: string; schema: string; table: string; columns?: { name: string; data_type: string }[] }) => void;
  triggerLabel?: string;
  disabled?: boolean;
}

export default function ResourcePicker({
  connection, selectedPath, onSelect, triggerLabel = "Select Entity...", disabled
}: ResourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [treeContent, setTreeContent] = useState<Record<string, string[]>>({});
  const [loadingNodes, setLoadingNodes] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const resourceDiscovery = useResourceDiscovery();

  const loadRoot = async () => {
    if (!connection) return;
    const target = connection.type === "snowflake" ? "warehouses" : "databases";
    setLoadingNodes({ root: true });
    try {
      const { results } = await resourceDiscovery.mutateAsync({
        ...connection,
        target: target as "warehouses" | "databases" | "schemas" | "tables",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      setTreeContent({ root: results });
    } catch (err) {
      console.error("Root load failed:", err);
    } finally {
      setLoadingNodes({ root: false });
    }
  };

  useEffect(() => {
    if (open && connection && !treeContent.root) {
      loadRoot();
    }
  }, [open, connection]);

  const toggleNode = async (nodeId: string, label: string, type: string, parentId?: string) => {
    const isExpanded = !!expanded[nodeId];
    setExpanded(p => ({ ...p, [nodeId]: !isExpanded }));

    if (!isExpanded && !treeContent[nodeId] && type !== "table") {
      setLoadingNodes(p => ({ ...p, [nodeId]: true }));
      try {
        let target: "databases" | "schemas" | "tables" = "databases";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = { ...connection };
        
        if (type === "warehouse") {
          target = "databases";
          params.warehouse_name = label;
        } else if (type === "database") {
          target = "schemas";
          params.database_name = label;
          const whPart = parentId?.split('-').find(p => p.startsWith('warehouse:'));
          if (whPart) {
            params.warehouse_name = whPart.split(':')[1];
          }
        } else if (type === "schema") {
          target = "tables";
          params.schema_name = label;
          const dbPart = parentId?.split('-').find(p => p.startsWith('database:'));
          if (dbPart) {
            params.database_name = dbPart.split(':')[1];
          }
        }

        const { results } = await resourceDiscovery.mutateAsync({
          ...params,
          target,
        });
        setTreeContent(p => ({ ...p, [nodeId]: results }));
      } catch (err) {
        console.error(`Load node ${nodeId} failed:`, err);
      } finally {
        setLoadingNodes(p => ({ ...p, [nodeId]: false }));
      }
    }
  };

  const handleTableSelect = (label: string, schema: string, database: string, warehouse?: string) => {
    onSelect({
      warehouse,
      database,
      schema,
      table: label,
      // In a real app we might fetch columns here too if not already prefetched
    });
    setOpen(false);
  };

  const renderNode = (nodeData: any, type: "warehouse" | "database" | "schema" | "table", depth: number, parentId?: string) => {
    const label = typeof nodeData === "string" ? nodeData : nodeData.name;
    const nodeId = `${type}:${label}${parentId ? `-${parentId}` : ""}`;
    const isOpen = !!expanded[nodeId];
    const isLoading = !!loadingNodes[nodeId];
    const children = treeContent[nodeId] || [];
    const recommendation = typeof nodeData !== "string" ? nodeData.recommendation : null;

    const Icon = {
      warehouse: HardDrive,
      database: Database,
      schema: Layout,
      table: Table2
    }[type];

    if (search && type === "table" && !label.toLowerCase().includes(search.toLowerCase())) return null;

    return (
      <div key={nodeId}>
        <div 
          onClick={() => {
            if (type === "table") {
              const parts = nodeId.split('-');
              let schemaName = "";
              let dbName = "";
              let whName = "";

              parts.forEach(p => {
                if (p.startsWith('schema:')) schemaName = p.split(':')[1];
                if (p.startsWith('database:')) dbName = p.split(':')[1];
                if (p.startsWith('warehouse:')) whName = p.split(':')[1];
              });

              handleTableSelect(label, schemaName, dbName, whName);
            } else {
              toggleNode(nodeId, label, type, parentId);
            }
          }}
          className={cn(
            "flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer transition-colors text-[11px]",
            isOpen ? "bg-primary/5 text-foreground" : "hover:bg-muted text-muted-foreground"
          )}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            {type !== "table" ? (
              <div className="w-3 h-3 flex items-center justify-center">
                {isLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : isOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              </div>
            ) : <div className="w-3" />}
            
            <Icon className={cn("w-3.5 h-3.5 shrink-0", (isOpen || type === "table") ? "text-primary" : "text-muted-foreground/50")} />
            <span className={cn("truncate font-bold", type === "table" && "font-mono")}>{label}</span>
          </div>

          {recommendation && (
            <div className={cn(
              "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter opacity-70 border border-current ml-2 shrink-0",
              recommendation.mode === 'cdc' ? "text-cyan-500 bg-cyan-500/5" : 
              recommendation.mode === 'incremental' ? "text-amber-500 bg-amber-500/5" : "text-muted-foreground bg-muted/5"
            )}>
              {recommendation.mode}
            </div>
          )}
        </div>

        {isOpen && children.map(childData => {
          const nextType: "warehouse" | "database" | "schema" | "table" = type === "warehouse" ? "database" : type === "database" ? "schema" : "table";
          return renderNode(childData, nextType, depth + 1, nodeId);
        })}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled || !connection}
          className="w-full justify-between h-9 px-3 text-[11px] font-bold border-border/50 hover:bg-muted/50 transition-all"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedPath ? <Table2 className="w-3.5 h-3.5 text-primary" /> : <SearchCode className="w-3.5 h-3.5 text-muted-foreground/40" />}
            <span className="truncate">{selectedPath || triggerLabel}</span>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground/40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl" align="start">
        <div className="p-3 border-b border-border/20">
           <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
              <Input 
                placeholder="Find entity..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 bg-muted/20 border-border/30 rounded-lg text-xs"
              />
           </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
           {loadingNodes.root ? (
             <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-30">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="text-[9px] font-black uppercase tracking-widest">Discovering...</p>
             </div>
           ) : (
             <div className="space-y-0.5">
                {treeContent.root?.map(rootLabel => {
                  const type = connection?.type === "snowflake" ? "warehouse" : "database";
                  return renderNode(rootLabel, type as any, 0);
                })}
             </div>
           )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
