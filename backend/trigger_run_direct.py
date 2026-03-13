import sys
import os
import asyncio
import uuid
from datetime import datetime
import json
from dotenv import load_dotenv

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    import mock_db
except ImportError:
    pass

from core.database import db_manager
from services.pipeline_service import PipelineService
from services.worker_service import WorkerService
from dotenv import load_dotenv
import json

load_dotenv()

PIPELINE_ID = "bf21c85d-05ae-4202-a7a2-ad8cd4c9cec9"

async def trigger_run():
    # Initialize DB Pool
    await db_manager.connect()
    try:
        pipeline_service = PipelineService(db_manager.pool)
        worker_service = WorkerService(db_manager.pool)
        
        # 1. Update Pipeline with realistic task structure (direct)
        print(f"Updating pipeline {PIPELINE_ID}...")
        
        # Define the full payload for the job
        payload = {
            "source_config": {
                "host": "localhost",
                "port": 5432,
                "user": "postgres",
                "password": "password",
                "database": "test_db"
            },
            "table_name": "public.users", # Assuming this is the table to extract
            "chunk_size": 10,
            "partition_count": 2,
            "destination_config": {
                "warehouse": "ANALYTICS"
            }
        }

        # Extract relevant parts for node configuration
        source_node_config = {
            "table_name": payload["table_name"],
            "chunk_size": payload["chunk_size"],
            "partition_count": payload["partition_count"]
        }
        dest_node_config = payload["destination_config"]

        nodes = [
            {
                "id": "n1",
                "node_type": "source",
                "label": "Extract",
                "config_json": json.dumps(source_node_config)
            },
            {
                "id": "n2",
                "node_type": "load",
                "label": "Load",
                "config_json": json.dumps({
                    "target_table": "target_users_backup",
                    "dest_config": payload["destination_config"]
                })
            }
        ]
        edges = [{"source_node_id": "n1", "target_node_id": "n2"}]
        
        async with db_manager.pool.acquire() as conn:
            await conn.execute(
                "UPDATE public.pipelines SET name = $1, dag_json = $2 WHERE id = $3",
                "Direct_Trigger_Pipeline",
                json.dumps({"nodes": nodes, "edges": edges}),
                uuid.UUID(PIPELINE_ID)
            )
        
        # 2. Trigger Run
        print("Triggering run...")
        run_record = await pipeline_service.create_run(PIPELINE_ID, status="running")
        run_id = run_record["id"]
        print(f"Run triggered: {run_id}")
        
        # 3. Enqueue Job
        print("Enqueueing initial extract job...")
        await worker_service.enqueue_job(
            pipeline_id=PIPELINE_ID,
            run_id=run_id,
            stage="extract",
            payload=payload
        )
        print("Job enqueued.")
        
    finally:
        await db_manager.disconnect()

if __name__ == "__main__":
    asyncio.run(trigger_run())
