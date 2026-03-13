import sys
import os
import asyncio
import uuid
import random
import json
from datetime import datetime

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Enable Mock Database before any other imports that might use asyncpg
try:
    import mock_db
except ImportError:
    print("WARNING: mock_db.py not found. Simulation may fail without a real database.")

try:
    from core.database import db_manager
except ImportError:
    db_manager = None

from services.worker_service import WorkerService
from services.pipeline_service import PipelineService

class RuntimeSimulator:
    def __init__(self, pool, num_workers=5):
        self.pool = pool
        self.worker_service = WorkerService(pool)
        self.pipeline_service = PipelineService(pool)
        self.num_workers = num_workers
        self.is_running = True
        self.stats = {
            "processed": 0,
            "failed": 0,
            "retried": 0,
            "injected_failures": 0
        }

    async def simulate_worker(self, worker_id):
        worker_uuid = str(uuid.uuid4())
        print(f"Worker-{worker_id} ({worker_uuid}) started.")
        heartbeat_count = 0
        
        while self.is_running:
            try:
                # Update heartbeat every 5 iterations
                if heartbeat_count % 5 == 0:
                    await self.worker_service.update_heartbeat(
                        worker_uuid, 
                        status='active',
                        metadata={
                            "tasks": self.stats["processed"],
                            "cpu": round(random.uniform(5, 45), 1),
                            "memory": round(random.uniform(150, 800), 1)
                        }
                    )
                heartbeat_count += 1

                # 1. Try to claim a job (Stage-based)
                job = await self.worker_service.claim_job()
                if job:
                    print(f"Worker-{worker_id} claimed job {job['id']} [Stage: {job['stage']}]")
                    await self.process_with_failure_injection(worker_id, job, "job")
                else:
                    # 2. If no job, try to claim a task (DAG-based)
                    task = await self.worker_service.claim_task_run()
                    if task:
                        print(f"Worker-{worker_id} claimed task {task['id']} [Type: {task['task_type']}]")
                        await self.process_with_failure_injection(worker_id, task, "task")
                    else:
                        await asyncio.sleep(2) # Idle
            except Exception as e:
                print(f"Worker-{worker_id} encountered error: {e}")
                await asyncio.sleep(1)

    async def process_with_failure_injection(self, worker_id, item, item_type):
        if random.random() < 0.2:
            self.stats["injected_failures"] += 1
            error_msg = random.choice([
                "Connection timeout to source",
                "Database deadlock detected",
                "Transient network failure",
                "Out of memory simulation"
            ])
            print(f"Worker-{worker_id} injecting failure into {item_type} {item['id']}: {error_msg}")
            
            if item_type == "job":
                await self.worker_service.update_job_status(str(item['id']), "failed", error_msg)
            else:
                await self.worker_service.update_task_status(str(item['id']), "failed", error_msg)
            self.stats["failed"] += 1
        else:
            print(f"Worker-{worker_id} processing {item_type} {item['id']}...")
            await asyncio.sleep(random.uniform(0.1, 0.5)) # Fast mock processing
            
            try:
                if item_type == "job":
                    await self.worker_service.process_job(item)
                else:
                    await self.worker_service.process_task(item)
                self.stats["processed"] += 1
            except Exception as e:
                print(f"Worker-{worker_id} failed during processing {item['id']}: {e}")
                self.stats["failed"] += 1

    async def recovery_monitor(self):
        print("Recovery monitor started.")
        while self.is_running:
            try:
                # Every 10 seconds, check for stale jobs
                await self.worker_service.recover_stale_jobs(timeout_seconds=5)
            except Exception as e:
                print(f"Recovery monitor error: {e}")
            await asyncio.sleep(10)

    async def monitor(self):
        while self.is_running:
            print(f"\n--- Simulation Stats ---")
            print(f"Processed: {self.stats['processed']}")
            print(f"Failed: {self.stats['failed']}")
            print(f"Injected Failures: {self.stats['injected_failures']}")
            print(f"------------------------\n")
            await asyncio.sleep(5)

    async def run_simulation(self, duration_secs=20):
        workers = [self.simulate_worker(i) for i in range(self.num_workers)]
        monitor_task = asyncio.create_task(self.monitor())
        recovery_task = asyncio.create_task(self.recovery_monitor())
        
        try:
            await asyncio.wait_for(asyncio.gather(*workers), timeout=duration_secs)
        except asyncio.TimeoutError:
            print(f"Simulation completed after {duration_secs}s.")
        finally:
            self.is_running = False
            monitor_task.cancel()
            recovery_task.cancel()

async def main():
    # Load dotenv to avoid ValueError in DatabaseManager if DATABASE_URL is checked (even if mocked)
    from dotenv import load_dotenv
    load_dotenv()
    
    # Initialize DB Pool (Will be mocked by mock_db)
    await db_manager.connect()
    try:
        simulator = RuntimeSimulator(db_manager.pool, num_workers=2)
        await simulator.run_simulation(duration_secs=15)
    finally:
        await db_manager.disconnect()

if __name__ == "__main__":
    import sys
    # Ensure backend directory is in path for imports
    backend_path = os.path.dirname(os.path.abspath(__file__))
    if backend_path not in sys.path:
        sys.path.append(backend_path)
    asyncio.run(main())
