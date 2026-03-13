import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Loader2, Table2, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  connectionId?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  table?: string;
  sqlQuery?: string;
}

export default function DataPreview({
  open, onOpenChange, title, connectionId, warehouse, database, schema, table, sqlQuery
}: DataPreviewProps) {
  const [data, setData] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    if (!open || !connectionId) return;
    
    setLoading(true);
    setError(null);
    try {
      // For now, using mock data to demonstrate the UI
      // In production, this would call a Supabase Edge Function to fetch a sample
      await new Promise(r => setTimeout(r, 1500));
      
      const mockRows = Array.from({ length: 15 }).map((_, i) => ({
        id: i + 1,
        transaction_id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: ["COMPLETED", "PENDING", "FAILED"][Math.floor(Math.random() * 3)],
        amount: (Math.random() * 1000).toFixed(2),
        created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        customer_email: `user${i}@example.com`
      }));
      
      setData(mockRows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch data preview";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connectionId, table, sqlQuery]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden bg-card/95 backdrop-blur-3xl border-border/40 shadow-2xl">
        <DialogHeader className="p-8 pb-6 border-b border-border/20">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                 <Table2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                 <DialogTitle className="text-2xl font-black font-display tracking-tight text-foreground">{title}</DialogTitle>
                 <DialogDescription className="sr-only">Viewing data preview for {title}</DialogDescription>
                 <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest truncate">
                    {warehouse ? `${warehouse} • ` : ""}{database ? `${database} • ` : ""}{schema ? `${schema} • ` : ""}{table || "Ad-hoc Query"}
                 </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPreview} 
                disabled={loading}
                className="rounded-xl border-border/40 hover:bg-muted/50 gap-2 font-black text-[10px] uppercase tracking-widest h-10 px-4"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Refresh
              </Button>
           </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-muted/5">
           {loading && data.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-20">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 animate-pulse">Introspecting Data Stream...</p>
             </div>
           ) : error ? (
             <div className="flex-1 flex flex-col items-center justify-center gap-6 p-20 text-center">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20 animate-in zoom-in-95">
                   <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-lg font-black tracking-tight text-foreground">Discovery Pipeline Ruptured</h3>
                   <p className="text-sm font-bold text-muted-foreground/60 leading-relaxed max-w-sm mx-auto">{error}</p>
                </div>
                <Button onClick={fetchPreview} className="rounded-2xl h-12 px-8 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                   Retry Connection
                </Button>
             </div>
           ) : data.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20 text-center opacity-30">
                <Eye className="w-16 h-16" />
                <p className="text-sm font-black uppercase tracking-widest leading-relaxed">No data observed in the<br/>current observation window.</p>
             </div>
           ) : (
             <div className="flex-1 overflow-auto bg-background/50 backdrop-blur-md m-6 rounded-2xl border border-border/40 shadow-inner">
                <Table className="relative">
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-border/40">
                      {columns.map(col => (
                        <TableHead key={col} className="text-[10px] font-black uppercase tracking-widest p-4 whitespace-nowrap text-muted-foreground h-12">
                          {col.replace(/_/g, ' ')}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, i) => (
                      <TableRow key={i} className="border-border/10 hover:bg-primary/5 transition-colors group">
                        {columns.map(col => (
                          <TableCell key={col} className="p-4 text-[11px] font-bold font-mono text-foreground/80 group-hover:text-primary transition-colors whitespace-nowrap">
                            {String(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
           )}
        </div>

        <div className="p-6 border-t border-border/20 flex items-center justify-between bg-muted/5">
           <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Window Size: 50 Records</span>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Latent Discovery Mode: ON</span>
           </div>
           <Button variant="ghost" className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>
              Close Observation
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
