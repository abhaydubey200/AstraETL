import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Activity, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isHealing: boolean;
  healed: boolean;
}

export class SelfHealingErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isHealing: false,
    healed: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isHealing: false, healed: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.attemptSelfHealing(error);
  }

  private attemptSelfHealing = async (error: Error) => {
    this.setState({ isHealing: true });
    
    try {
      // Notify backend to diagnose and fix
      const response: any = await apiClient.post("/self-healing/diagnose", {
        error_msg: error.message,
        context: "frontend_crash"
      });

      if (response.fixed) {
        this.setState({ healed: true, isHealing: false });
        // Auto-recover after 3 seconds
        setTimeout(() => {
          this.handleReset();
        }, 3000);
      } else {
        this.setState({ isHealing: false });
      }
    } catch (e) {
      console.error("Healing failed:", e);
      this.setState({ isHealing: false });
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, isHealing: false, healed: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-2 border-primary/20 shadow-2xl animate-in zoom-in duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                {this.state.isHealing ? (
                  <Activity className="w-8 h-8 text-primary animate-pulse" />
                ) : this.state.healed ? (
                  <ShieldCheck className="w-8 h-8 text-emerald-500 animate-bounce" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-2xl font-display font-bold">
                {this.state.isHealing ? "Self-Healing in Progress" : 
                 this.state.healed ? "System Repaired" : "Runtime Exception Detected"}
              </CardTitle>
              <CardDescription className="mt-2">
                {this.state.isHealing ? "AstraAI is analyzing the crash and applying automated repairs to the infrastructure." :
                 this.state.healed ? "The underlying cause has been resolved. Restarting the session..." :
                 "The application encountered an unexpected error. Our self-healing engine has been notified."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-[10px] font-mono text-muted-foreground overflow-auto max-h-32">
                {this.state.error?.stack || this.state.error?.message}
              </div>
              
              {!this.state.isHealing && !this.state.healed && (
                <div className="flex flex-col gap-2">
                  <Button onClick={this.handleReset} className="w-full gap-2 font-bold uppercase tracking-tighter">
                    <RefreshCw className="w-4 h-4" /> Manually Recover
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
                    Return to Safe Mode
                  </Button>
                </div>
              )}
              
              {this.state.isHealing && (
                <div className="space-y-2 text-center">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress-indeterminate rounded-full" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Running Infrastructure Diagnostics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
