import React from "react";
import { ShieldAlert, ShieldCheck, Key, Lock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Connection } from "@/types/connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SecurityTabProps {
  connection: Connection;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ connection }) => {
  const isHigh = connection.security_level === "high";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className={isHigh ? "border-primary/50" : ""}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                Security Posture
                {isHigh ? (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-yellow-500" />
                )}
              </CardTitle>
              <CardDescription>Current security configuration and level.</CardDescription>
            </div>
            <Badge variant={isHigh ? "default" : "outline"}>
              {connection.security_level?.toUpperCase() || "STANDARD"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Encryption:</span>
              <span className="text-muted-foreground">TLS 1.2 (Enforced)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Authentication:</span>
              <span className="text-muted-foreground">Vault Reference (Standard)</span>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Credentials for this connection are stored in an encrypted vault and are never stored in plain text.
            </p>
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
              <RefreshCw className="h-3.3 w-3.3" />
              Rotate Credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance & Auditing</CardTitle>
          <CardDescription>Access logs and policy enforcement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase">Last Credential Rotation</p>
            <p className="text-sm font-medium">March 07, 2026 (3 days ago)</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase">Data Protection Policy</p>
            <p className="text-sm font-medium">Enterprise Data Masking (Active)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
