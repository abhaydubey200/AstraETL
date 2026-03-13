import os
import uuid
import asyncpg
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class SchemaService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def detect_and_version_schema(self, connection_id: str, table_name: str, current_schema: Dict[str, Any]):
        """Detects if schema has changed and creates a new version if so."""
        async with self.pool.acquire() as conn:
            # Get latest version
            last_version = await conn.fetchrow(
                """
                SELECT schema_json, version 
                FROM public.table_schema_versions 
                WHERE source_id = $1 AND table_name = $2 
                ORDER BY version DESC LIMIT 1
                """,
                uuid.UUID(connection_id), table_name
            )
            
            new_version = (last_version['version'] + 1) if last_version else 1
            is_changed = False
            
            if last_version:
                # Compare schemas
                old_schema = json.loads(last_version['schema_json']) if isinstance(last_version['schema_json'], str) else last_version['schema_json']
                if old_schema != current_schema:
                    is_changed = True
                    logger.warning(f"Schema drift detected for {table_name} in connection {connection_id}")
            else:
                is_changed = True

            if is_changed:
                await conn.execute(
                    """
                    INSERT INTO public.table_schema_versions (source_id, table_name, schema_json, version)
                    VALUES ($1, $2, $3, $4)
                    """,
                    uuid.UUID(connection_id), table_name, json.dumps(current_schema), new_version
                )
                
                # Trigger alert
                if last_version:
                    await conn.execute(
                        """
                        INSERT INTO public.astra_alerts (alert_type, message, severity)
                        VALUES ($1, $2, $3)
                        """,
                        'schema_change', f"Schema drift detected for table {table_name}. Version {new_version} created.", 'medium'
                    )
            
            return is_changed

    async def get_schema_history(self, connection_id: str, table_name: str) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM public.table_schema_versions WHERE source_id = $1 AND table_name = $2 ORDER BY version DESC",
                uuid.UUID(connection_id), table_name
            )
            return [dict(r) for r in rows]
