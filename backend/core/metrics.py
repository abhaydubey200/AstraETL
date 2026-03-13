from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

# 1. Define Metrics
PIPELINE_RUNS_TOTAL = Counter(
    "astraflow_pipeline_runs_total",
    "Total number of pipeline runs",
    ["pipeline_id", "status"]
)

ROWS_PROCESSED_TOTAL = Counter(
    "astraflow_rows_processed_total",
    "Total rows processed across all pipelines",
    ["pipeline_id", "stage"]
)

CONNECTOR_LATENCY = Histogram(
    "astraflow_connector_latency_seconds",
    "Latency of connector operations",
    ["connector_type", "operation"]
)

ACTIVE_WORKERS = Gauge(
    "astraflow_active_workers_count",
    "Number of currently active workers"
)

STAGING_BYTES_TOTAL = Counter(
    "astraflow_staging_bytes_total",
    "Total bytes transferred to staging storage",
    ["pipeline_id", "table_name"]
)

STAGING_FILES_TOTAL = Counter(
    "astraflow_staging_files_total",
    "Total number of staging files created",
    ["pipeline_id", "table_name"]
)

BULK_LOAD_LATENCY = Histogram(
    "astraflow_bulk_load_latency_seconds",
    "Latency of warehouse bulk load operations",
    ["warehouse_type", "table_name"]
)

# 2. Metrics Endpoint Helper
def get_metrics_response():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
