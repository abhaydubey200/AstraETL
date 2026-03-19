import urllib.request
import json
import time
import uuid

BASE_URL = "http://localhost:8081"

def get(path):
    print(f"GET {BASE_URL}{path}...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}{path}") as r:
            data = json.loads(r.read().decode())
            # print(f"  Response: {json.dumps(data)[:100]}...")
            return data
    except Exception as e:
        print(f"  Error: {e}")
        if hasattr(e, 'read'):
            print(f"  Detail: {e.read().decode()}")
        return None

def post(path, body):
    print(f"POST {BASE_URL}{path} with {json.dumps(body)[:100]}...")
    try:
        req = urllib.request.Request(f"{BASE_URL}{path}", data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read().decode())
            print(f"  Response: {json.dumps(data)[:100]}...")
            return data
    except Exception as e:
        print(f"  Error: {e}")
        if hasattr(e, 'read'):
            print(f"  Detail: {e.read().decode()}")
        return None

def test_pipeline_execution():
    # 1. Create a mock pipeline
    print("Creating test pipeline...")
    p_payload = {
        "pipeline": {
            "name": "Test Pipeline " + str(uuid.uuid4())[:8],
            "description": "Auto-generated test pipeline",
            "environment": "dev",
            "execution_mode": "linear"
        },
        "nodes": [
            {
                "id": str(uuid.uuid4()),
                "node_type": "extract",
                "label": "Extract Data",
                "config_json": {"table_name": "users", "connection_id": str(uuid.uuid4())},
                "position_x": 100,
                "position_y": 100
            },
            {
                "id": str(uuid.uuid4()),
                "node_type": "load",
                "label": "Load Data",
                "config_json": {"table_name": "dest_users", "target_connection_id": str(uuid.uuid4())},
                "position_x": 400,
                "position_y": 100
            }
        ],
        "edges": [
            {
                "source_node_id": "WILL_BE_UPDATED",
                "target_node_id": "WILL_BE_UPDATED"
            }
        ]
    }
    # Fix edges to match node IDs
    p_payload["edges"][0]["source_node_id"] = p_payload["nodes"][0]["id"]
    p_payload["edges"][0]["target_node_id"] = p_payload["nodes"][1]["id"]
    
    res = post("/pipelines", p_payload)
    if not res:
        print("Failed to create pipeline")
        return
    pipeline_id = res['id']
    print(f"Created Pipeline ID: {pipeline_id}")

    # 2. Trigger Run
    print(f"Triggering run for pipeline {pipeline_id}...")
    run_data = post(f"/pipelines/{pipeline_id}/run", {"source": {}, "destination": {}})
    if not run_data:
        print("Failed to trigger run")
        return
    
    run_id = run_data['run_id']
    print(f"Started Run: {run_id}")

    # 3. Poll for status
    start_time = time.time()
    completed = False
    logs_seen = set()
    
    for i in range(30): # 60 seconds max
        print(f"\n--- Polling attempt {i+1} ({int(time.time() - start_time)}s) ---")
        status_data = get(f"/pipelines/runs/{run_id}")
        if status_data:
            print(f"  Status: {status_data.get('status')}, Rows: {status_data.get('rows_processed')}")
            if status_data.get('status') in ['completed', 'failed']:
                completed = (status_data.get('status') == 'completed')
                break
        else:
            print("  Failed to get status data")
        
        # Check logs
        logs = get(f"/pipelines/runs/{run_id}/logs")
        if logs:
            print(f"  Logs count: {len(logs)}")
            for l in logs:
                msg = f"[{l.get('stage')}] {l.get('message')}"
                if msg not in logs_seen:
                    print(f"    LOG: {msg}")
                    logs_seen.add(msg)
        
        time.sleep(2)

    if completed:
        print("\n✅ SUCCESS: Pipeline reached 'completed' status.")
    else:
        print("\n❌ FAILURE: Pipeline did not complete within timeout or failed.")

if __name__ == "__main__":
    test_pipeline_execution()
