import os
import uuid
import asyncpg
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class AlertService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def create_alert(self, alert_type: str, pipeline_id: Optional[str], message: str, severity: str = 'medium') -> bool:
        """Triggers an enterprise alert."""
        async with self.pool.acquire() as conn:
            try:
                await conn.execute(
                    """
                    INSERT INTO public.astra_alerts (alert_type, pipeline_id, message, severity)
                    VALUES ($1, $2, $3, $4)
                    """,
                    alert_type, uuid.UUID(pipeline_id) if pipeline_id else None, message, severity
                )
                print(f"ALERT [{severity.upper()}]: {message}")
                return True
            except Exception as e:
                print(f"Error creating alert: {e}")
                return False

    async def resolve_alert(self, alert_id: str):
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.astra_alerts SET status = 'resolved' WHERE id = $1",
                uuid.UUID(alert_id)
            )

    async def get_active_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.astra_alerts WHERE status = 'open' ORDER BY created_at DESC LIMIT $1",
                limit
            )
            return [dict(r) for r in rows]

    async def check_freshness_sla(self, pipeline_id: str, threshold_hours: int = 24):
        """Checks if a pipeline has fresh data based on last successful run."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT MAX(end_time) as last_sync
                FROM public.pipeline_runs
                WHERE pipeline_id = $1 AND status = 'success'
                """,
                uuid.UUID(pipeline_id)
            )
            
            if not row or not row['last_sync']:
                return True # No runs yet
                
            last_sync = row['last_sync']
            if datetime.utcnow() - last_sync > timedelta(hours=threshold_hours):
                await self.create_alert(
                    "sla_breach", 
                    pipeline_id, 
                    f"Pipeline hasn't refreshed in {threshold_hours}h. Last sync: {last_sync}",
                    "critical"
                )
                return False
            return True

    async def _notify_slack(self, webhook_url: str, message: str):
        """Placeholder for Slack notification integration."""
        print(f"SLACK NOTIFICATION -> {webhook_url}: {message}")

    async def _notify_email(self, email: str, message: str):
        """Placeholder for Email notification integration."""
        print(f"EMAIL NOTIFICATION -> {email}: {message}")
