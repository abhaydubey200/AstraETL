import os
import psutil
import asyncpg
from typing import List, Dict, Any
from datetime import datetime, timedelta

class MonitoringService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_system_metrics(self) -> Dict[str, Any]:
        """Returns real-time system resource metrics."""
        # Using psutil for actual system stats
        cpu_usage = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        
        return {
            "cpu_usage": cpu_usage,
            "memory_usage": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_worker_status(self) -> List[Dict[str, Any]]:
        """Returns status of worker cluster."""
        # Mocking worker nodes for the UI
        return [
            {"id": "worker-1", "status": "healthy", "tasks": 4, "uptime": "14h 20m"},
            {"id": "worker-2", "status": "healthy", "tasks": 2, "uptime": "8h 12m"},
            {"id": "worker-3", "status": "restarting", "tasks": 0, "uptime": "2m"},
        ]

    async def get_pipeline_execution_metrics(self) -> Dict[str, Any]:
        """Aggregates execution stats for the monitoring dashboard."""
        async with self.pool.acquire() as conn:
            # Stats for last 24h
            cutoff = datetime.utcnow() - timedelta(hours=24)
            
            rows = await conn.fetch(
                """
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'success') as success,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    COUNT(*) FILTER (WHERE status = 'running') as running,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    SUM(rows_processed) as total_rows,
                    AVG(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000) as avg_duration_ms
                FROM public.pipeline_runs
                WHERE start_time > $1
                """,
                cutoff
            )
            
            stats = rows[0]
            if not stats:
                return {
                    "totalRuns": 0, "successRate": 100, "avgDurationMs": 0,
                    "totalRows": 0, "queuePending": 0, "runningCount": 0,
                }
                
            success_rate = (stats['success'] / stats['total'] * 100) if stats['total'] > 0 else 100
            
            return {
                "totalRuns": stats['total'],
                "successRate": round(success_rate, 1),
                "avgDurationMs": round(stats['avg_duration_ms'] or 0),
                "totalRows": stats['total_rows'] or 0,
                "queuePending": stats['pending'],
                "runningCount": stats['running'],
            }

    async def get_throughput_series(self, metric_type: str = 'rows_per_second', limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves time-series metrics for charts."""
        async with self.pool.acquire() as conn:
            try:
                rows = await conn.fetch(
                    """
                    SELECT recorded_at, metric_value
                    FROM public.system_metrics
                    WHERE metric_type = $1
                    ORDER BY recorded_at DESC
                    LIMIT $2
                    """,
                    metric_type, limit
                )
                return [dict(r) for r in rows]
            except Exception:
                return []
