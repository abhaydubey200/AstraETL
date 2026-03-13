import React, { useState } from "react";
import { Search, Database, User, Clock, Shield, Tag, Filter, ArrowRight, ExternalLink, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { cn } from "../lib/utils";

interface Dataset {
  id: string;
  dataset_name: string;
  description?: string;
  source_system: string;
  owner_name?: string;
}

export default function DataCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: datasets = [], isLoading } = useQuery<Dataset[]>({
    queryKey: ["catalog", searchQuery],
    queryFn: () => apiClient.get(`/catalog/search?q=${searchQuery}`),
    enabled: true
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Enterprise Data Catalog
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Discover, govern, and analyze datasets across your entire data ecosystem. 
          Enforce compliance and track data lineage across all pipelines.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 bg-card/50 p-4 rounded-xl border border-border shadow-sm backdrop-blur-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search datasets, columns, or descriptions..."
            className="w-full bg-background/50 border-border rounded-lg pl-10 pr-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-lg border border-border text-sm font-medium transition-colors">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Marketplace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/20 animate-pulse border border-border/50" />
          ))
        ) : datasets.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} />
        ))}
      </div>
      
      {!isLoading && datasets.length === 0 && (
        <div className="text-center py-24 bg-card/30 rounded-2xl border border-dashed border-border mt-8">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">No datasets found matching your search.</p>
        </div>
      )}
    </div>
  );
}

function DatasetCard({ dataset }: { dataset: Dataset }) {
  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex gap-2">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
              dataset.source_system === 'Snowflake' ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
            )}>
              {dataset.source_system}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold group-hover:text-primary transition-colors mb-2">{dataset.dataset_name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {dataset.description || "Enterprise dataset containing transactional records and operational metrics."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{dataset.owner_name || "Data Team"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>2h ago</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-muted/30 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-warning">
            <Shield className="w-3 h-3" />
            <span>2 PII Columns</span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>

      {/* Glass Overlay effect */}
      <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 rounded-xl transition-all pointer-events-none" />
    </div>
  );
}
