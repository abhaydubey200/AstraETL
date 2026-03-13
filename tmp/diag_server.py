import httpx
import asyncio
import json

async def diagnose():
    base_url = "http://localhost:8000"
    print(f"--- Diagnosing {base_url} ---")
    
    async with httpx.AsyncClient() as client:
        # 1. Test /health
        try:
            r = await client.get(f"{base_url}/health")
            print(f"GET /health: {r.status_code} {r.text}")
        except Exception as e:
            print(f"GET /health: FAILED - {str(e)}")
            
        # 2. Test /pipelines/runs
        try:
            r = await client.get(f"{base_url}/pipelines/runs")
            print(f"GET /pipelines/runs: {r.status_code} {r.text}")
        except Exception as e:
            print(f"GET /pipelines/runs: FAILED - {str(e)}")
            
        # 3. Test POST /pipelines/
        try:
            r = await client.post(f"{base_url}/pipelines/", json={"pipeline": {"name": "Test"}, "nodes":[], "edges":[]})
            print(f"POST /pipelines/: {r.status_code} {r.text}")
        except Exception as e:
            print(f"POST /pipelines/: FAILED - {str(e)}")

        # 4. Test GET /pipelines/ (list)
        try:
            r = await client.get(f"{base_url}/pipelines/")
            print(f"GET /pipelines/: {r.status_code} {r.text}")
        except Exception as e:
            print(f"GET /pipelines/: FAILED - {str(e)}")

if __name__ == '__main__':
    asyncio.run(diagnose())
