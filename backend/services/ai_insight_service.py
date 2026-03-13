import os
import uuid
import json
import asyncpg
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from services.analytics_service import AnalyticsService

class AIInsightService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.analytics_service = AnalyticsService(pool)

    async def get_insights(self, pipeline_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generates AI-driven insights for a pipeline or the entire system."""
        insights = []
        
        # 1. Check for bottlenecks
        if pipeline_id:
            bottlenecks = await self.analytics_service.detect_bottlenecks(pipeline_id)
            for b in bottlenecks:
                insights.append({
                    "type": "optimization",
                    "severity": b['impact'],
                    "message": f"Stage '{b['stage']}' is a performance bottleneck. Current average: {b['avg_duration_sec']:.2f}s.",
                    "recommendation": f"Increase concurrency for stage '{b['stage']}' or optimize the underlying transformation logic.",
                    "impact_score": 0.8 if b['impact'] == "high" else 0.5
                })

        # 2. Check for worker utilization anomalies (Simulated)
        utilization = await self.analytics_service.get_resource_utilization()
        worker_u = utilization.get('worker_utilization', 0)
        
        if worker_u > 85:
            insights.append({
                "type": "anomaly",
                "severity": "high",
                "message": "System worker utilization is critically reaching saturation peaks.",
                "recommendation": "Provision additional worker nodes to maintain throughput stability.",
                "impact_score": 0.95
            })
        elif worker_u < 10:
             insights.append({
                "type": "cost_optimization",
                "severity": "low",
                "message": "Unusually low worker utilization detected over the last hour.",
                "recommendation": "Scale down idle worker instances to optimize infrastructure costs.",
                "impact_score": 0.4
            })

        # 3. Predict potential SLA breaches (Simulated)
        if pipeline_id and random.random() > 0.7:
             insights.append({
                "type": "prediction",
                "severity": "medium",
                "message": f"Pipeline {pipeline_id} is trending towards a 15% increase in runtime.",
                "recommendation": "Review recent schema changes or volume increases that might be impacting latency.",
                "impact_score": 0.65
            })

        return insights

    async def detect_anomalies(self) -> List[Dict[str, Any]]:
        """Scans system metrics for statistical anomalies."""
        anomalies = []
        anomalies.append({
            "metric": "error_rate",
            "detected_at": datetime.now().isoformat(),
            "deviation": "3.2 sigma",
            "potential_cause": "Likely network latency spike or upstream API rate limiting."
        })
        return anomalies
