import os
import uuid
import asyncpg
from typing import Dict, Any, List
from core.base_connector import BaseConnector
from core.postgres_connector import PostgresConnector
from core.snowflake_connector import SnowflakeConnector
from core.mssql_connector import MSSQLConnector
from core.mysql_connector import MySQLConnector

class CapabilityService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def detect_capabilities(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Runs a series of tests to detect database capabilities."""
        connector_type = config.get("type")
        connection_id = config.get("connection_id")
        
        # Default capabilities
        caps = {
            "supports_cdc": False,
            "supports_incremental": True,
            "supports_parallel_reads": False,
            "supports_transactions": True,
            "max_connections": 10
        }

        # Type-specific overrides/detections
        if connector_type == "postgresql":
            caps["supports_cdc"] = True
            caps["supports_parallel_reads"] = True
            caps["max_connections"] = 100
        elif connector_type == "snowflake":
            caps["supports_cdc"] = True
            caps["supports_parallel_reads"] = True
            caps["max_connections"] = 50
        elif connector_type == "mysql":
            caps["supports_cdc"] = True
            caps["max_connections"] = 150
        elif connector_type in ("mssql", "sqlserver"):
            caps["supports_cdc"] = True
            caps["max_connections"] = 100

        if connection_id:
            await self.save_capabilities(connection_id, caps)
            
        return caps

    async def save_capabilities(self, connection_id: str, caps: Dict[str, Any]):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO connection_capabilities 
                (connection_id, supports_cdc, supports_incremental, supports_parallel_reads, supports_transactions, max_connections, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (connection_id) DO UPDATE SET
                supports_cdc = EXCLUDED.supports_cdc,
                supports_incremental = EXCLUDED.supports_incremental,
                supports_parallel_reads = EXCLUDED.supports_parallel_reads,
                supports_transactions = EXCLUDED.supports_transactions,
                max_connections = EXCLUDED.max_connections,
                updated_at = NOW()
                """,
                uuid.UUID(connection_id),
                caps["supports_cdc"],
                caps["supports_incremental"],
                caps["supports_parallel_reads"],
                caps["supports_transactions"],
                caps["max_connections"]
            )

    async def get_capabilities(self, connection_id: str) -> Dict[str, Any]:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM connection_capabilities WHERE connection_id = $1", uuid.UUID(connection_id))
            return dict(row) if row else {}
