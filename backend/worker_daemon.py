import asyncio
import os
import signal
import sys
import uuid
from dotenv import load_dotenv
load_dotenv()

# Stabilization: Allow Mock DB for testing/validation
if os.getenv("USE_MOCK_DB") == "true":
    try:
        import mock_db
    except ImportError:
        pass

from core.database import db_manager
from services.worker_service import WorkerService

WORKER_ID = str(uuid.uuid4())

async def heartbeat_task(worker: WorkerService, stop_event: asyncio.Event):
    """Background task to send heartbeats every 10 seconds."""
    import psutil
    while not stop_event.is_set():
        try:
            # Collect telemetry
            telemetry = {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "pid": os.getpid()
            }
            await worker.update_heartbeat(WORKER_ID, status='active', metadata=telemetry)
            await asyncio.sleep(10)
        except Exception as e:
            print(f"Heartbeat error for worker {WORKER_ID}: {e}")
            await asyncio.sleep(5)

async def main():
    load_dotenv()
    await db_manager.connect()
    
    try:
        worker = WorkerService(db_manager.pool)
        print(f"AstraFlow Worker Daemon [{WORKER_ID}] started. Polling for jobs...")
        
        stop_event = asyncio.Event()
        
        def handle_exit(signum=None, frame=None):
            if not stop_event.is_set():
                print(f"\nShutdown signal {signum} received. Preparing to stop...")
                stop_event.set()
            
        # Register signals for graceful shutdown
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                if os.name == 'nt': # Windows
                    signal.signal(sig, handle_exit)
                else: # Unix
                    loop = asyncio.get_running_loop()
                    loop.add_signal_handler(sig, handle_exit)
            except Exception:
                 pass

        # Start heartbeat task in the background
        h_task = asyncio.create_task(heartbeat_task(worker, stop_event))
        
        sleep_interval = 2
        while not stop_event.is_set():
            work_processed = False
            try:
                # 1. Check for legacy monolithic jobs
                job = await worker.claim_job()
                if job:
                    print(f"Claimed legacy job {job['id']} (Stage: {job['stage']})")
                    # Enforce a reasonable timeout for individual jobs
                    try:
                        await asyncio.wait_for(worker.process_job(job), timeout=3600)
                        work_processed = True
                    except asyncio.TimeoutError:
                        print(f"Job {job['id']} hit 1-hour execution limit.")
                    except Exception as e:
                        print(f"Job processing error: {e}")
                
                # 2. Check for new DAG Task Runs if no monolithic job was taken
                if not work_processed:
                    task_run = await worker.claim_task_run()
                    if task_run:
                        print(f"Claimed DAG Task Run {task_run['id']} (Type: {task_run['task_type']})")
                        try:
                            await asyncio.wait_for(worker.process_task(task_run), timeout=1800)
                            work_processed = True
                        except asyncio.TimeoutError:
                            print(f"Task Run {task_run['id']} hit 30-minute execution limit.")
                        except Exception as e:
                            print(f"Task processing error: {e}")

                # 3. Periodically check for stale jobs
                # Recover stale jobs from OTHER workers that crashed
                # Use a counter-based or randomized check to avoid all workers doing this at once
                if not work_processed and os.getpid() % 7 == 0: 
                     await worker.recover_stale_jobs(timeout_seconds=300)

                # Adaptive Sleep
                if work_processed:
                    sleep_interval = 1 # Reset to minimum after work
                    continue # Check for more work immediately
                else:
                    # Exponential backoff up to 30s
                    await asyncio.sleep(sleep_interval)
                    sleep_interval = min(sleep_interval + 2, 30)

            except Exception as e:
                print(f"Error in worker loop: {str(e)}")
                await asyncio.sleep(5)
        
        # Cleanup: Wait for heartbeat task to acknowledge shutdown
        print("Waiting for heartbeat task to terminate...")
        try:
            await asyncio.wait_for(h_task, timeout=5.0)
        except asyncio.TimeoutError:
            print("Heartbeat task failed to stop gracefully.")
        
        print(f"Worker {WORKER_ID} Daemon stopped.")
    finally:
        await db_manager.disconnect()

if __name__ == "__main__":
    # Ensure backend directory is in path for imports
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(main())
