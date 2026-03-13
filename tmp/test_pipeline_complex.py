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

async def test_complex_dag():
    pool = await asyncpg.create_pool()
    service = PipelineService(pool)
    
    # Generate unique IDs for nodes
    s_id = str(uuid.uuid4())
    t_id = str(uuid.uuid4())
    l_id = str(uuid.uuid4())
    
    payload = {
        "pipeline": {"name": "Complex E2E Pipeline", "environment": "production"},
        "nodes": [
            {"id": s_id, "node_type": "extract", "label": "Snowflake Source", "config_json": {"connection_id": "conn-123", "table": "users"}},
            {"id": t_id, "node_type": "transform", "label": "Clean Data", "config_json": {"logic": "filter nulls"}},
            {"id": l_id, "node_type": "load", "label": "Postgres Target", "config_json": {"connection_id": "conn-456", "table": "dim_users"}}
        ],
        "edges": [
            {"source_node_id": s_id, "target_node_id": t_id},
            {"source_node_id": t_id, "target_node_id": l_id}
        ]
    }
    
    print("--- 1. Creating Complex Pipeline ---")
    result = await service.create_pipeline(payload)
    pid = result['id']
    print(f"Result: {result}")
    
    print("\n--- 2. Verifying Full Fetch ---")
    p = await service.get_pipeline(pid)
    print(f"Name match: {p['name'] == 'Complex E2E Pipeline'}")
    print(f"Node count: {len(p['pipeline_nodes'])} (Expected: 3)")
    print(f"Edge count: {len(p['pipeline_edges'])} (Expected: 2)")
    
    # Check node configs
    for node in p['pipeline_nodes']:
        print(f"Node {node['label']} config: {node['config_json']}")
        
    print("\n--- 3. Testing Duplicate Feature ---")
    dup_result = await service.duplicate_pipeline(pid)
    dup_id = dup_result['id']
    p_dup = await service.get_pipeline(dup_id)
    print(f"Duplicated Name: {p_dup['name']}")
    print(f"Duplicated Node count: {len(p_dup['pipeline_nodes'])}")
    
    print("\n--- 4. Testing Resource Listing ---")
    all_p = await service.list_pipelines()
    print(f"Total pipelines in mock store: {len(all_p)}")

if __name__ == '__main__':
    asyncio.run(test_complex_dag())
