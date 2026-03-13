import os
import uuid
import json
import asyncpg
import re
from typing import List, Dict, Any, Optional
from datetime import datetime

class ValidationService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_rules_for_pipeline(self, pipeline_id: str) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM validation_rules WHERE pipeline_id = $1",
                uuid.UUID(pipeline_id)
            )
            return [dict(r) for r in rows]

    async def validate_data(self, run_id: str, pipeline_id: str, sample_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Performs validation checks on a data sample against defined rules."""
        rules = await self.get_rules_for_pipeline(pipeline_id)
        results = []
        overall_status = "pass"
        
        for rule in rules:
            rule_id = rule['id']
            rule_name = rule['rule_name']
            expression = rule['rule_expression']
            severity = rule.get('severity', 'warning')
            
            rule_passed = True
            error_message = None
            
            for row in sample_data:
                if "not null" in expression.lower():
                    col = expression.split()[0]
                    if row.get(col) is None:
                        rule_passed = False
                        error_message = f"Null value found in required column '{col}'"
                        break
                elif "regex" in expression.lower():
                    parts = expression.split()
                    col = parts[0]
                    pattern = parts[2]
                    if not re.match(pattern, str(row.get(col, ""))):
                        rule_passed = False
                        error_message = f"Value in '{col}' does not match pattern {pattern}"
                        break

            status = "pass" if rule_passed else "fail"
            if status == "fail" and severity == "error":
                overall_status = "fail"
            
            results.append({
                "rule_id": str(rule_id),
                "rule_name": rule_name,
                "status": status,
                "message": error_message
            })
            
            await self._log_result(run_id, rule_id, status, error_message)

        return {
            "status": overall_status,
            "results": results,
            "timestamp": datetime.now().isoformat()
        }

    async def _log_result(self, run_id: str, rule_id: uuid.UUID, status: str, message: Optional[str]):
        async with self.pool.acquire() as conn:
            try:
                # Fixed: Added pipeline_run_id to the insert to ensure correct linkage
                await conn.execute(
                    "INSERT INTO public.validation_results (pipeline_run_id, rule_id, status, message) VALUES ($1, $2, $3, $4)",
                    uuid.UUID(str(run_id)), rule_id, status, message
                )
            except Exception as e:
                print(f"Error logging validation result: {e}")
