import asyncio
import httpx
import uuid
import time
import random

BASE_URL = "http://localhost:8000"

import os
os.environ["SUPABASE_JWT_SECRET"] = "dummy_secret_for_tests"

async def test_endpoint(client, path, method="GET", payload=None, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = await client.get(f"{BASE_URL}{path}", headers=headers)
        else:
            response = await client.post(f"{BASE_URL}{path}", headers=headers, json=payload)
        return response.status_code, response.json()
    except Exception as e:
        return 500, str(e)

async def stress_test_auth(client):
    print("Stress testing Auth & RBAC...")
    for _ in range(50):
        # Test random endpoints with no token
        # Note: /health is public, so it should NOT return 401
        path = random.choice(["/pipelines", "/connections", "/monitoring/metrics"])
        status, _ = await test_endpoint(client, path)
        if status not in [401, 403, 404]: # 404 might happen if route doesn't exist, but NOT 200/500
            print(f"FAILURE: Endpoint {path} returned status {status} (Expected 401/403)")

async def fuzz_payloads(client):
    print("Fuzzing API payloads...")
    malformed_configs = [
        {"name": 123}, # Name should be string
        {"type": "non_existent"},
        {"port": "not_an_int"},
        {}, # Empty
        {"name": "X" * 1000} # Buffer test
    ]
    
    for config in malformed_configs:
        status, _ = await test_endpoint(client, "/connections", method="POST", payload=config)
        print(f"Fuzz test status: {status}")

async def run_resilience_tests():
    async with httpx.AsyncClient() as client:
        await stress_test_auth(client)
        await fuzz_payloads(client)

if __name__ == "__main__":
    print("Starting API Resilience Tests...")
    asyncio.run(run_resilience_tests())
