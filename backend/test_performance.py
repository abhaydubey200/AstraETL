import asyncio
import os
import uuid
import time
import random
from services.worker_service import WorkerService
from core.database import db_manager

# Ensure backend in path
import sys
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.append(backend_path)

# Enable Mock
import mock_db

class PerformanceTester:
    def __init__(self, pool, num_workers=20, num_jobs=100):
        self.pool = pool
        self.worker_service = WorkerService(pool)
        self.num_workers = num_workers
        self.num_jobs = num_jobs
        self.results = []
        self.is_running = True
        self.start_time = 0

    async def setup_data(self):
        print(f"Preparing {self.num_jobs} mock jobs in queue...")
        async with self.pool.acquire() as conn:
            # Clear existing
            await conn.execute("DELETE FROM public.astra_worker_queue")
            
            pipeline_id = uuid.uuid4()
            run_id = uuid.uuid4()
            
            for i in range(self.num_jobs):
                await conn.execute(
                    "INSERT INTO public.astra_worker_queue (pipeline_id, run_id, stage, payload, status) "
                    "VALUES ($1, $2, $3, $4, 'pending')",
                    pipeline_id, run_id, "extract", json.dumps({"batch": i})
                )

    async def simulate_worker(self, worker_id):
        processed_count = 0
        while self.is_running:
            try:
                job = await self.worker_service.claim_job()
                if job:
                    # Record the claim
                    self.results.append({
                        "worker_id": worker_id,
                        "job_id": str(job['id']),
                        "timestamp": time.time()
                    })
                    # Simulate some work
                    await asyncio.sleep(random.uniform(0.01, 0.05))
                    await self.worker_service.update_job_status(str(job['id']), "completed")
                    processed_count += 1
                else:
                    break # No more jobs
            except Exception as e:
                print(f"Worker-{worker_id} error: {e}")
        return processed_count

    async def run_test(self):
        await self.setup_data()
        
        print(f"Starting Stress Test with {self.num_workers} workers...")
        self.start_time = time.time()
        
        tasks = [self.simulate_worker(i) for i in range(self.num_workers)]
        worker_counts = await asyncio.gather(*tasks)
        
        duration = time.time() - self.start_time
        total_processed = sum(worker_counts)
        
        print(f"\n--- Performance Results ---")
        print(f"Total Jobs: {self.num_jobs}")
        print(f"Total Processed: {total_processed}")
        print(f"Total Duration: {duration:.2f}s")
        print(f"Throughput: {total_processed / duration:.2f} jobs/sec")
        
        # Verify Uniqueness (No double claims)
        job_ids = [r['job_id'] for r in self.results]
        unique_jobs = set(job_ids)
        
        if len(job_ids) != len(unique_jobs):
            print(f"CRITICAL ERROR: {len(job_ids) - len(unique_jobs)} double claims detected!")
        else:
            print("SUCCESS: Atomic claiming verified (no double claims).")
            
        if total_processed != self.num_jobs:
             print(f"WARNING: Processed {total_processed} vs {self.num_jobs} expected.")
        else:
             print("SUCCESS: All jobs processed.")

async def main():
    os.environ["USE_MOCK_DB"] = "true"
    os.environ["DATABASE_URL"] = "postgres://user:pass@localhost:5432/db"
    
    await db_manager.connect()
    try:
        tester = PerformanceTester(db_manager.pool, num_workers=10, num_jobs=50)
        await tester.run_test()
    finally:
        await db_manager.disconnect()

if __name__ == "__main__":
    import json
    asyncio.run(main())
