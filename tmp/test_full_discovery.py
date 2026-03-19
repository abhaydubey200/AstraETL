import sys
import os
import asyncio
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.connection_service import ConnectionService

async def test_full_discovery():
    print("=== Production-Ready Discovery Test ===")
    
    # Mock services
    mock_pool = MagicMock()
    service = ConnectionService(mock_pool)
    service.secret_service = MagicMock()
    service.secret_service.get_secret = MagicMock(return_value=asyncio.Future())
    service.secret_service.get_secret.return_value.set_result(None)
    
    # 1. Test Snowflake (Mock Host)
    print("\n[Snowflake] Testing Database Discovery...")
    res = await service.discover_resources({"type": "snowflake", "host": "demo-account", "target": "databases"})
    print(f"Found Databases: {res.get('results')}")
    
    print("\n[Snowflake] Testing Table Discovery with context...")
    res = await service.discover_resources({"type": "snowflake", "host": "demo-account", "target": "tables", "database_name": "DS_GROUP_HR_DB"})
    tables = res.get('results', [])
    if tables:
        print(f"Total tables: {len(tables)}")
        print(f"Sample: {tables[0]}")
        if tables[0].get('database') == "DS_GROUP_HR_DB":
             print("SUCCESS: Contextual Discovery Working!")

    # 2. Test Postgres (Fallback to Mock)
    print("\n[Postgres] Testing Fallback (Real should fail, Mock should trigger)...")
    # Using a non-localhost host to trigger real connection attempt
    res = await service.discover_resources({
        "type": "postgresql", 
        "host": "non-existent-server", 
        "target": "databases",
        "username": "test",
        "password": "test",
        "database": "test"
    })
    print(f"Fallback Results: {res.get('results')}")

if __name__ == "__main__":
    os.environ["USE_MOCK_DB"] = "true"
    os.environ["REAL_EXTERNAL_CONNECTORS"] = "true" # Allow real attempts
    asyncio.run(test_full_discovery())
