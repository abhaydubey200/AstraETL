import React from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConnectionCapabilities } from "@/types/connection";

interface CapabilityViewProps {
  capabilities?: ConnectionCapabilities;
}

export const CapabilityView: React.FC<CapabilityViewProps> = ({ capabilities }) => {
  if (!capabilities) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Info className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>Capability data not yet detected for this connection.</p>
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: "CDC Supported", value: capabilities.supports_cdc, description: "Change Data Capture for real-time synchronization." },
    { label: "Parallel Reads", value: capabilities.supports_parallel_reads, description: "Extract data in parallel for high throughput." },
    { label: "Transactions", value: capabilities.supports_transactions, description: "Support for ACID transactions during extraction." },
    { label: "Incremental Sync", value: capabilities.supports_incremental, description: "Extract only changed records using watermarks." },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Connection Capabilities</CardTitle>
          <CardDescription>Enterprise features detected for this data source.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-start space-x-3">
              {item.value ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-muted-foreground/50" />
              )}
              <div>
                <p className="font-medium text-sm leading-none">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resource Limits</CardTitle>
          <CardDescription>Configured limits for this connection.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Max Parallel Connections</span>
              <span className="text-sm text-primary font-bold">{capabilities.max_connections}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              * Higher parallel connections increase throughput but may impact source DB performance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
