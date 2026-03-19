import asyncio
import os
import uuid
import json
from mock_db import MockConnection
from mock_db import MockConnection
import os

os.environ["USE_MOCK_DB"] = "true"
os.environ["USE_TEST_MOCK_FILE"] = "true"

from mock_db import _load_store

# Manually mock the pool for the service
class MockPool:
    def acquire(self):
        return self
    async def __aenter__(self):
        return MockConnection(None)
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

async def test_pipeline_saving():
    from services.pipeline_service import PipelineService

    
    pool = MockPool()
    service = PipelineService(pool)
    
    print("Testing create_pipeline...")
    payload = {
        "pipeline": {
            "name": "Test DAG Pipeline",
            "environment": "dev",
            "description": "A test pipeline",
            "execution_mode": "DAG"
        },
        "nodes": [
            {"id": "node1", "node_type": "extract", "label": "Source", "config_json": {"table": "users"}, "position_x": 100, "position_y": 100},
            {"id": "node2", "node_type": "load", "label": "Dest", "config_json": {"table": "users_backup"}, "position_x": 300, "position_y": 100}
        ],
        "edges": [
            {"source_node_id": "node1", "target_node_id": "node2"}
        ]
    }
    
    result = await service.create_pipeline(payload)
    print(f"DEBUG: create_pipeline result: {result}")
    pipeline_id = result.get("id")
    if not pipeline_id:
        print("FAIL: create_pipeline did not return an ID")
        return
    print(f"Created pipeline with ID: {pipeline_id}")
    
    print("Verifying pipeline exists in list...")
    pipelines = await service.list_pipelines()
    found = next((p for p in pipelines if str(p["id"]) == pipeline_id), None)
    if not found:
        print("FAIL: Pipeline not found in list!")
        return
    
    print(f"SUCCESS: Found pipeline: {found['name']}, mode: {found.get('execution_mode')}")
    if found.get("execution_mode") != "DAG":
        print(f"FAIL: execution_mode is {found.get('execution_mode')}, expected DAG")
        return

    print("Testing update_pipeline...")
    update_payload = {
        "name": "Updated DAG Pipeline",
        "description": "Updated description",
        "execution_mode": "DAG",
        "nodes": payload["nodes"], # Send nodes to trigger compile_dag
        "edges": payload["edges"]
    }
    
    update_result = await service.update_pipeline(pipeline_id, update_payload)
    print(f"Updated pipeline: {update_result['name']}")
    
    # Reload to verify
    updated_p = await service.get_pipeline(pipeline_id)
    print(f"Verified name: {updated_p['name']}")
    print(f"Verified description: {updated_p['description']}")
    print(f"Verified mode: {updated_p['execution_mode']}")
    
    if updated_p['name'] == "Updated DAG Pipeline" and updated_p['execution_mode'] == "DAG":
        print("ALL TESTS PASSED!")
    else:
        print("FAIL: Verification failed")

if __name__ == "__main__":
    try:
        asyncio.run(test_pipeline_saving())
    except Exception as e:
        import traceback
        traceback.print_exc()

