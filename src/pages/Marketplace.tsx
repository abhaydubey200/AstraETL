import React, { useState } from "react";
import { 
  Search, Grid, List as ListIcon, 
  Database, Share2, Cloud, Shield, 
  Zap, ArrowRight, CheckCircle2, 
  Download, Filter, Info, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CONNECTORS = [
  { id: "snowflake", name: "Snowflake", icon: Cloud, category: "warehouse", description: "Native high-speed loading with stage support.", installed: true, rating: 4.9 },
  { id: "postgres", name: "PostgreSQL", icon: Database, category: "database", description: "Full CDC and bulk load support.", installed: true, rating: 4.8 },
  { id: "salesforce", name: "Salesforce", icon: Cloud, category: "saas", description: "Sync accounts, leads, and custom objects.", installed: false, rating: 4.7 },
  { id: "mongodb", name: "MongoDB", icon: Database, category: "database", description: "Document-to-relational auto-mapping.", installed: false, rating: 4.5 },
  { id: "stripe", name: "Stripe", icon: Zap, category: "saas", description: "Financial data extraction and aggregation.", installed: false, rating: 4.9 },
  { id: "bigquery", name: "Google BigQuery", icon: Cloud, category: "warehouse", description: "Serverless data warehouse integration.", installed: false, rating: 4.8 },
  { id: "mysql", name: "MySQL", icon: Database, category: "database", description: "Optimized binary log extraction.", installed: true, rating: 4.6 },
  { id: "s3", name: "Amazon S3", icon: Share2, category: "storage", description: "Parquet, CSV, and JSON file ingestion.", installed: true, rating: 4.9 },
];

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filtered = CONNECTORS.filter(c => 
    (selectedCategory === "all" || c.category === selectedCategory) &&
    (c.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold">Connector Marketplace</h1>
          <p className="text-sm text-muted-foreground">Discover and install pre-built integrations for your data stack.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-96">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search 200+ connectors..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted/30 border-border/50 focus:ring-primary/20" 
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Star className="w-5 h-5" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Certified</p>
                <p className="text-xs font-bold">Premium Quality</p>
             </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3">Categories</h4>
            <div className="space-y-1">
              {["all", "database", "warehouse", "saas", "storage", "ai"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all",
                    selectedCategory === cat ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Available Connectors ({filtered.length})
            </p>
            <div className="flex border border-border rounded-lg overflow-hidden">
               <button className="p-2 bg-muted hover:bg-muted/80 transition-colors"><Grid className="w-4 h-4" /></button>
               <button className="p-2 hover:bg-muted transition-colors border-l border-border"><ListIcon className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((connector) => (
              <ConnectorCard key={connector.id} connector={connector} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectorCard({ connector }: any) {
  return (
    <Card className="group border-border/50 hover:border-primary/50 transition-all shadow-sm overflow-hidden flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-muted/50 rounded-2xl group-hover:bg-primary/10 transition-colors">
            <connector.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          {connector.installed ? (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none">Installed</Badge>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
              <Star className="w-3 h-3 fill-current" />
              {connector.rating}
            </div>
          )}
        </div>
        <CardTitle className="text-lg font-bold">{connector.name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed mt-2 min-h-[40px]">{connector.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-2 mt-2">
           <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Source</Badge>
           <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Destination</Badge>
           <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">AES-256</Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
        <Button 
          variant={connector.installed ? "outline" : "default"} 
          className={cn("w-full text-xs h-9 font-bold", !connector.installed && "shadow-lg shadow-primary/20")}
        >
          {connector.installed ? "Configure" : "Install Connector"}
          {!connector.installed && <ArrowRight className="w-3.5 h-3.5 ml-2" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
