import sys
import os
import asyncio
import uuid
import json
from datetime import datetime, timedelta

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Enable Mock Database
os.environ["USE_MOCK_DB"] = "true"
import mock_db
from core.database import db_manager
from services.worker_service import WorkerService
from services.alert_service import AlertService

def reset_store():
    print("Resetting mock store...")
    store = mock_db._load_store()
    store["astra_worker_queue"] = []
    store["task_runs"] = []
    store["pipeline_tasks"] = []
    store["astra_alerts"] = []
    store["failed_jobs"] = []
    mock_db._save_store(store)

async def test_job_recovery():
    print("\n--- Testing Job Recovery (Stale Workers) ---")
    await db_manager.connect()
    worker_service = WorkerService(db_manager.pool)
    
    # 1. Enqueue a job
    pipeline_id = str(uuid.uuid4())
    run_id = str(uuid.uuid4())
    await worker_service.enqueue_job(pipeline_id, run_id, "extract", {"table": "test"})
    
    # 2. Claim it so it moves to 'processing'
    job = await worker_service.claim_job()
    print(f"Job {job['id']} is now 'processing'")
    
    # 3. Manually aging the updated_at in the mock store to simulate staleness
    store = mock_db._load_store()
    for j in store["astra_worker_queue"]:
        if str(j["id"]) == str(job["id"]):
            # Set updated_at to 10 minutes ago
            stale_time = (datetime.utcnow() - timedelta(minutes=10)).isoformat()
            j["updated_at"] = stale_time
            print(f"Manually set job {j['id']} updated_at to {stale_time}")
            break
    mock_db._save_store(store)
    
    # 4. Run recovery
    print("Running recover_stale_jobs...")
    await worker_service.recover_stale_jobs(timeout_seconds=60)
    
    # 5. Verify it's back to 'pending'
    store = mock_db._load_store()
    for j in store["astra_worker_queue"]:
        if str(j["id"]) == str(job["id"]):
            print(f"Job {j['id']} status after recovery: {j['status']} (Expected: pending)")
            print(f"Job {j['id']} retry_count: {j['retry_count']} (Expected: 1)")
            assert j["status"] == "pending"
            assert j["retry_count"] == 1
            break
    
    print("SUCCESS: Job recovery validated.")
    await db_manager.disconnect()

async def test_task_retries_and_alerts():
    print("\n--- Testing Task Retries and Critical Alerts ---")
    await db_manager.connect()
    worker_service = WorkerService(db_manager.pool)
    alert_service = AlertService(db_manager.pool)
    
    # 1. Create a task run in 'queued' state
    task_run_id = str(uuid.uuid4())
    pipeline_run_id = str(uuid.uuid4())
    task_id = str(uuid.uuid4())
    
    store = mock_db._load_store()
    # Need task metadata
    pipeline_id = str(uuid.uuid4())
    store["pipeline_tasks"].append({
        "id": task_id,
        "pipeline_id": pipeline_id,
        "task_name": "Test Task",
        "task_type": "python",
        "config_json": "{}"
    })
    store["task_runs"].append({
        "id": task_run_id,
        "pipeline_run_id": pipeline_run_id,
        "task_id": task_id,
        "status": "queued",
        "retry_count": 0,
        "retries": 2 # Max retries for this test
    })
    mock_db._save_store(store)
    
    # 2. Claim and fail it until it hits max retries
    for i in range(3): # 0 -> 1 -> 2 -> failed
        task = await worker_service.claim_task_run()
        if not task:
            # Maybe it's already failed or there's a bug in claim
            print(f"Iteration {i}: No task claimed.")
            break
            
        print(f"Iteration {i}: Claimed task {task['id']}, failing it...")
        await worker_service._handle_task_failure(task, f"Synthetic failure {i}")
        
        # Verify status/retry count
        store = mock_db._load_store()
        for t in store["task_runs"]:
            if str(t["id"]) == task_run_id:
                print(f"Task status: {t['status']}, Retry Count: {t['retry_count']}")
                break
    
    # 3. Verify Alert creation
    alerts = store.get("astra_alerts", [])
    print(f"Total Alerts: {len(alerts)}")
    found_critical = False
    for a in alerts:
        if a["severity"] == "CRITICAL" and "Task failure after" in a["message"]:
            print(f"Found Alert: {a['message']}")
            found_critical = True
            break
    
    assert found_critical, "Critical alert for max retries not found!"
    print("SUCCESS: Task retries and alerts validated.")
    await db_manager.disconnect()

async def main():
    try:
        reset_store()
        await test_job_recovery()
        await test_task_retries_and_alerts()
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
