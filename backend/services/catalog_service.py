import os
import uuid
import asyncpg
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class CatalogService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def register_dataset(self, name: str, source_system: str, owner_id: str, description: str = "") -> str:
        """Adds a new dataset to the enterprise catalog."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO public.catalog_datasets (dataset_name, source_system, owner, description)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (dataset_name, source_system) DO UPDATE SET updated_at = NOW(), description = $4
                RETURNING id
                """,
                name, source_system, uuid.UUID(owner_id), description
            )
            if row:
                return str(row['id'])
            raise Exception("Dataset registration failed")

    async def add_columns(self, dataset_id: str, columns: List[Dict[str, Any]]):
        """Indexes columns for a dataset in the catalog."""
        async with self.pool.acquire() as conn:
            for col in columns:
                await conn.execute(
                    """
                    INSERT INTO public.catalog_columns (dataset_id, column_name, data_type, description, sensitivity_level)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (dataset_id, column_name) DO UPDATE SET data_type = $3, sensitivity_level = $5
                    """,
                    uuid.UUID(dataset_id), col['name'], col['type'], col.get('description'), col.get('sensitivity', 'internal')
                )

    async def search_catalog(self, query: str) -> List[Dict[str, Any]]:
        """Search for datasets and columns in the enterprise catalog."""
        async with self.pool.acquire() as conn:
            try:
                rows = await conn.fetch(
                    """
                    SELECT DISTINCT d.id, d.dataset_name, d.description, d.source_system, d.owner
                    FROM public.catalog_datasets d
                    LEFT JOIN public.catalog_columns c ON d.id = c.dataset_id
                    WHERE d.dataset_name ILIKE $1 
                       OR d.description ILIKE $1 
                       OR c.column_name ILIKE $1
                    ORDER BY d.dataset_name ASC
                    """,
                    f"%{query}%"
                )
                return [dict(r) for r in rows]
            except Exception as e:
                return []

    async def get_dataset_detail(self, dataset_id: str) -> Dict[str, Any]:
        """Fetches detailed metadata, schema, and owner info for a dataset."""
        async with self.pool.acquire() as conn:
            # 1. Get basic dataset info
            row = await conn.fetchrow(
                "SELECT * FROM public.catalog_datasets WHERE id = $1",
                uuid.UUID(dataset_id)
            )
            if not row:
                return {}
            
            ds = dict(row)

            # 2. Get columns
            cols = await conn.fetch(
                "SELECT * FROM public.catalog_columns WHERE dataset_id = $1 ORDER BY column_name",
                uuid.UUID(dataset_id)
            )

            return {
                **ds,
                "columns": [dict(c) for c in cols],
                "last_sync": ds["updated_at"].isoformat() if ds.get("updated_at") else None
            }
