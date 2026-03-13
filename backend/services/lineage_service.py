import os
import uuid
import asyncpg
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class LineageService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def record_asset_lineage(self, source_asset_id: str, target_asset_id: str, pipeline_id: str, transformation_type: str = 'extract'):
        """Records a lineage link between two data assets (tables/views/files)."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO public.data_lineage_new (source_asset_id, target_asset_id, pipeline_id, transformation_type) "
                "VALUES ($1, $2, $3, $4)",
                uuid.UUID(source_asset_id), uuid.UUID(target_asset_id), uuid.UUID(pipeline_id), 
                transformation_type
            )

    async def get_asset_id(self, name: str, asset_type: str, source: str) -> str:
        """Helper to get or create an asset ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM public.data_assets WHERE asset_name = $1 AND asset_type = $2 AND source_type = $3",
                name, asset_type, source
            )
            if row:
                return str(row['id'])
            
            # Create new asset
            new_row = await conn.fetchrow(
                "INSERT INTO public.data_assets (asset_name, asset_type, source_type) VALUES ($1, $2, $3) RETURNING id",
                name, asset_type, source
            )
            if new_row:
                return str(new_row['id'])
            raise Exception("Failed to create or retrieve asset ID")

    async def get_pipeline_lineage(self, pipeline_id: str) -> Dict[str, Any]:
        """Returns the complete lineage graph for a pipeline."""
        async with self.pool.acquire() as conn:
            try:
                # Aggregate lineages from recent runs
                rows = await conn.fetch("""
                    SELECT DISTINCT source_node_id, target_node_id, metadata
                    FROM public.data_lineage dl
                    JOIN public.pipeline_runs pr ON dl.run_id = pr.id
                    WHERE pr.pipeline_id = $1
                """, uuid.UUID(pipeline_id))
                
                nodes = set()
                edges = []
                for r in rows:
                    nodes.add(str(r['source_node_id']))
                    nodes.add(str(r['target_node_id']))
                    edges.append({
                        "source": str(r['source_node_id']),
                        "target": str(r['target_node_id']),
                        "metadata": r['metadata']
                    })
                
                return {
                    "nodes": list(nodes),
                    "edges": edges
                }
            except Exception as e:
                return {"nodes": [], "edges": [], "error": str(e)}

    async def get_asset_impact_analysis(self, asset_id: str) -> List[str]:
        """Identifies all downstream assets impacted by a change in the given asset."""
        async with self.pool.acquire() as conn:
            # Recursive CTE to find all downstream consumers based on NEW lineage schema
            rows = await conn.fetch("""
                WITH RECURSIVE downstream AS (
                    SELECT target_asset_id FROM public.data_lineage_new WHERE source_asset_id = $1
                    UNION
                    SELECT dl.target_asset_id FROM public.data_lineage_new dl
                    JOIN downstream d ON dl.source_asset_id = d.target_asset_id
                )
                SELECT DISTINCT target_asset_id FROM downstream
            """, uuid.UUID(asset_id))
            
            return [str(r['target_asset_id']) for r in rows]
