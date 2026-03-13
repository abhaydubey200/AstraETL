import asyncpg
from typing import List, Dict, Any, Optional
from core.base_connector import BaseConnector

class PostgresConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        super(PostgresConnector, self).__init__(config)
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self) -> bool:
        try:
            database = self.config.get("database") or self.config.get("database_name") or "postgres"
            user = self.config.get("user") or self.config.get("username")
            port = int(self.config.get("port") or 5432)
            ssl = self.config.get("ssl") or self.config.get("ssl_enabled", False)
            
            self.pool = await asyncpg.create_pool(
                host=self.config.get("host"),
                port=port,
                user=user,
                password=self.config.get("password"),
                database=database,
                ssl='require' if ssl else False
            )
            return True
        except Exception as e:
            print(f"Postgres connection error for {self.config.get('host')}: {e}")
            return False

    async def health_check(self) -> bool:
        if self.pool is None:
            return False
        try:
            async with self.pool.acquire() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception:
            return False

    async def discover_schema(self) -> List[Dict[str, Any]]:
        if self.pool is None:
            return []
        
        query = """
        SELECT 
            c.table_schema as schema,
            c.table_name as name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            reals.reltuples::bigint as row_count_estimate,
            pg_total_relation_size('"' || c.table_schema || '"."' || c.table_name || '"') as table_size
        FROM information_schema.columns c
        JOIN pg_class reals ON reals.relname = c.table_name
        JOIN pg_namespace ns ON ns.oid = reals.relnamespace AND ns.nspname = c.table_schema
        WHERE c.table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY c.table_schema, c.table_name, c.ordinal_position;
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
            
        tables: Dict[str, Any] = {}
        for row in rows:
            table_key = f"{row['schema']}.{row['name']}"
            if table_key not in tables:
                tables[table_key] = {
                    "schema": row["schema"],
                    "name": row["name"],
                    "row_count_estimate": row.get("row_count_estimate", 0),
                    "table_size": row.get("table_size", 0),
                    "columns": []
                }
            tables[table_key]["columns"].append({
                "name": row["column_name"],
                "type": row["data_type"],
                "nullable": row["is_nullable"] == "YES"
            })
            
        return list(tables.values())

    async def read_records(self, table_name: str, sync_mode: str, cursor: Optional[Any] = None) -> List[Dict[str, Any]]:
        if self.pool is None:
            return []
            
        # Strict identifier quoting to prevent injection
        quoted_table = ".".join([f'"{p}"' for p in table_name.split(".")])
        query = f"SELECT * FROM {quoted_table}"
        params = []
        
        if sync_mode == "incremental" and cursor:
            query += " WHERE id > $1"
            params.append(cursor)
            
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Postgres read error for {table_name}: {e}")
            return []

    async def write_records(self, table_name: str, records: List[Dict[str, Any]]) -> bool:
        if self.pool is None or not records:
            return False
            
        keys = list(records[0].keys())
        # Quote columns and table
        quoted_table = ".".join([f'"{p}"' for p in table_name.split(".")])
        columns = ", ".join([f'"{k}"' for k in keys])
        placeholders = ", ".join([f"${i+1}" for i in range(len(keys))])
        query = f"INSERT INTO {quoted_table} ({columns}) VALUES ({placeholders})"
        
        try:
            async with self.pool.acquire() as conn:
                async with conn.transaction():
                    # For performance and safety, use executemany
                    data = [[record[k] for k in keys] for record in records]
                    await conn.executemany(query, data)
            return True
        except Exception as e:
            print(f"Postgres write error for {table_name}: {e}")
            return False

    async def read_chunked(self, table_name: str, chunk_size: int, partition_config: Optional[Dict[str, Any]] = None):
        if self.pool is None:
            return
            
        quoted_table = ".".join([f'"{p}"' for p in table_name.split(".")])
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                query = f"SELECT * FROM {quoted_table}"
                params = []
                if partition_config:
                    pk = partition_config.get('partition_key')
                    start = partition_config.get('range_start')
                    end = partition_config.get('range_end')
                    if pk and start is not None and end is not None:
                        # Quote partition key
                        query += f" WHERE \"{pk}\" >= $1 AND \"{pk}\" < $2"
                        params = [start, end]
                
                # Use a server-side cursor for large datasets
                cur = await conn.cursor(query, *params)
                while True:
                    rows = await cur.fetch(chunk_size)
                    if not rows:
                        break
                    yield [dict(row) for row in rows]

    async def disconnect(self):
        if self.pool is not None:
            await self.pool.close()
            self.pool = None
