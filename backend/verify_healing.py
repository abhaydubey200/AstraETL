import asyncio
import httpx
import sys
import os

async def verify_healing():
    print("Starting AstraFlow Self-Healing Verification...")
    
    # Base URL for the API
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # 1. Check Initial Status
        try:
            resp = await client.get(f"{base_url}/self-healing/status")
            print(f"Initial status check: {resp.json()}")
        except Exception as e:
            print(f"FAILED to connect to API: {e}. Ensure backend is running.")
            return

        # 1. Test Self-Healing Status (Canaries)
        print("\n[Canary Check] Fetching system status...")
        status_resp = await client.get(f"{base_url}/self-healing/status")
        print(f"Status: {status_resp.json()}")
        
        # 2. Simulate Performance Bottleneck (High Latency)
        print("\n[Performance RCA] Simulating high latency...")
        perf_resp = await client.post(f"{base_url}/self-healing/diagnose", json={
            "error_msg": "System experiencing High Latency in data ingestion",
            "context": {"component": "pipeline:ingest", "trace_id": "tr-perf-999"}
        })
        print(f"Fix Triggered: {perf_resp.json()}")
        
        # 3. Simulate Security Threat
        print("\n[Security Guard] Simulating SQL Injection attempt...")
        sec_resp = await client.post(f"{base_url}/self-healing/diagnose", json={
            "error_msg": "SQL Injection pattern detected in query params",
            "context": {"component": "api:auth", "trace_id": "tr-sec-123"}
        })
        print(f"Fix Triggered: {sec_resp.json()}")

        # 4. Verify Logs
        print("\n[Audit] Fetching repair ledger...")
        logs_resp = await client.get(f"{base_url}/self-healing/logs")
        for log in logs_resp.json()[-3:]:
            print(f"LOG: [{log['component']}] {log['issue']} -> {log['action']} (Trace: {log.get('trace_id')})")

    print("\nVerification Complete.")

if __name__ == "__main__":
    asyncio.run(verify_healing())
