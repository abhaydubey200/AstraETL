import { useState } from "react";
import { useDatasets } from "@/hooks/use-pipelines";
import { Database, Search, Filter, HardDrive, Loader2, Link } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function DataCatalog() {
  const { data: datasets = [], isLoading } = useDatasets();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDatasets = datasets.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.connections?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            Enterprise Data Catalog
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Global registry of all source and destination datasets known to AstraFlow.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search datasets..." 
            className="pl-9 h-9 text-xs bg-card"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {filteredDatasets.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Database className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No datasets found</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Datasets are registered automatically when pipelines are saved.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-muted/30 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3">Dataset Name</th>
                <th className="px-5 py-3">Origin Connection</th>
                <th className="px-5 py-3">Schema Mode</th>
                <th className="px-5 py-3 text-right">First Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDatasets.map((dataset) => (
                <tr key={dataset.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">{dataset.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">{dataset.connections?.name || "Unknown"}</span>
                      {dataset.connections?.type && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">
                          {dataset.connections.type}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-muted-foreground uppercase opacity-80">
                      {dataset.schema_json?.mode || "Unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(dataset.created_at), "MMM d, yyyy")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
