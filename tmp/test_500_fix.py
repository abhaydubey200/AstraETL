import asyncio
import os
import sys
import uuid
import json

# Set up environment
os.environ['USE_MOCK_DB'] = 'true'
os.environ['ASTRA_DEBUG_MODE'] = 'true'
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import mock_db
import asyncpg
from services.pipeline_service import PipelineService

async def test_invalid_ids():
    pool = await asyncpg.create_pool()
    service = PipelineService(pool)
    
    invalid_id = ":1"
    
    print(f"--- Testing get_pipeline with invalid ID: {invalid_id} ---")
    try:
        p = await service.get_pipeline(invalid_id)
        print(f"Result: {p} (Expected: None)")
    except Exception as e:
        print(f"CRASHED! Error: {e}")

    print(f"\n--- Testing get_run with invalid ID: {invalid_id} ---")
    try:
        r = await service.get_run(invalid_id)
        print(f"Result: {r} (Expected: None)")
    except Exception as e:
        print(f"CRASHED! Error: {e}")

    print(f"\n--- Testing log_event with invalid IDs ---")
    try:
        await service.log_event(invalid_id, invalid_id, "test", "message")
        print("Success: log_event handled invalid IDs without crashing.")
    except Exception as e:
        print(f"CRASHED! Error: {e}")

if __name__ == '__main__':
    asyncio.run(test_invalid_ids())
