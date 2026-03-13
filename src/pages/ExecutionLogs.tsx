import { useState } from "react";
import { Search, ChevronDown, ChevronRight, CheckCircle, Clock, XCircle, Terminal, Download, Calendar, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { usePipelineRuns, useExecutionLogs } from "@/hooks/use-executions";
import { usePipelines } from "@/hooks/use-pipelines";
import type { ExecutionLog } from "@/types/execution";


const ExecutionLogs = () => {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");

  const runsFilter: any = {};
  if (filterStatus !== "all") runsFilter.status = filterStatus;
  if (dateRange === "today") runsFilter.from = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  else if (dateRange === "7d") runsFilter.from = new Date(Date.now() - 7 * 86400000).toISOString();
  else if (dateRange === "30d") runsFilter.from = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: runs = [], isLoading: runsLoading } = usePipelineRuns(runsFilter);
  const { data: pipelines = [] } = usePipelines();

  // Fetch logs for expanded run
  const { data: expandedLogs = [] } = useExecutionLogs({ runId: expandedRun || undefined });


  const getPipelineName = (pipelineId: string) =>
    pipelines.find((p) => p.id === pipelineId)?.name || "Unknown Pipeline";

  const filteredRuns = runs.filter((r) =>
    getPipelineName(r.pipeline_id).toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "—";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const formatRows = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
  };

  // Group logs by stage
  const logsByStage = expandedLogs.reduce<Record<string, ExecutionLog[]>>((acc, log) => {
    if (!acc[log.stage]) acc[log.stage] = [];
    acc[log.stage].push(log);
    return acc;
  }, {});

  const stageOrder = ["extract", "transform", "load"];
  const stages = stageOrder.filter((s) => logsByStage[s]);

  const handleExportCSV = () => {
    const headers = "Run ID,Pipeline,Status,Start Time,End Time,Rows Processed\n";
    const rows = filteredRuns.map((r) =>
      `${r.id},${getPipelineName(r.pipeline_id)},${r.status},${r.start_time},${r.end_time || ""},${r.rows_processed}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "execution-logs.csv";
    a.click();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Execution Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline run history and task-level logs</p>
        </div>
        <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by pipeline or run ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
          {["all", "success", "running", "failed"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={cn("px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize", filterStatus === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="text-xs text-muted-foreground bg-transparent focus:outline-none">
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {runsLoading ? (
        <div className="rounded-lg border border-border bg-card p-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center text-center">
          <Terminal className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-display font-semibold text-foreground">No execution logs found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {runs.length === 0 ? "Run a pipeline to see execution logs here." : "No logs match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRuns.map((run) => (
            <div key={run.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors text-left"
              >
                {expandedRun === run.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{getPipelineName(run.pipeline_id)}</span>
                    <span className="text-xs text-muted-foreground font-display">{run.id.slice(0, 8)}</span>
                  </div>
                </div>
                <StatusBadge status={run.status as any} />
                <span className="text-xs text-muted-foreground font-display w-16 text-right">{formatDuration(run.start_time, run.end_time)}</span>
                <span className="text-xs text-muted-foreground w-24 text-right">{formatRows(run.rows_processed)} rows</span>
                <span className="text-xs text-muted-foreground w-36 text-right">{new Date(run.start_time).toLocaleString()}</span>
              </button>

              {expandedRun === run.id && (
                <div className="border-t border-border px-5 py-3 space-y-2 bg-muted/5">
                  {stages.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No task-level logs recorded for this run.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 mb-3 pl-2">
                        {stages.map((stage, i) => {
                          const hasError = logsByStage[stage]?.some((l) => l.log_level === "ERROR");
                          return (
                            <div key={stage} className="flex items-center gap-1">
                              <div className={cn("w-2 h-2 rounded-full", hasError ? "bg-destructive" : "bg-success")} />
                              <span className="text-[10px] text-muted-foreground capitalize">{stage}</span>
                              {i < stages.length - 1 && <div className="w-6 h-px bg-border" />}
                            </div>
                          );
                        })}
                      </div>

                      {stages.map((stage) => (
                        <div key={stage} className="rounded-md border border-border bg-card overflow-hidden">
                          <button
                            onClick={() => setExpandedTask(expandedTask === `${run.id}-${stage}` ? null : `${run.id}-${stage}`)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
                          >
                            {logsByStage[stage]?.some((l) => l.log_level === "ERROR")
                              ? <XCircle className="w-3.5 h-3.5 text-destructive" />
                              : <CheckCircle className="w-3.5 h-3.5 text-success" />
                            }
                            <span className="text-xs font-medium text-foreground flex-1 capitalize">{stage}</span>
                            <span className="text-[10px] text-muted-foreground">{logsByStage[stage]?.length} entries</span>
                            <Terminal className="w-3 h-3 text-muted-foreground" />
                          </button>
                          {expandedTask === `${run.id}-${stage}` && (
                            <div className="border-t border-border bg-background px-4 py-2 space-y-0.5 max-h-40 overflow-y-auto">
                              {logsByStage[stage]?.map((log) => (
                                <p key={log.id} className={cn("text-[11px] font-display leading-relaxed", log.log_level === "ERROR" ? "text-destructive" : log.log_level === "WARN" ? "text-warning" : "text-muted-foreground")}>
                                  <span className="text-muted-foreground/50 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                  <span className={cn("mr-2 font-semibold", log.log_level === "ERROR" ? "text-destructive" : log.log_level === "WARN" ? "text-warning" : "text-muted-foreground/70")}>
                                    {log.log_level === "ERROR" ? "ERR" : log.log_level === "WARN" ? "WRN" : log.log_level === "DEBUG" ? "DBG" : "INF"}
                                  </span>
                                  {log.message}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {run.error_message && (
                    <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5">
                      <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5" />
                      <span className="text-xs text-destructive">{run.error_message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExecutionLogs;
