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

async def verify_mapping():
    pool = await asyncpg.create_pool()
    service = PipelineService(pool)
    
    print("--- Testing create_pipeline with frontend IDs ---")
    payload = {
        "pipeline": {"name": "Test Mapping Pipeline", "environment": "dev"},
        "nodes": [
            {"id": "n1", "node_type": "extract", "label": "Source", "config_json": {"connection_id": str(uuid.uuid4())}},
            {"id": "n2", "node_type": "load", "label": "Dest", "config_json": {"connection_id": str(uuid.uuid4())}}
        ],
        "edges": [
            {"source_node_id": "n1", "target_node_id": "n2"}
        ]
    }
    
    try:
        result = await service.create_pipeline(payload)
        print(f"create_pipeline: SUCCESS, ID: {result.get('id')}")
        
        # Verify persistence
        pipeline_details = await service.get_pipeline(result['id'])
        nodes = pipeline_details.get("pipeline_nodes", [])
        edges = pipeline_details.get("pipeline_edges", [])
        
        print(f"Nodes persisted: {len(nodes)}")
        print(f"Edges persisted: {len(edges)}")
        
        if len(edges) > 0:
            s_id = edges[0]['source_node_id']
            t_id = edges[0]['target_node_id']
            print(f"Edge mapping: {s_id} -> {t_id}")
            
            # Check if these IDs exist in nodes
            node_ids = [str(n['id']) for n in nodes]
            if str(s_id) in node_ids and str(t_id) in node_ids:
                print("ID Mapping: VERIFIED (Edge points to valid Node UUIDs)")
            else:
                print("ID Mapping: FAILED (Edge points to orphaned IDs)")
        else:
            print("Edge mapping: FAILED (No edges found)")

    except Exception as e:
        print(f"create_pipeline: CRASHED with {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(verify_mapping())
