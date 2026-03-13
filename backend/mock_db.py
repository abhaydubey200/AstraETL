import os
import threading
import asyncio
import uuid
import json
from datetime import datetime

# ---------------------------------------------------------------------------
# File-backed shared store for mock mode
# ---------------------------------------------------------------------------
MOCK_FILE = os.path.join(os.path.dirname(__file__), "mock_store.json")
_STORE_LOCK = threading.Lock()

def _load_store():
    with _STORE_LOCK:
        initial_store = {
            "connections": [],
            "pipelines": [],
            "pipeline_nodes": [],
            "pipeline_edges": [],
            "pipeline_versions": [],
            "pipeline_runs": [],
            "pipeline_logs": [],
            "connection_capabilities": [],
            "connection_performance": [],
            "connection_credentials": [],
            "connection_secrets": [],
            "astra_worker_queue": [],
            "task_runs": [],
            "pipeline_tasks": [],
            "pipeline_dependencies": [],
            "staging_files": [],
            "worker_heartbeats": [],
            "pipeline_partitions": [],
            "bulk_load_jobs": [],
            "astra_alerts": [],
            "failed_jobs": [],
        }
        if not os.path.exists(MOCK_FILE):
            with open(MOCK_FILE, "w") as f:
                json.dump(initial_store, f)
            return initial_store
        
        try:
            with open(MOCK_FILE, "r") as f:
                store = json.load(f)
                # Ensure all required keys exist
                for key, default in initial_store.items():
                    if key not in store:
                        store[key] = default
                return store
        except Exception as e:
            print(f"MOCK_DB_ERROR: Failed to load store: {e}")
            return initial_store

def _save_store(store):
    with _STORE_LOCK:
        try:
            with open(MOCK_FILE, "w") as f:
                json.dump(store, f, indent=2)
        except Exception as e:
            print(f"Mock DB Error saving store: {e}")

_STORE = _load_store()

class MockCursor:
    def __init__(self, query, args, store):
        self.query = query
        self.args = args
        self.store = store
        self.fetched = False
        self.data = []
        self._prepare_data()

    def _prepare_data(self):
        # Very simple mock: if it's a "SELECT * FROM users", return some fake rows
        if "users" in self.query.lower():
            self.data = [{"id": i, "email": f"user{i}@example.com", "name": f"User {i}"} for i in range(1, 101)]
        else:
            self.data = [{"id": 1, "data": "mock_row"}]

    async def fetch(self, size):
        chunk = self.data[:size]
        self.data = self.data[size:]
        return chunk


class MockTransaction:
    async def __aenter__(self):
        pass
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class MockConnection:
    def __init__(self, db_state):
        self.db_state = db_state

    async def cursor(self, query, *args):
        store = _load_store()
        return MockCursor(query, args, store)

    async def fetch(self, query, *args):
        store = _load_store()
        query_lower = query.lower().strip()
        print(f"Mock DB: fetch -> {query_lower[:80]}")

        # --- connections listing ---
        if "from connections" in query_lower and "select" in query_lower:
            limit = args[0] if len(args) > 0 else 50
            offset = args[1] if len(args) > 1 else 0
            rows = store.get("connections", [])
            rows = rows[offset:offset + limit]
            enriched = []
            for r in rows:
                row = dict(r)
                cid = str(row.get("id"))
                
                # Join performance
                for p in store.get("connection_performance", []):
                    if str(p.get("connection_id")) == cid:
                        row["avg_latency_ms"] = p.get("avg_latency_ms")
                        break
                else:
                    row.setdefault("avg_latency_ms", None)

                # Join capabilities
                for cap in store.get("connection_capabilities", []):
                    if str(cap.get("connection_id")) == cid:
                        row["supports_cdc"] = cap.get("supports_cdc")
                        row["supports_incremental"] = cap.get("supports_incremental")
                        break
                else:
                    row.setdefault("supports_cdc", None)
                    row.setdefault("supports_incremental", None)
                    
                enriched.append(row)
            return enriched

        # --- pipeline listing ---
        if "from pipelines" in query_lower and "select" in query_lower:
            return store.get("pipelines", [])

        # --- pipeline nodes ---
        if "from pipeline_nodes" in query_lower and "where pipeline_id =" in query_lower:
            pid = str(args[0])
            return [n for n in store.get("pipeline_nodes", []) if str(n.get("pipeline_id")) == pid]

        # --- pipeline edges ---
        if "from pipeline_edges" in query_lower and "where pipeline_id =" in query_lower:
            pid = str(args[0])
            return [e for e in store.get("pipeline_edges", []) if str(e.get("pipeline_id")) == pid]

        # --- pipeline versions ---
        if "from pipeline_versions" in query_lower and "where pipeline_id =" in query_lower:
            pid = str(args[0])
            return [v for v in store.get("pipeline_versions", []) if str(v.get("pipeline_id")) == pid]

        # --- pipeline tasks ---
        if "from public.pipeline_tasks" in query_lower:
            pid = str(args[0])
            return [t for t in store.get("pipeline_tasks", []) if str(t.get("pipeline_id")) == pid]

        # --- pipeline dependencies ---
        if "from public.pipeline_dependencies" in query_lower:
            pid = str(args[0])
            return [d for d in store.get("pipeline_dependencies", []) if str(d.get("pipeline_id")) == pid]

        # --- pipeline runs (for scheduler) ---
        if "from public.pipeline_runs" in query_lower:
            return [r for r in store.get("pipeline_runs", []) if r.get("status") == "running" or r.get("run_status") == "running"]

        # --- task runs ---
        if "from public.task_runs" in query_lower:
            if "where pipeline_run_id =" in query_lower:
                rid = str(args[0])
                return [t for t in store.get("task_runs", []) if str(t.get("pipeline_run_id")) == rid]

        # --- worker_heartbeats ---
        if "from worker_heartbeats" in query_lower:
            rows = store.get("worker_heartbeats", [])
            res = []
            for r in rows:
                res.append({
                    "id": r["worker_id"],
                    "status": r["status"],
                    "last_heartbeat": r["last_seen"],
                    "tasks": r.get("metadata", {}).get("tasks", 0),
                    "cpu": r.get("metadata", {}).get("cpu", 0.0),
                })
            return res

        if "update public.astra_worker_queue" in query_lower:
            # Standard recovery update with RETURNING
            if "status = 'pending'" in query_lower or "status='pending'" in query_lower:
                res = []
                for job in store.get("astra_worker_queue", []):
                    if job.get("status") == "processing":
                        job["status"] = "pending"
                        job["retry_count"] = job.get("retry_count", 0) + 1
                        job["updated_at"] = datetime.utcnow().isoformat()
                        res.append({"id": job["id"], "run_id": job.get("run_id")})
                _save_store(store)
                return res

        return []

    async def fetchrow(self, query, *args):
        store = _load_store()
        query_lower = query.lower().strip()
        print(f"Mock DB: fetchrow -> {query_lower[:80]}")

        # --- claim_next_worker_job ---
        if "claim_next_worker_job" in query_lower:
            for j in store.get("astra_worker_queue", []):
                if j["status"] == "pending":
                    j["status"] = "processing"
                    j.setdefault("retry_count", 0)
                    j["updated_at"] = datetime.utcnow().isoformat()
                    _save_store(store)
                    return j
            return None

        # --- claim_task_run ---
        if "update public.task_runs" in query_lower and "returning *" in query_lower:
            for t in store.get("task_runs", []):
                if t["status"] == "queued":
                    t["status"] = "running"
                    t["start_time"] = datetime.utcnow().isoformat()
                    t["updated_at"] = datetime.utcnow().isoformat()
                    # Include pipeline_id for alert logic if available
                    if "pipeline_id" not in t:
                        for pt in store.get("pipeline_tasks", []):
                            if str(pt.get("id")) == str(t.get("task_id")):
                                t["pipeline_id"] = pt.get("pipeline_id")
                                break
                    _save_store(store)
                    return t
            return None

        if "from pipelines" in query_lower and "where id =" in query_lower:
            pid = str(args[0]) if args else None
            for p in store.get("pipelines", []):
                if str(p.get("id")) == pid:
                    return p
            return None

        # --- single connection by id ---
        if "from connections" in query_lower and "where" in query_lower:
            conn_id = str(args[0]) if args else None
            for c in store.get("connections", []):
                if str(c.get("id")) == conn_id:
                    row = dict(c)
                    row.setdefault("avg_latency_ms", None)
                    row.setdefault("avg_query_time_ms", None)
                    row.setdefault("requests_per_minute", None)
                    row.setdefault("error_rate", None)
                    row.setdefault("supports_cdc", None)
                    row.setdefault("supports_incremental", None)
                    row.setdefault("supports_parallel_reads", None)
                    row.setdefault("supports_transactions", None)
                    row.setdefault("max_connections", None)
                    return row
            return None

        # --- pipeline task by id ---
        if "from public.pipeline_tasks" in query_lower and "where id =" in query_lower:
            tid = str(args[0])
            for t in store.get("pipeline_tasks", []):
                if str(t.get("id")) == tid:
                    return t
            return None

        if "returning" in query_lower and "id" in query_lower:
            return {"id": str(uuid.uuid4())}

        # --- dashboard main metrics ---
        if "from pipeline_checkpoints" in query_lower:
            q = store.get("astra_worker_queue", [])
            return {
                "totalRows": 150000,
                "rowsPerSec": 1250.5,
                "queuePending": len([j for j in q if j["status"] == "pending"]),
                "alertDelivered": 0,
                "successRate": 99.2
            }

        # --- queue aggregates (monitoring) ---
        if "from astra_worker_queue" in query_lower and "count(*)" in query_lower:
            q = store.get("astra_worker_queue", [])
            return {
                "pending": len([j for j in q if j["status"] == "pending"]),
                "processing": len([j for j in q if j["status"] == "processing"]),
                "failed": len([j for j in q if j["status"] == "failed"]),
                "completed": len([j for j in q if j["status"] == "completed"])
            }

        return None

    async def fetchval(self, query, *args):
        store = _load_store()
        query_lower = query.lower().strip()
        print(f"Mock DB: fetchval -> {query_lower[:80]}")

        # --- INSERT INTO pipeline_runs ... RETURNING id ---
        if "insert into pipeline_runs" in query_lower:
            new_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            row = {
                "id": new_id,
                "pipeline_id": str(args[0]),
                "status": args[1],
                "run_status": args[1], # sync both
                "environment": args[2],
                "created_at": now,
                "start_time": now
            }
            store["pipeline_runs"].append(row)
            _save_store(store)
            return new_id

        # --- INSERT INTO pipeline_partitions ---
        if "insert into public.pipeline_partitions" in query_lower:
            new_id = str(uuid.uuid4())
            row = {
                "id": new_id,
                "pipeline_run_id": str(args[0]),
                "table_name": args[1],
                "partition_key": args[2],
                "range_start": args[3],
                "range_end": args[4]
            }
            store.setdefault("pipeline_partitions", []).append(row)
            _save_store(store)
            return new_id

        # --- INSERT INTO bulk_load_jobs ---
        if "insert into public.bulk_load_jobs" in query_lower:
            new_id = str(uuid.uuid4())
            row = {
                "id": new_id,
                "pipeline_run_id": str(args[0]),
                "target_table": args[1],
                "command_type": args[2] if len(args) > 2 else "UNKNOWN",
                "status": args[3] if len(args) > 3 else "running",
                "started_at": datetime.utcnow().isoformat()
            }
            store.setdefault("bulk_load_jobs", []).append(row)
            _save_store(store)
            return new_id

        # --- INSERT INTO connections ---
        if "insert into connections" in query_lower:
            new_id = str(uuid.uuid4())
            row = {
                "id": new_id,
                "name": args[0],
                "type": args[1],
                "host": args[2],
                "port": args[3],
                "database_name": args[4],
                "username": args[5],
                "ssl_enabled": args[6],
                "security_level": args[7],
                "created_at": datetime.utcnow().isoformat()
            }
            store.setdefault("connections", []).append(row)
            _save_store(store)
            return new_id

        # --- MAX version ---
        if "max(version_number)" in query_lower:
            pid = str(args[0])
            versions = [v for v in store.get("pipeline_versions", []) if str(v.get("pipeline_id")) == pid]
            return max([v.get("version_number", 0) for v in versions]) if versions else 0

        # Default fallthrough for inserts returning ID
        if "insert into" in query_lower and "returning" in query_lower:
             return str(uuid.uuid4())
             
        return None

    async def execute(self, query, *args):
        query_lower = query.lower().strip()
        print(f"Mock DB: execute -> {query_lower[:80]}")

        store = _load_store()
        
        if "delete from public.pipeline_tasks" in query_lower:
            pid = str(args[0])
            store["pipeline_tasks"] = [t for t in store.get("pipeline_tasks", []) if str(t.get("pipeline_id")) != pid]
            _save_store(store)
            return "DELETE"

        if "delete from public.pipeline_dependencies" in query_lower:
            pid = str(args[0])
            store["pipeline_dependencies"] = [d for d in store.get("pipeline_dependencies", []) if str(d.get("pipeline_id")) != pid]
            _save_store(store)
            return "DELETE"

        if "update pipelines set" in query_lower:
            pid = str(args[0])
            for p in store.get("pipelines", []):
                if str(p.get("id")) == pid:
                    p["updated_at"] = datetime.utcnow().isoformat()
            _save_store(store)
            return "UPDATE"

        if "insert into public.pipeline_tasks" in query_lower:
            row = {
                "id": str(uuid.uuid4()),
                "pipeline_id": str(args[0]),
                "task_name": args[1],
                "task_type": args[2],
                "config_json": args[3]
            }
            store["pipeline_tasks"].append(row)
            _save_store(store)
            return "INSERT"

        if "insert into public.pipeline_dependencies" in query_lower:
            row = {
                "pipeline_id": str(args[0]),
                "parent_task_id": str(args[1]),
                "child_task_id": str(args[2])
            }
            store["pipeline_dependencies"].append(row)
            _save_store(store)
            return "INSERT"

        if "insert into public.astra_alerts" in query_lower:
            row = {
                "id": str(uuid.uuid4()),
                "alert_type": args[0] if len(args) > 0 else "UNKNOWN",
                "pipeline_id": str(args[1]) if len(args) > 1 and args[1] else None,
                "message": args[2] if len(args) > 2 else "No message",
                "severity": args[3] if len(args) > 3 else "medium",
                "status": "open",
                "created_at": datetime.utcnow().isoformat()
            }
            store.setdefault("astra_alerts", []).append(row)
            _save_store(store)
            return "INSERT"

        if "insert into public.failed_jobs" in query_lower:
            row = {
                "id": str(uuid.uuid4()),
                "job_id": str(args[0]) if len(args) > 0 else "UNKNOWN",
                "pipeline_id": str(args[1]) if len(args) > 1 else "UNKNOWN",
                "run_id": str(args[2]) if len(args) > 2 else "UNKNOWN",
                "stage": args[3] if len(args) > 3 else "UNKNOWN",
                "payload": args[4] if len(args) > 4 else "{}",
                "error_message": args[5] if len(args) > 5 else "No error message",
                "created_at": datetime.utcnow().isoformat()
            }
            store.setdefault("failed_jobs", []).append(row)
            _save_store(store)
            return "INSERT"

        if "update public.pipeline_runs" in query_lower:
            rid = None
            new_status = None
            if "$2" in query_lower:
                new_status = args[0]
                rid = str(args[1])
            elif "$1" in query_lower:
                rid = str(args[0])
                if "status = 'failed'" in query_lower: new_status = 'failed'
                elif "status = 'completed'" in query_lower: new_status = 'completed'

            if rid:
                for r in store.get("pipeline_runs", []):
                    if str(r.get("id")) == rid:
                        if new_status: 
                            r["status"] = new_status
                            r["run_status"] = new_status
                        r["finished_at"] = datetime.utcnow().isoformat()
                _save_store(store)
            return "UPDATE"

        if "update public.task_runs" in query_lower:
            tid = None
            new_status = None
            inc_retry = "retry_count + 1" in query_lower
            
            # Find task ID
            if "$3" in query_lower:
                new_status = args[0]
                tid = str(args[2])
            elif "$2" in query_lower:
                if "next_retry_at =" in query_lower:
                    tid = str(args[1])
                else:
                    tid = str(args[1])
                    new_status = args[0]
            elif "$1" in query_lower:
                tid = str(args[0])

            if "status = 'queued'" in query_lower: new_status = 'queued'
            elif "status = 'running'" in query_lower: new_status = 'running'
            elif "status = 'completed'" in query_lower: new_status = 'completed'
            elif "status = 'failed'" in query_lower: new_status = 'failed'

            if tid:
                for t in store.get("task_runs", []):
                    if str(t.get("id")) == tid:
                        if new_status: t["status"] = new_status
                        if inc_retry: t["retry_count"] = t.get("retry_count", 0) + 1
                        t["updated_at"] = datetime.utcnow().isoformat()
                _save_store(store)
            return "UPDATE"

        if "insert into public.task_runs" in query_lower:
            row = {
                "id": str(args[4]) if len(args) > 4 else str(uuid.uuid4()),
                "pipeline_run_id": str(args[0]),
                "task_id": str(args[1]),
                "status": args[2],
                "start_time": args[3].isoformat() if hasattr(args[3], 'isoformat') else str(args[3]),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            store["task_runs"].append(row)
            _save_store(store)
            return "INSERT"

        if "insert into public.staging_files" in query_lower:
            row = {
                "id": str(uuid.uuid4()),
                "pipeline_run_id": str(args[0]),
                "partition_id": str(args[1]),
                "file_path": args[2],
                "row_count": args[3],
                "file_size_bytes": args[4],
                "created_at": datetime.utcnow().isoformat()
            }
            store.setdefault("staging_files", []).append(row)
            _save_store(store)
            return "INSERT"

        if "insert into public.astra_worker_queue" in query_lower:
            row = {
                "id": str(uuid.uuid4()),
                "pipeline_id": str(args[0]),
                "run_id": str(args[1]),
                "stage": args[2],
                "payload": json.loads(args[3]) if isinstance(args[3], str) else args[3],
                "status": "pending",
                "retry_count": 0,
                "scheduled_at": (args[4].isoformat() if hasattr(args[4], 'isoformat') else str(args[4])) if len(args) > 4 else datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            store.setdefault("astra_worker_queue", []).append(row)
            _save_store(store)
            return "INSERT"

        if "update public.astra_worker_queue" in query_lower:
            # Flexible handler for various UPDATE patterns
            jid = None
            new_status = None
            error_text = None
            print(f"DEBUG_DB: Flexible UPDATE astra_worker_queue. Query: {query_lower[:100]}")

            if "status = 'pending'" in query_lower or "status='pending'" in query_lower:
                new_status = 'pending'
                print(f"DEBUG_DB: Match status='pending' pattern.")
                # Find ID in args based on query placeholders
                if "$2" in query_lower: 
                    jid = str(args[1])
                    print(f"DEBUG_DB: JID from $2: {jid}")
                elif "$1" in query_lower: 
                    print(f"DEBUG_DB: Mass recovery pattern ($1).")
                    count = 0
                    for job in store.get("astra_worker_queue", []):
                        if job.get("status") == "processing":
                            job["status"] = "pending"
                            job["retry_count"] = job.get("retry_count", 0) + 1
                            job["updated_at"] = datetime.utcnow().isoformat()
                            count += 1
                    print(f"DEBUG_DB: Recovered {count} jobs.")
                    _save_store(store)
                    return "UPDATE"
            else:
                # Likely UpdateJobStatus: status=$1, error=$2, id=$3
                if len(args) >= 3:
                    new_status = args[0]
                    error_text = args[1]
                    jid = str(args[2])
            
            if jid:
                for job in store.get("astra_worker_queue", []):
                    if str(job.get("id")) == jid:
                        if new_status: job["status"] = new_status
                        if error_text: job["error_text"] = error_text
                        job["updated_at"] = datetime.utcnow().isoformat()
                _save_store(store)
            return "UPDATE"

        if "insert into public.worker_heartbeats" in query_lower:
            wid = str(args[0])
            status = args[1]
            metadata = json.loads(args[2]) if isinstance(args[2], str) else args[2]
            
            # Update existing or add new
            found = False
            for h in store.get("worker_heartbeats", []):
                if h["worker_id"] == wid:
                    h["status"] = status
                    h["metadata"] = metadata
                    h["last_seen"] = datetime.utcnow().isoformat()
                    found = True
                    break
            if not found:
                store["worker_heartbeats"].append({
                    "worker_id": wid,
                    "status": status,
                    "metadata": metadata,
                    "last_seen": datetime.utcnow().isoformat()
                })
            _save_store(store)
            return "INSERT"

        if "update public.bulk_load_jobs" in query_lower:
            jid = str(args[1] if "$2" in query_lower else args[0])
            for job in store.get("bulk_load_jobs", []):
                if str(job.get("id")) == jid:
                    if "status =" in query_lower:
                        # Extract status from args or query
                        job["status"] = args[0] if "$1" in query_lower else "success"
                    job["completed_at"] = datetime.utcnow().isoformat()
            _save_store(store)
            return "UPDATE"

        if "insert into connection_capabilities" in query_lower:
            cid = str(args[0])
            row = {
                "connection_id": cid,
                "supports_cdc": args[1],
                "supports_incremental": args[2],
                "supports_parallel_reads": args[3],
                "supports_transactions": args[4],
                "max_connections": args[5],
                "updated_at": datetime.utcnow().isoformat()
            }
            # Upsert logic
            found = False
            for c in store.setdefault("connection_capabilities", []):
                if str(c.get("connection_id")) == cid:
                    c.update(row)
                    found = True
                    break
            if not found:
                store["connection_capabilities"].append(row)
            _save_store(store)
            return "INSERT"

        if "insert into connection_performance" in query_lower:
            cid = str(args[0])
            latency = float(args[1])
            
            found = False
            for p in store.setdefault("connection_performance", []):
                if str(p.get("connection_id")) == cid:
                    p["avg_latency_ms"] = (p.get("avg_latency_ms", 0) + latency) / 2
                    p["updated_at"] = datetime.utcnow().isoformat()
                    found = True
                    break
            if not found:
                store["connection_performance"].append({
                    "connection_id": cid,
                    "avg_latency_ms": latency,
                    "updated_at": datetime.utcnow().isoformat()
                })
            _save_store(store)
            return "INSERT"

        if "insert into" in query_lower:
             return "INSERT"

        return "OK"

    async def executemany(self, query, data):
        query_lower = query.lower().strip()
        print(f"Mock DB: executemany -> {query_lower[:80]}")
        for args in data:
            await self.execute(query, *args)
        return "OK"

    def transaction(self):
        return MockTransaction()

    async def close(self):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class MockPool:
    def __init__(self, db_state):
        self.db_state = db_state

    def acquire(self):
        return MockConnection(self.db_state)

    async def release(self, conn):
        pass

    async def close(self):
        pass


class MockAsyncpg:
    def __init__(self):
        self.db_state = {}

    async def connect(self, dsn=None, **kwargs):
        return MockConnection(self.db_state)

    async def create_pool(self, dsn=None, **kwargs):
        return MockPool(self.db_state)


import asyncpg
mock_pg = MockAsyncpg()
asyncpg.connect = mock_pg.connect
asyncpg.create_pool = mock_pg.create_pool
print("INFRA: asyncpg monkey-patched with MockDB for Pipelines.")

class MockStorageService:
    def __init__(self):
        pass
    async def upload_file(self, local_path, remote_path):
        print(f"MOCK_STORAGE: Uploading {local_path} to {remote_path}")
    async def download_file(self, remote_path, local_path):
        print(f"MOCK_STORAGE: Downloading {remote_path} to {local_path}")
    async def list_files(self, prefix):
        return []

try:
    import services.storage_service
    services.storage_service.StorageService = MockStorageService
except:
    pass
