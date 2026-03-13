import asyncio
import uuid
import os

from services.worker_service import WorkerService

# Use Mock DB for testing
os.environ["USE_MOCK_DB"] = "true"
import mock_db

async def test_worker_stages():
    pool = mock_db.MockPool({})
    worker = WorkerService(pool)
    
    print("--- Testing Extract Stage ---")
    extract_job = {
        "id": str(uuid.uuid4()),
        "pipeline_id": str(uuid.uuid4()),
        "run_id": str(uuid.uuid4()),
        "stage": "extract",
        "payload": {"table_name": "public.test_data", "source_config": {"type": "postgres"}}
    }
    try:
        await worker.process_job(extract_job)
        print("Extract Stage PASS")
    except Exception as e:
        print(f"Extract Stage FAIL: {e}")

    print("--- Testing Validate Stage ---")
    validate_job = {
        "id": str(uuid.uuid4()),
        "pipeline_id": str(uuid.uuid4()),
        "run_id": str(uuid.uuid4()),
        "stage": "validate",
        "payload": {}
    }
    try:
        await worker.process_job(validate_job)
        print("Validate Stage PASS")
    except Exception as e:
        print(f"Validate Stage FAIL: {e}")

    print("--- Testing Load Stage ---")
    load_job = {
        "id": str(uuid.uuid4()),
        "pipeline_id": str(uuid.uuid4()),
        "run_id": str(uuid.uuid4()),
        "stage": "load",
        "payload": {"table_name": "public.test_target", "dest_config": {"type": "snowflake"}}
    }
    try:
        await worker.process_job(load_job)
        print("Load Stage PASS")
    except Exception as e:
        print(f"Load Stage FAIL: {e}")

if __name__ == "__main__":
    asyncio.run(test_worker_stages())
