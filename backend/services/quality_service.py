import os
import uuid
import asyncpg
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class QualityService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def create_rule(self, asset_id: str, rule_type: str, column_name: Optional[str], config: Dict[str, Any]):
        """Creates a data quality rule for an asset."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO public.data_quality_rules (asset_id, rule_type, column_name, config_json)
                VALUES ($1, $2, $3, $4)
                """,
                uuid.UUID(asset_id), rule_type, column_name, json.dumps(config)
            )

    async def record_result(self, rule_id: str, run_id: str, status: str, message: str, metrics: Dict[str, Any] = {}):
        """Logs the result of a quality check execution."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO public.data_quality_results (rule_id, pipeline_run_id, status, error_message, metrics)
                VALUES ($1, $2, $3, $4, $5)
                """,
                uuid.UUID(rule_id), uuid.UUID(run_id), status, message, json.dumps(metrics)
            )

    async def get_asset_quality_history(self, asset_id: str) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT res.*, r.rule_type, r.column_name
                FROM public.data_quality_results res
                JOIN public.data_quality_rules r ON res.rule_id = r.id
                WHERE r.asset_id = $1
                ORDER BY res.created_at DESC
                """,
                uuid.UUID(asset_id)
            )
            return [dict(r) for r in rows]
