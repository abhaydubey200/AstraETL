import asyncio
import time
import os
import uuid
import logging
from typing import Dict, Any

# Mock the DB for profiling if needed, but here we want to see REAL logic timings
os.environ["USE_MOCK_DB"] = "true"
import mock_db
from services.worker_service import WorkerService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PerfAnalyzer")

async def profile_worker_stages():
    pool = mock_db.MockPool({})
    worker = WorkerService(pool)
    
    pipeline_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    
    extract_job = {
        "id": job_id,
        "pipeline_id": pipeline_id,
        "run_id": str(uuid.uuid4()),
        "stage": "extract",
        "payload": {
            "table_name": "users",
            "chunk_size": 1000,
            "source_config": {"host": "localhost", "user": "postgres", "password": "password", "database": "source_db"},
            "dest_config": {"account": "xy12345", "user": "admin", "password": "password", "database": "dest_db"}
        }
    }
    
    logger.info("--- Starting Performance Profile ---")
    
    start_total = time.perf_counter()
    
    # Profile Extraction
    start = time.perf_counter()
    await worker.process_job(extract_job)
    end = time.perf_counter()
    logger.info(f"Extraction Stage Time: {end - start:.4f}s")
    
    # Profile Validation
    validate_job = extract_job.copy()
    validate_job["stage"] = "validate"
    start = time.perf_counter()
    await worker.process_job(validate_job)
    end = time.perf_counter()
    logger.info(f"Validation Stage Time: {end - start:.4f}s")
    
    # Profile Load
    load_job = extract_job.copy()
    load_job["stage"] = "load"
    start = time.perf_counter()
    await worker.process_job(load_job)
    end = time.perf_counter()
    logger.info(f"Load Stage Time: {end - start:.4f}s")
    
    end_total = time.perf_counter()
    logger.info(f"Total Pipeline Execution Time: {end_total - start_total:.4f}s")
    logger.info("--- Profile Complete ---")

if __name__ == "__main__":
    asyncio.run(profile_worker_stages())
