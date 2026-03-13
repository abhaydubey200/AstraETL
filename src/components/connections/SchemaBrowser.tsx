import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Table2, RefreshCw, Loader2, ChevronRight, Search 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Connection } from "@/types/connection";
import { SchemaTable } from "@/hooks/use-connections";

interface SchemaBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection | null;
  onDiscover: (password: string) => Promise<void>;
  tables: SchemaTable[];
  isDiscovering: boolean;
}

export default function SchemaBrowser({
  open, onOpenChange, connection, onDiscover, tables, isDiscovering
}: SchemaBrowserProps) {
  const [password, setPassword] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredTables = tables.filter(t => 
    t.table_name.toLowerCase().includes(search.toLowerCase()) ||
    t.schema_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 bg-card/95 backdrop-blur-xl border-border/50">
        <div className="px-8 pt-6 pb-5 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Table2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">Intelligence Browser</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Deep-scan schemas and explore metadata for <span className="text-foreground font-bold">{connection?.name}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/40 mb-2 border border-dashed border-border">
                <RefreshCw className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Discovery Required</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">To protect your credentials, please verify access to scan the internal schemas.</p>
              </div>
              <div className="w-full flex gap-2">
                <Input
                  type="password"
                  placeholder="Instance password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 bg-muted/30 border-border/50"
                />
                <Button
                  disabled={isDiscovering || !password}
                  onClick={() => onDiscover(password)}
                  className="h-10 px-6 gap-2"
                >
                  {isDiscovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Scan
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search tables or schemas..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 bg-muted/20 border-border/40"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2 border-border/60 hover:bg-muted/50"
                  onClick={() => onDiscover(password)}
                  disabled={isDiscovering}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isDiscovering && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <div className="space-y-2">
                {filteredTables.map((tbl) => {
                  const key = `${tbl.schema_name}.${tbl.table_name}`;
                  const isExpanded = expanded === key;
                  return (
                    <div key={key} className={cn(
                      "rounded-2xl border transition-all duration-300",
                      isExpanded ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5" : "border-border/50 bg-muted/10 hover:border-primary/30"
                    )}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                            isExpanded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                          )}>
                            <Table2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{tbl.schema_name}</span>
                            <p className="text-sm font-bold text-foreground font-mono truncate">{tbl.table_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="hidden md:flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-mono font-bold text-muted-foreground/80 border-border/40">
                              ~{tbl.row_count_estimate.toLocaleString()} stats
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono font-bold text-muted-foreground/80 border-border/40">
                              {tbl.columns.length} indices
                            </Badge>
                          </div>
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 text-muted-foreground transition-transform duration-300",
                              isExpanded && "rotate-90 text-primary"
                            )}
                          />
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                          <div className="rounded-xl border border-border/50 bg-background/50 overflow-hidden shadow-inner">
                            <Table>
                              <TableHeader className="bg-muted/10">
                                <TableRow className="hover:bg-transparent border-border/50">
                                  <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9">Column Entity</TableHead>
                                  <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9">Data Matrix</TableHead>
                                  <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9 text-center">PK</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tbl.columns.map((col) => (
                                  <TableRow key={col.name} className="border-border/30 hover:bg-primary/5 transition-colors">
                                    <TableCell className="text-xs font-mono font-bold text-foreground py-2.5">
                                      {col.name}
                                    </TableCell>
                                    <TableCell className="py-2.5">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono font-bold">
                                        {col.data_type}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2.5 text-center">
                                      {col.is_primary_key && (
                                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-[9px] h-4 uppercase font-black px-1 border-none">
                                          KEY
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
