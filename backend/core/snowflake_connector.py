import snowflake.connector
from typing import List, Dict, Any, Optional
from core.base_connector import BaseConnector

class SnowflakeConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.conn = None

    async def connect(self) -> bool:
        try:
            self.conn = snowflake.connector.connect(
                user=self.config.get("user") or self.config.get("username"),
                password=self.config.get("password"),
                account=self.config.get("host") or self.config.get("account"),
                warehouse=self.config.get("warehouse", self.config.get("database")),
                database=self.config.get("database") or self.config.get("database_name"),
                schema=self.config.get("schema", "PUBLIC")
            )
            return True
        except Exception as e:
            print(f"Snowflake connection error: {e}")
            return False

    async def disconnect(self):
        if self.conn is not None:
            try:
                self.conn.close()
            except:
                pass
            self.conn = None

    async def health_check(self) -> bool:
        if self.conn is None:
            return False
        cursor = None
        try:
            cursor = self.conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            return result is not None and result[0] == 1
        except Exception:
            return False
        finally:
            if cursor:
                cursor.close()
        return False

    async def discover_schema(self) -> List[Dict[str, Any]]:
        if self.conn is None:
            return []
        
        cursor = None
        col_cursor = None
        try:
            cursor = self.conn.cursor()
            cursor.execute("SHOW TABLES")
            rows = cursor.fetchall()
            
            tables = []
            for row in rows:
                schema_name = row[2]
                table_name = row[1]
                
                col_cursor = self.conn.cursor()
                col_cursor.execute(f'DESC TABLE "{schema_name}"."{table_name}"')
                col_rows = col_cursor.fetchall()
                
                columns = []
                for col in col_rows:
                    columns.append({
                        "name": col[0],
                        "type": col[1],
                        "nullable": col[3] == 'Y'
                    })
                
                tables.append({
                    "schema": schema_name,
                    "name": table_name,
                    "columns": columns
                })
                col_cursor.close()
                col_cursor = None
                
            return tables
        except Exception as e:
            print(f"Schema discovery error: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if col_cursor:
                col_cursor.close()
        return []

    async def read_records(self, resource_name: str, sync_mode: str, cursor_val: Optional[Any] = None) -> List[Dict[str, Any]]:
        if self.conn is None:
            return []
        
        cursor = None
        try:
            cursor = self.conn.cursor()
            # Snowflake uses double quotes for identifiers
            quoted_table = ".".join([f'"{p}"' for p in resource_name.split(".")])
            query = f"SELECT * FROM {quoted_table}"
            params = []
            
            if sync_mode == "incremental" and cursor_val:
                query += ' WHERE "id" > %s'
                params.append(cursor_val)
                
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            print(f"Snowflake read error for {resource_name}: {e}")
            return []
        finally:
            if cursor:
                cursor.close()

    async def read_chunked(self, resource_name: str, chunk_size: int, partition_config: Optional[Dict[str, Any]] = None):
        if self.conn is None:
            return

        cursor = None
        try:
            cursor = self.conn.cursor()
            quoted_table = ".".join([f'"{p}"' for p in resource_name.split(".")])
            query = f"SELECT * FROM {quoted_table}"
            params = []
            
            if partition_config:
                pk = partition_config.get('partition_key')
                start = partition_config.get('range_start')
                end = partition_config.get('range_end')
                if pk and start is not None and end is not None:
                    query += f' WHERE "{pk}" >= %s AND "{pk}" < %s'
                    params = [start, end]
            
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            while True:
                rows = cursor.fetchmany(chunk_size)
                if not rows:
                    break
                yield [dict(zip(columns, row)) for row in rows]
        finally:
            if cursor:
                cursor.close()

    async def write_records(self, resource_name: str, records: List[Dict[str, Any]]) -> bool:
        if self.conn is None or not records:
            return False
            
        cursor = None
        try:
            cursor = self.conn.cursor()
            keys = list(records[0].keys())
            quoted_table = ".".join([f'"{p}"' for p in resource_name.split(".")])
            columns = ", ".join([f'"{k}"' for k in keys])
            placeholders = ", ".join(["%s"] * len(keys))
            query = f"INSERT INTO {quoted_table} ({columns}) VALUES ({placeholders})"
            
            data = [[record[k] for k in keys] for record in records]
            cursor.executemany(query, data)
            return True
        except Exception as e:
            print(f"Snowflake write error for {resource_name}: {e}")
            return False
        finally:
            if cursor:
                cursor.close()

