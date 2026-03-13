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

async def final_check():
    pool = await asyncpg.create_pool()
    service = PipelineService(pool)
    
    print("--- 1. Testing GET /pipelines/ (List) ---")
    all_p = await service.list_pipelines()
    print(f"Pipelines found: {len(all_p)}")

    print("\n--- 2. Testing valid log_event ---")
    pid = str(uuid.uuid4())
    rid = str(uuid.uuid4())
    await service.log_event(rid, pid, "verify", "Final health check", level='INFO')
    print("log_event: SUCCESS")

    print("\n--- 3. Testing invalid UUID behavior (No crash) ---")
    p_invalid = await service.get_pipeline(":1")
    print(f"Invalid pipeline lookup returned: {p_invalid}")

if __name__ == '__main__':
    asyncio.run(final_check())
