import { useState, useEffect } from "react";
import { useConnections, useSchemaDiscovery, SchemaTable } from "@/hooks/use-connections";
import { 
  Database, Table, Search, Loader2, ChevronDown, ChevronRight, RefreshCw, Lock, ShieldCheck 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface SchemaSelectorProps {
  selectedConnectionId: string;
  onConnectionChange: (id: string) => void;
  selectedSchema: string;
  selectedTable: string;
  onTableSelect: (table: SchemaTable) => void;
  label?: string;
}

export default function SchemaSelector({
  selectedConnectionId,
  onConnectionChange,
  selectedSchema,
  selectedTable,
  onTableSelect,
  label = "Data Entity"
}: SchemaSelectorProps) {
  const { data: connections = [], isLoading: loadingConns } = useConnections();
  const schemaDiscovery = useSchemaDiscovery();
  
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [schemaLoaded, setSchemaLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [rememberPass, setRememberPass] = useState(true);

  const handleDiscover = async () => {
    if (!selectedConnectionId || !password) return;
    try {
      const result = await schemaDiscovery.mutateAsync({ 
        connection_id: selectedConnectionId, 
        password 
      }, []);
      if (result.tables) {
        setTables(result.tables);
        setSchemaLoaded(true);
        if (rememberPass) {
          // Temporarily store in session for this builder session
          sessionStorage.setItem(`db_pass_${selectedConnectionId}`, password);
        }
      }
    } catch (err: any) {
      toast({ title: "Discovery failed", description: err.message, variant: "destructive" }, []);
    }
  };

  // Auto-load if password is in session
  useEffect(() => {
    const cached = sessionStorage.getItem(`db_pass_${selectedConnectionId}`);
    if (cached && !schemaLoaded) {
      setPassword(cached);
      // We don't auto-discover immediately to avoid spamming, 
      // but we could if we wanted to.
    }
  }, [selectedConnectionId]);

  // Reset when connection changes
  useEffect(() => {
    if (!sessionStorage.getItem(`db_pass_${selectedConnectionId}`)) {
      setTables([]);
      setSchemaLoaded(false);
      setPassword("");
    }
  }, [selectedConnectionId]);

  const filteredTables = tables.filter(t => 
    t.table_name.toLowerCase().includes(search.toLowerCase()) ||
    t.schema_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
      {/* Connection Header */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          {label} Infrastructure
          {selectedConnectionId && (
            <Badge variant="outline" className="h-4 text-[8px] border-primary/30 text-primary uppercase font-black px-1.5">
              Targeted
            </Badge>
          )}
        </label>
        
        <div className="relative group">
          <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          <select
            value={selectedConnectionId}
            onChange={(e) => onConnectionChange(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-border/50 bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 transition-all appearance-none cursor-pointer"
          >
            <option value="">Select Bridge Node...</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} • {c.type.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {selectedConnectionId && !schemaLoaded && (
        <div className="p-5 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm space-y-4 animate-in zoom-in-95 duration-300 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Secure Discovery</h4>
              <p className="text-[10px] text-muted-foreground">Verify access to introspect catalogs</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Instance password..."
              className="h-9 bg-background/50 border-border/50 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            />
            <Button
              size="sm"
              disabled={!password || schemaDiscovery.isPending}
              onClick={handleDiscover}
              className="h-9 gap-2 shadow-lg shadow-primary/10"
            >
              {schemaDiscovery.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Scan
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="remember_pass" 
              checked={rememberPass} 
              onChange={(e) => setRememberPass(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20"
            />
            <label htmlFor="remember_pass" className="text-[10px] text-muted-foreground cursor-pointer">Remember for this session</label>
          </div>
        </div>
      )}

      {schemaLoaded && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input 
                placeholder="Search catalog..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 bg-muted/20 border-border/40 text-xs rounded-lg"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => { setSchemaLoaded(false); setTables([]); }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-border/40 bg-muted/5 divide-y divide-border/20 shadow-inner custom-scrollbar">
            {filteredTables.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-[10px]">No entities found</div>
            ) : (
              filteredTables.map((t) => {
                const tableKey = `${t.schema_name}.${t.table_name}`;
                const isSelected = selectedTable === t.table_name && selectedSchema === t.schema_name;
                const isExpanded = expandedTable === tableKey;
                
                return (
                  <div key={tableKey} className={cn(
                    "group transition-all",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                  )}>
                    <div className="flex items-center px-3 py-2.5 gap-2">
                      <button
                        onClick={() => setExpandedTable(isExpanded ? null : tableKey)}
                        className="p-1 rounded hover:bg-primary/10 text-muted-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      
                      <button
                        onClick={() => onTableSelect(t)}
                        className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                        )}>
                          <Table className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-widest leading-none mb-0.5">{t.schema_name}</p>
                          <p className={cn(
                            "text-[11px] font-bold font-mono truncate leading-none",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>{t.table_name}</p>
                        </div>
                        {isSelected && (
                          <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-10 pb-3 space-y-1.5 border-t border-border/10 py-2 animate-in slide-in-from-top-1 duration-200">
                        {t.columns.map((col) => (
                          <div key={col.name} className="flex items-center justify-between text-[9px] group/col">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn(
                                "font-bold truncate transition-colors",
                                col.is_primary_key ? "text-warning" : "text-muted-foreground group-hover/col:text-foreground"
                              )}>
                                {col.name}
                              </span>
                              {col.is_primary_key && <Badge className="bg-warning/20 text-warning hover:bg-warning/30 text-[7px] h-3 px-1 border-none font-black uppercase">PK</Badge>}
                            </div>
                            <span className="text-muted-foreground/50 font-mono italic shrink-0">{col.data_type}</span>
                          </div>
                        ))}
                        <div className="pt-2 flex items-center gap-3">
                           <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">METRICS:</span>
                           <span className="text-[9px] font-mono text-muted-foreground">~{t.row_count_estimate.toLocaleString()} stats</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
