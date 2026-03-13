import asyncio
import os
import sys

# Set up environment
os.environ['USE_MOCK_DB'] = 'true'
os.environ['ASTRA_DEBUG_MODE'] = 'true'
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import mock_db
import asyncpg
from services.pipeline_service import PipelineService

async def test():
    # Use the monkey-patched create_pool
    pool = await asyncpg.create_pool()
    service = PipelineService(pool)
    
    payload = {
        "pipeline": {"name": "Test Pipeline", "environment": "dev"},
        "nodes": [
            {"node_type": "extract", "label": "Source", "config_json": {"id": 1}},
            {"node_type": "load", "label": "Target", "config_json": {"id": 2}}
        ],
        "edges": []
    }
    
    # 1. Create
    print("Testing create_pipeline...")
    result = await service.create_pipeline(payload)
    pipeline_id = result['id']
    print(f"Created pipeline ID: {pipeline_id}")
    
    # 2. List
    print("\nTesting list_pipelines...")
    pipelines = await service.list_pipelines()
    print(f"Total pipelines: {len(pipelines)}")
    
    # 3. Get
    print("\nTesting get_pipeline...")
    p = await service.get_pipeline(pipeline_id)
    print(f"Fetched Pipeline Name: {p['name']}")
    print(f"Nodes found: {len(p['pipeline_nodes'])}")
    
    # 4. Update
    print("\nTesting update_pipeline...")
    update_payload = {
        "name": "Updated Test Pipeline",
        "nodes": [
            {"node_type": "extract", "label": "Source", "config_json": {"id": 1}, "position_x": 100, "position_y": 100},
            {"node_type": "transform", "label": "Transform", "config_json": {"id": 3}, "position_x": 300, "position_y": 100},
            {"node_type": "load", "label": "Target", "config_json": {"id": 2}, "position_x": 500, "position_y": 100}
        ]
    }
    await service.update_pipeline(pipeline_id, update_payload)
    p_updated = await service.get_pipeline(pipeline_id)
    print(f"Updated Pipeline Name: {p_updated['name']}")
    print(f"Updated Nodes count: {len(p_updated['pipeline_nodes'])}")

if __name__ == '__main__':
    asyncio.run(test())
