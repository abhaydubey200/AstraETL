import asyncio
import httpx
import sys

BASE_URL = "http://localhost:8000"
HEADERS = {"Authorization": "Bearer fake_token", "Content-Type": "application/json"}

# The contract mapping: Endpoint -> Method -> Expected Status (in a mocked auth scenario)
CONTRACTS = [
    ("/health", "GET", 200, None),
    ("/pipelines/", "GET", 401, None), # Testing trailing slash to ensure no 307
    ("/connections/", "GET", 401, None),
    ("/monitoring/metrics", "GET", 401, None),
    ("/metadata/catalog", "POST", 401, {"type": "snowflake"})
]

import os
os.environ["SUPABASE_JWT_SECRET"] = "dummy_secret_for_tests"

async def test_contracts():
    failures = 0
    print(f"--- Starting API Contract Audit ---")
    async with httpx.AsyncClient(base_url=BASE_URL, headers=HEADERS) as client:
        for path, method, expected_status, payload in CONTRACTS:
            try:
                res = None
                if method == "GET":
                    res = await client.get(path)
                elif method == "POST":
                    res = await client.post(path, json=payload)
                
                if res.status_code != expected_status:
                    # In our mocked setup, RBACMiddleware returns 401 for bad tokens. If it returns 500, we have an unchecked exception.
                    print(f"[FAIL] Contract Breach: {method} {path} returned {res.status_code} (Expected {expected_status})")
                    failures += 1
                else:
                    print(f"[PASS] {method} {path} -> {res.status_code}")
            except Exception as e:
                print(f"[ERROR] Connection to {path} failed: {e}")
                failures += 1
                
    if failures > 0:
        print(f"\nAudit completed with {failures} contract breaches.")
        sys.exit(1)
    else:
        print("\nSUCCESS: 100% API Contract Compliance.")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(test_contracts())
