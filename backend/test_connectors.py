import asyncio
import os
import sys

# Ensure backend path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.postgres_connector import PostgresConnector
from core.mysql_connector import MySQLConnector
from core.mssql_connector import MSSQLConnector
from core.snowflake_connector import SnowflakeConnector

async def test_connector(name, connector_class, config):
    print(f"--- Testing {name} ---")
    try:
        conn = connector_class(config)
        # We don't expect it to actually connect, but it shouldn't crash initializing
        connected = await conn.connect()
        print(f"{name} connect() returned: {connected}")
        schema = await conn.discover_schema()
        print(f"{name} discover_schema() length: {len(schema)}")
        print(f"{name} tests OUTWARDLY passed without runtime exceptions.")
        return True
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"{name} tests FAILED with exception.")
        return False

async def run_all():
    results = {}
    
    # Minimal mock configs
    postgres_config = {
        "host": "localhost", "port": 5432, "user": "test", "password": "pwd", "database": "db"
    }
    mysql_config = {
        "host": "localhost", "port": 3306, "user": "test", "password": "pwd", "database": "db"
    }
    mssql_config = {
        "host": "localhost", "port": 1433, "user": "test", "password": "pwd", "database": "db"
    }
    snowflake_config = {
        "account": "test", "user": "test", "password": "pwd", "warehouse": "wh", "database": "db", "schema": "public"
    }
    
    results['postgres'] = await test_connector("Postgres", PostgresConnector, postgres_config)
    results['mysql'] = await test_connector("MySQL", MySQLConnector, mysql_config)
    results['mssql'] = await test_connector("MSSQL", MSSQLConnector, mssql_config)
    results['snowflake'] = await test_connector("Snowflake", SnowflakeConnector, snowflake_config)
    
    failures = [k for k, v in results.items() if not v]
    if failures:
        print(f"\nFAILED Connectors: {failures}")
        sys.exit(1)
    else:
        print("\nAll connectors passed basic runtime initialization and method calling tests.")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(run_all())
