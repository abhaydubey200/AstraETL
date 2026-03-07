import { useState } from "react";
import { Search, Filter, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, XCircle, Terminal } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

interface TaskLog {
  id: string;
  task: string;
  status: "success" | "running" | "failed" | "pending";
  startTime: string;
  duration: string;
  rows: string;
  logs: string[];
}

interface PipelineRun {
  id: string;
  pipelineName: string;
  status: "success" | "running" | "failed" | "pending";
  startTime: string;
  duration: string;
  rows: string;
  tasks: TaskLog[];
}

const mockRuns: PipelineRun[] = [
  {
    id: "RUN-2847",
    pipelineName: "Sales MSSQL → Snowflake",
    status: "success",
    startTime: "2026-03-07 14:32:00",
    duration: "4m 32s",
    rows: "1,234,567",
    tasks: [
      { id: "t1", task: "Extract from MSSQL", status: "success", startTime: "14:32:00", duration: "1m 12s", rows: "1,234,567", logs: ["Connected to sql-prod-01.corp.net", "Executing: SELECT * FROM dbo.orders WHERE updated_at > '2026-03-07 14:00:00'", "Extracted 1,234,567 rows", "Writing to staging: s3://astra-staging/orders/batch_2847.parquet"] },
      { id: "t2", task: "Spark Transform", status: "success", startTime: "14:33:12", duration: "1m 45s", rows: "1,230,102", logs: ["Spark session initialized", "Reading parquet from staging", "Applying dropDuplicates()", "Applying filter(amount > 0)", "Schema mapping complete", "Output: 1,230,102 rows"] },
      { id: "t3", task: "Validate Data", status: "success", startTime: "14:34:57", duration: "0m 22s", rows: "1,230,102", logs: ["Row count validation: PASS (1,230,102)", "Null check on order_id: PASS", "Schema validation: PASS", "Duplicate detection: PASS (0 duplicates)"] },
      { id: "t4", task: "Load to Snowflake", status: "success", startTime: "14:35:19", duration: "1m 13s", rows: "1,230,102", logs: ["Uploading to @ASTRA_STAGE/orders/", "COPY INTO analytics.orders FROM @ASTRA_STAGE/orders/ FILE_FORMAT = (TYPE = PARQUET)", "Loaded 1,230,102 rows", "Warehouse: COMPUTE_WH"] },
    ],
  },
  {
    id: "RUN-2846",
    pipelineName: "Inventory CDC Pipeline",
    status: "running",
    startTime: "2026-03-07 14:30:00",
    duration: "—",
    rows: "340,210",
    tasks: [
      { id: "t1", task: "CDC Extract", status: "success", startTime: "14:30:00", duration: "0m 45s", rows: "340,210", logs: ["Reading transaction log", "CDC offset: LSN 0x00000025:00000048:0003", "Captured 340,210 changes"] },
      { id: "t2", task: "Transform", status: "running", startTime: "14:30:45", duration: "—", rows: "—", logs: ["Processing change events...", "Applying upsert logic..."] },
      { id: "t3", task: "Load", status: "pending", startTime: "—", duration: "—", rows: "—", logs: [] },
    ],
  },
  {
    id: "RUN-2845",
    pipelineName: "Product Catalog Sync",
    status: "failed",
    startTime: "2026-03-07 14:10:00",
    duration: "1m 12s",
    rows: "0",
    tasks: [
      { id: "t1", task: "Extract from MySQL", status: "success", startTime: "14:10:00", duration: "0m 32s", rows: "45,000", logs: ["Connected to mysql-prod.corp.net", "Extracted 45,000 rows"] },
      { id: "t2", task: "Transform", status: "failed", startTime: "14:10:32", duration: "0m 40s", rows: "0", logs: ["ERROR: Column 'product_category' not found in source schema", "Schema mismatch detected", "Transformation aborted", "Stack trace: SchemaValidationError at transform.py:142"] },
    ],
  },
  {
    id: "RUN-2844",
    pipelineName: "Financial Reports ETL",
    status: "success",
    startTime: "2026-03-07 02:00:00",
    duration: "7m 45s",
    rows: "2,100,000",
    tasks: [
      { id: "t1", task: "Extract", status: "success", startTime: "02:00:00", duration: "2m 10s", rows: "2,100,000", logs: ["Full table extraction", "2,100,000 rows extracted"] },
      { id: "t2", task: "Transform", status: "success", startTime: "02:02:10", duration: "3m 15s", rows: "2,098,500", logs: ["Aggregations complete", "1,500 duplicates removed"] },
      { id: "t3", task: "Validate", status: "success", startTime: "02:05:25", duration: "0m 20s", rows: "2,098,500", logs: ["All validation checks passed"] },
      { id: "t4", task: "Load", status: "success", startTime: "02:05:45", duration: "2m 00s", rows: "2,098,500", logs: ["Loaded to analytics.financial_reports"] },
    ],
  },
];

const ExecutionLogs = () => {
  const [expandedRun, setExpandedRun] = useState<string | null>("RUN-2847");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = filterStatus === "all" ? mockRuns : mockRuns.filter((r) => r.status === filterStatus);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Execution Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline run history and task-level logs</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search runs..." className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
          {["all", "success", "running", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn("px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize", filterStatus === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Runs */}
      <div className="space-y-2">
        {filtered.map((run) => (
          <div key={run.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors text-left"
            >
              {expandedRun === run.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{run.pipelineName}</span>
                  <span className="text-xs text-muted-foreground font-display">{run.id}</span>
                </div>
              </div>
              <StatusBadge status={run.status} />
              <span className="text-xs text-muted-foreground font-display w-16 text-right">{run.duration}</span>
              <span className="text-xs text-muted-foreground w-24 text-right">{run.rows} rows</span>
              <span className="text-xs text-muted-foreground w-36 text-right">{run.startTime}</span>
            </button>

            {expandedRun === run.id && (
              <div className="border-t border-border px-5 py-3 space-y-2 bg-muted/5">
                {run.tasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-border bg-card overflow-hidden">
                    <button
                      onClick={() => setExpandedTask(expandedTask === `${run.id}-${task.id}` ? null : `${run.id}-${task.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
                    >
                      {task.status === "success" ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : task.status === "running" ? <Clock className="w-3.5 h-3.5 text-primary animate-pulse-glow" /> : task.status === "failed" ? <XCircle className="w-3.5 h-3.5 text-destructive" /> : <Clock className="w-3.5 h-3.5 text-warning" />}
                      <span className="text-xs font-medium text-foreground flex-1">{task.task}</span>
                      <span className="text-[10px] text-muted-foreground font-display">{task.duration}</span>
                      <span className="text-[10px] text-muted-foreground">{task.rows} rows</span>
                      <Terminal className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {expandedTask === `${run.id}-${task.id}` && task.logs.length > 0 && (
                      <div className="border-t border-border bg-background px-4 py-2 space-y-0.5">
                        {task.logs.map((log, i) => (
                          <p key={i} className={cn("text-[11px] font-display leading-relaxed", log.startsWith("ERROR") ? "text-destructive" : "text-muted-foreground")}>
                            <span className="text-muted-foreground/50 mr-2">{task.startTime}</span>
                            {log}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExecutionLogs;
