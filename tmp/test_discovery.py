import sys
import os
import asyncio
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.connection_service import ConnectionService

async def test_structured_discovery():
    print("Testing Database-Centric Structured Discovery...")
    
    # Mock pool and services
    mock_pool = MagicMock()
    service = ConnectionService(mock_pool)
    service.secret_service = MagicMock()
    service.secret_service.get_secret = MagicMock(return_value=asyncio.Future())
    service.secret_service.get_secret.return_value.set_result(None)
    
    # Test Snowflake Database Discovery
    print("\n[Snowflake] fetching databases...")
    config_sn = {"type": "snowflake", "host": "demo", "target": "databases"}
    res_sn_db = await service.discover_resources(config_sn)
    databases = res_sn_db.get("results", [])
    print(f"Databases: {databases}")

    # Test Snowflake Table Discovery for a specific DB
    print("\n[Snowflake] fetching tables in 'DS_GROUP_HR_DB'...")
    config_sn_tables = {"type": "snowflake", "host": "demo", "target": "tables", "database_name": "DS_GROUP_HR_DB"}
    res_sn_tables = await service.discover_resources(config_sn_tables)
    tables = res_sn_tables.get("results", [])
    if tables and isinstance(tables[0], dict):
        print(f"Sample table: {tables[0]}")
        print("Success: Snowflake returned structured table data!")
    else:
        print(f"Failure: Expected list of dicts, got {type(tables[0]) if tables else 'empty'}")

    # Test Postgres Table Discovery
    print("\n[Postgres] fetching tables in 'customer_data'...")
    config_pg = {"type": "postgresql", "host": "localhost", "target": "tables", "database_name": "customer_data"}
    res_pg = await service.discover_resources(config_pg)
    pg_tables = res_pg.get("results", [])
    if pg_tables and isinstance(pg_tables[0], dict):
        print(f"Sample PG table: {pg_tables[0]}")
    else:
         print(f"Failure: PG returned {type(pg_tables[0]) if pg_tables else 'empty'}")

if __name__ == "__main__":
    os.environ["USE_MOCK_DB"] = "true"
    os.environ["REAL_EXTERNAL_CONNECTORS"] = "false"
    asyncio.run(test_structured_discovery())
