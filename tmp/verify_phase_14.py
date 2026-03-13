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
from fastapi import HTTPException

async def verify_phase_14():
    pool = await asyncpg.create_pool()
    service = PipelineService(pool)
    
    print("--- 1. Testing /pipelines/runs Accessibility ---")
    # This simulates what the router would do (literal vs placeholder)
    try:
        runs = await service.list_runs()
        print(f"list_runs: SUCCESS, count: {len(runs)}")
    except Exception as e:
        print(f"list_runs: FAILED with {str(e)}")

    print("\n--- 2. Testing validate_pipeline with Mixed Config Formats ---")
    pid = str(uuid.uuid4())
    # Manually insert a pipeline with mixed config formats in Mock DB
    mock_db._STORE["pipelines"].append({"id": pid, "name": "Crit Test", "environment": "dev"})
    mock_db._STORE["pipeline_nodes"].append({
        "id": str(uuid.uuid4()),
        "pipeline_id": pid,
        "node_type": "extract",
        "label": "Source",
        "config_json": json.dumps({"connection_id": str(uuid.uuid4())}) # Stringified
    })
    mock_db._STORE["pipeline_nodes"].append({
        "id": str(uuid.uuid4()),
        "pipeline_id": pid,
        "node_type": "load",
        "label": "Dest",
        "config_json": {"connection_id": str(uuid.uuid4())} # Direct dict
    })
    
    try:
        val_result = await service.validate_pipeline(pid)
        print(f"validate_pipeline: SUCCESS, valid: {val_result['valid']}")
    except Exception as e:
        print(f"validate_pipeline: CRASHED with {str(e)}")
        import traceback
        traceback.print_exc()

    print("\n--- 3. Testing Route Reordering Logic Simulation ---")
    # Simulation of how FastAPI router would handle /export vs /:id
    # We just need to ensure service.get_pipeline returns None (or 404 equivalent) 
    # if literal strings are passed, which we already hardened with UUID conversion.
    p = await service.get_pipeline("export")
    print(f"get_pipeline('export') returned: {p} (Expected None/404 handling)")

if __name__ == '__main__':
    asyncio.run(verify_phase_14())
