import os
import uuid
import json
import asyncpg
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class AnalyticsService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_performance_trends(self, pipeline_id: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
        """Aggregates metrics to show performance trends over time."""
        async with self.pool.acquire() as conn:
            start_time = datetime.now() - timedelta(hours=hours)
            
            query = """
                SELECT 
                    metric_name,
                    date_trunc('hour', recorded_at) as bucket,
                    AVG(metric_value) as avg_value,
                    MAX(metric_value) as max_value,
                    COUNT(*) as sample_count
                FROM system_metrics
                WHERE recorded_at >= $1
            """
            params = [start_time]
            
            if pipeline_id:
                query += " AND (dimensions->>'pipeline_id' = $2)"
                params.append(pipeline_id)
                
            query += " GROUP BY metric_name, bucket ORDER BY bucket ASC"
            
            rows = await conn.fetch(query, *params)
            
            trends = {}
            for row in rows:
                m_name = row['metric_name']
                if m_name not in trends:
                    trends[m_name] = []
                
                trends[m_name].append({
                    "timestamp": row['bucket'].isoformat(),
                    "avg": float(row['avg_value']),
                    "max": float(row['max_value']),
                    "samples": row['sample_count']
                })
                
            return trends

    async def get_resource_utilization(self) -> Dict[str, Any]:
        """Analyzes worker and queue utilization trends."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT metric_name, AVG(metric_value) as val 
                FROM system_metrics 
                WHERE recorded_at >= NOW() - INTERVAL '1 hour'
                GROUP BY metric_name
            """)
            
            return {r['metric_name']: float(r['val']) for r in rows}

    async def detect_bottlenecks(self, pipeline_id: str) -> List[Dict[str, Any]]:
        """Identifies stages that are significantly slower than historical averages."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    stage,
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration
                FROM astra_worker_queue
                WHERE pipeline_id = $1 AND status = 'completed'
                GROUP BY stage
                ORDER BY avg_duration DESC
            """, uuid.UUID(pipeline_id))
            
            bottlenecks = []
            if rows:
                max_dur = rows[0]['avg_duration']
                for r in rows:
                    if r['avg_duration'] > max_dur * 0.7:
                        bottlenecks.append({
                            "stage": r['stage'],
                            "avg_duration_sec": r['avg_duration'],
                            "impact": "high" if r['avg_duration'] == max_dur else "medium"
                        })
            
            return bottlenecks
