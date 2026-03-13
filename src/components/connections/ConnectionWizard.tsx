import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, Zap, Loader2, 
  Shield, CheckCircle2, 
  Layers, Terminal, Monitor,
  Database as DatabaseIcon,
  Box, Search,
  Globe2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ConnectionFormData, ConnectionType, DEFAULT_PORTS } from "@/types/connection";
import { TestConnectionResult } from "@/hooks/use-connections";
import { Badge } from "@/components/ui/badge";

interface WizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: ConnectionFormData;
  setForm: React.Dispatch<React.SetStateAction<ConnectionFormData>>;
  onTest: () => Promise<void>;
  onSave: () => Promise<void>;
  onDiscoverResources: (params: any) => Promise<{ results: string[] }>;
  testResult: TestConnectionResult | null;
  dbConfigs: any[];
  isTesting: boolean;
  isSaving: boolean;
}

type Step = "type" | "address" | "auth" | "security" | "verify" | "warehouse" | "database" | "schema" | "tables" | "name";

export default function ConnectionWizard({
  open, onOpenChange, editingId, form, setForm, 
  onTest, onSave, onDiscoverResources, testResult, dbConfigs, isTesting, isSaving
}: WizardProps) {
  const [step, setStep] = useState<Step>("type");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  // Filtered lists
  const filteredDatabases = databases.filter(db => db.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSchemas = schemas.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTables = availableTables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    if (open) {
      setStep(editingId ? "address" : "type");
      setSearchTerm("");
    }
  }, [open, editingId]);

  const selectType = (type: ConnectionType) => {
    setForm((p) => ({ ...p, type, port: DEFAULT_PORTS[type] }));
    setStep("address");
  };

  const dbConfig = dbConfigs.find(c => c.type === form.type) || dbConfigs[0];

  const handleTestAndDiscover = async () => {
    await onTest();
  };

  useEffect(() => {
    if (testResult?.success && step === "verify") {
      fetchInitialResources();
    }
  }, [testResult, step]);

  const fetchInitialResources = async () => {
    setIsLoadingResources(true);
    try {
      if (form.type === "snowflake") {
        const { results } = await onDiscoverResources({ ...form, target: "warehouses" });
        setWarehouses(results);
        setStep("warehouse");
      } else {
        const { results } = await onDiscoverResources({ ...form, target: "databases" });
        setDatabases(results);
        setStep("database");
      }
    } catch (err: any) {
      console.error("Failed to fetch initial resources:", err);
      // Try to extract error message from Supabase FunctionsHttpError
      let errorMessage = "Failed to fetch metadata from the source.";
      if (err.detail) {
        errorMessage = err.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: "Discovery Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleWarehouseChange = async (warehouse: string) => {
    setForm(p => ({ ...p, warehouse_name: warehouse }));
    setIsLoadingResources(true);
    try {
      const { results } = await onDiscoverResources({ ...form, warehouse_name: warehouse, target: "databases" });
      setDatabases(results);
      setStep("database");
    } catch (err: any) {
      console.error("Failed to fetch databases:", err);
      toast({
        title: "Database Discovery Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleDatabaseChange = async (db: string) => {
    setForm(p => ({ ...p, database_name: db, schema_name: "", selected_tables: [] }));
    setIsLoadingResources(true);
    try {
      const { results } = await onDiscoverResources({ ...form, database_name: db, target: "schemas" });
      setSchemas(results);
      setStep("schema");
    } catch (err: any) {
      console.error("Failed to fetch schemas:", err);
      toast({
        title: "Schema Discovery Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleSchemaChange = async (schema: string) => {
    setForm(p => ({ ...p, schema_name: schema, selected_tables: [] }));
    setIsLoadingResources(true);
    try {
      const { results } = await onDiscoverResources({ ...form, schema_name: schema, target: "tables" });
      setAvailableTables(results);
      setStep("tables");
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const toggleTable = (table: string) => {
    setForm(p => {
      const current = p.selected_tables || [];
      const updated = current.includes(table)
        ? current.filter(t => t !== table)
        : [...current, table];
      return { ...p, selected_tables: updated };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl p-0 gap-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col md:flex-row h-[600px] md:h-[480px]">
          {/* Sidebar Info */}
          <div className="w-full md:w-1/3 bg-muted/30 p-8 border-r border-border/50 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-sm">
                {step === "type" && <Layers className="w-5 h-5" />}
                {step === "address" && <Terminal className="w-5 h-5" />}
                {step === "auth" && <Terminal className="w-5 h-5" />}
                {step === "verify" && <Monitor className="w-5 h-5" />}
                {step === "warehouse" && <Monitor className="w-5 h-5" />}
                {step === "database" && <DatabaseIcon className="w-5 h-5" />}
                {step === "schema" && <DatabaseIcon className="w-5 h-5" />}
                {step === "tables" && <Layers className="w-5 h-5" />}
                {step === "name" && <CheckCircle2 className="w-5 h-5" />}
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {editingId ? "Edit" : "Add"} <br /> Connection
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your heterogeneous data sources securely to build robust, scalable pipelines.
              </p>
            </div>
            
            <div className="hidden md:block space-y-4">
              {(["type" as Step, "address" as Step, "auth" as Step, "verify" as Step, "warehouse" as Step, "database" as Step, "schema" as Step, "tables" as Step, "name" as Step]).map((s, i) => {
                const isSnowflake = form.type === "snowflake";
                if (s === "warehouse" && !isSnowflake) return null;
                
                const steps = ["type", "address", "auth", "security", "verify", ...(isSnowflake ? ["warehouse"] : []), "database", "schema", "tables", "name"];
                const activeIdx = steps.indexOf(step);
                const currentIdx = steps.indexOf(s);

                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                      step === s ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20" : 
                      (currentIdx < activeIdx ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")
                    )}>
                      {currentIdx < activeIdx ? "✓" : currentIdx + 1}
                    </div>
                    <span className={cn(
                      "text-[11px] font-bold uppercase tracking-wider transition-colors",
                      step === s ? "text-foreground" : "text-muted-foreground/60"
                    )}>
                      {s.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
            <form 
              className="flex-1 flex flex-col h-full bg-background/50"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Accessibility: DialogTitle and Description are required by Radix UI */}
              <div className="sr-only">
                <DialogTitle>{editingId ? "Edit" : "Add"} Connection</DialogTitle>
                <DialogDescription>Configure your data source connection parameters and discover resources.</DialogDescription>
              </div>
              
              <div className="flex-1 p-8 overflow-y-auto">
              {step === "type" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Select Source Type</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {dbConfigs.map((db) => (
                        <button
                          key={db.type}
                          onClick={() => selectType(db.type)}
                          className={cn(
                            "flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-0.5 group text-center",
                            form.type === db.type ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-border/60 hover:border-primary/40"
                          )}
                        >
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", db.color, "bg-muted/50")}>
                            <db.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{db.label}</p>
                            <p className="text-[10px] text-muted-foreground opacity-60">Standard Port {DEFAULT_PORTS[db.type]}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === "address" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Step 2: Server Address</h3>
                    <p className="text-xs text-muted-foreground mb-6">Tell us where your database server is located.</p>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-3 space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                          {form.type === "snowflake" ? "Account URL" : "Server Address (Host/IP)"}
                        </Label>
                        <Input 
                          placeholder={dbConfig.placeholder.host}
                          value={form.host}
                          onChange={(e) => setForm(p => ({...p, host: e.target.value}))}
                          className="h-10 bg-muted/20 border-border/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Port</Label>
                        <Input 
                          type="number"
                          value={form.port}
                          onChange={(e) => setForm(p => ({...p, port: parseInt(e.target.value) || 0}))}
                          className="h-10 bg-muted/20 border-border/50 text-center font-mono"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Secure Connection</p>
                          <p className="text-[10px] text-muted-foreground">Enable SSL/TLS encryption</p>
                        </div>
                      </div>
                      <Switch 
                        checked={form.ssl_enabled}
                        onCheckedChange={(v) => setForm(p => ({...p, ssl_enabled: v}))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === "auth" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Step 3: Credentials</h3>
                    <p className="text-xs text-muted-foreground mb-6">Provide access credentials to authorize the connection.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Username</Label>
                        <Input 
                          value={form.username}
                          onChange={(e) => setForm(p => ({...p, username: e.target.value}))}
                          className="h-10 bg-muted/20 border-border/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Password</Label>
                        <Input 
                          type="password"
                          value={form.password}
                          onChange={(e) => setForm(p => ({...p, password: e.target.value}))}
                          className="h-10 bg-muted/20 border-border/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === "verify" && (
                <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300 flex flex-col items-center justify-center h-full text-center">
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
                    isTesting ? "animate-pulse bg-primary/20" : (testResult?.success ? "bg-success/10 text-success" : "bg-primary/10 text-primary")
                  )}>
                    {isTesting ? <Loader2 className="w-10 h-10 animate-spin" /> : 
                     (testResult?.success ? <CheckCircle2 className="w-10 h-10" /> : <Zap className="w-10 h-10" />)}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {isTesting ? "Verifying Credentials..." : (testResult?.success ? "Verified Successfully!" : "Test Connection")}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-[280px]">
                    {testResult?.success 
                      ? "Great! We've established a bridge. Now let's discover your available resources."
                      : "We'll attempt to reach your server to confirm the host and credentials are valid."}
                  </p>
                  
                  {!testResult?.success && !isTesting && (
                    <Button 
                      onClick={handleTestAndDiscover}
                      className="mt-8 gap-2 px-8 h-12 shadow-xl shadow-primary/20"
                    >
                      <Zap className="w-4 h-4" /> Start Verification
                    </Button>
                  )}

                  {testResult?.error && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-[10px] text-destructive font-mono">
                      {testResult.error}
                    </div>
                  )}
                </div>
              )}

              {step === "warehouse" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Step 4: Compute Warehouse</h3>
                  <p className="text-xs text-muted-foreground mb-6">Select the Snowflake warehouse for resource discovery.</p>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Select Warehouse</Label>
                    <Select value={form.warehouse_name || ""} onValueChange={handleWarehouseChange}>
                      <SelectTrigger className="h-10 bg-muted/20 border-border/50">
                        <SelectValue placeholder="Choose Warehouse..." />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === "database" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Step 5: Select Database</h3>
                  <p className="text-xs text-muted-foreground mb-6">Choose the database instance you want to interface with.</p>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Select Database</Label>
                    <Select value={form.database_name || ""} onValueChange={handleDatabaseChange}>
                      <SelectTrigger className="h-10 bg-muted/20 border-border/50">
                        <SelectValue placeholder="Choose Database..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                        {databases.length > 5 && (
                          <div className="p-2 border-b border-border/40">
                            <Input 
                              placeholder="Search databases..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 text-xs bg-muted/20"
                            />
                          </div>
                        )}
                        {filteredDatabases.map(db => <SelectItem key={db} value={db}>{db}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === "schema" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Step 6: Select Schema</h3>
                  <p className="text-xs text-muted-foreground mb-6">Refine your scope to a specific schema.</p>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Select Schema</Label>
                    <Select value={form.schema_name || ""} onValueChange={handleSchemaChange}>
                      <SelectTrigger className="h-10 bg-muted/20 border-border/50">
                        <SelectValue placeholder={isLoadingResources ? "Fetching..." : "Choose Schema..."} />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                        {schemas.length > 5 && (
                          <div className="p-2 border-b border-border/40">
                            <Input 
                              placeholder="Search schemas..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 text-xs bg-muted/20"
                            />
                          </div>
                        )}
                        {filteredSchemas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === "tables" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Step 7: Table Selection</h3>
                    <p className="text-xs text-muted-foreground mb-4">Whitelisting tables for integration.</p>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input 
                      placeholder="Search tables..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-[160px] border border-border/40 rounded-xl bg-card/10 backdrop-blur-sm p-4 space-y-2 thin-scrollbar">
                    {filteredTables.map(table => (
                      <div 
                        key={table}
                        onClick={() => toggleTable(table)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border",
                          form.selected_tables?.includes(table) 
                            ? "bg-primary/10 border-primary/30 text-foreground shadow-sm" 
                            : "hover:bg-muted/30 border-transparent text-muted-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all",
                          form.selected_tables?.includes(table) ? "bg-primary border-primary scale-110" : "border-muted-foreground/30"
                        )}>
                          {form.selected_tables?.includes(table) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-xs font-bold font-mono">{table}</span>
                      </div>
                    ))}
                    {filteredTables.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
                         <Box className="w-8 h-8 mb-2" />
                         <p className="text-xs font-bold uppercase tracking-widest">No Tables {searchTerm ? "Matching Filter" : "Found"}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === "name" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Final Step: Naming</h3>
                    <p className="text-xs text-muted-foreground mb-6">Give your connection a unique name to identify it later.</p>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Display Name</Label>
                      <Input 
                        placeholder="e.g. Sales Production DB" 
                        value={form.name} 
                        onChange={(e) => setForm(p => ({...p, name: e.target.value}))}
                        className="h-10 bg-muted/20 border-border/50 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 pt-0 flex justify-end gap-3 bg-muted/5">
              <Button variant="ghost" className="text-xs font-bold" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              {step !== "type" && (
                <Button variant="outline" onClick={() => {
                   const isSnowflake = form.type === "snowflake";
                   const flow: Step[] = ["type", "address", "auth", "verify", ...(isSnowflake ? ["warehouse" as Step] : []), "database" as Step, "schema" as Step, "tables" as Step, "name" as Step];
                   const idx = flow.indexOf(step);
                   if (idx > 0) setStep(flow[idx - 1]);
                }}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
              )}

              {step === "address" && (
                <Button onClick={() => setStep("auth")} disabled={!form.host.trim()}>
                  Next: Credentials
                </Button>
              )}

              {step === "auth" && (
                <Button onClick={() => setStep("security")} disabled={!form.username.trim()}>
                  Next: Security
                </Button>
              )}

              {step === "security" && (
                <Button onClick={() => setStep("verify")}>
                  Next: Verify
                </Button>
              )}

              {step === "verify" && (
                <Button 
                  onClick={() => fetchInitialResources()} 
                  disabled={!testResult?.success || isLoadingResources}
                  className="gap-2"
                >
                  {isLoadingResources && <Loader2 className="w-4 h-4 animate-spin" />}
                  Next: Explore Resources
                </Button>
              )}

              {step === "tables" && (
                <Button onClick={() => setStep("name")}>
                  Next: Finalize
                </Button>
              )}

              {step === "name" && (
                <Button 
                  disabled={isSaving || !form.name.trim()}
                  onClick={onSave}
                  className="gap-2 px-8 h-10 shadow-lg shadow-primary/25"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Finish Setup
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
