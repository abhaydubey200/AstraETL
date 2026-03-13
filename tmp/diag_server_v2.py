import httpx
import asyncio
import json

async def diagnose():
    base_url = "http://localhost:8000"
    print(f"--- Detailed Diagnostics {base_url} ---")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        endpoints = [
            ("GET", "/health"),
            ("GET", "/pipelines/runs"),
            ("GET", "/pipelines/runs?"),
            ("GET", "/pipelines/runs/"),
            ("POST", "/pipelines/"),
            ("POST", "/pipelines"),
            ("GET", "/pipelines/"),
            ("GET", "/pipelines"),
        ]
        
        body = {"pipeline": {"name": "Diag Test"}, "nodes": [], "edges": []}
        
        for method, path in endpoints:
            try:
                url = f"{base_url}{path}"
                if method == "POST":
                    r = await client.post(url, json=body)
                else:
                    r = await client.get(url)
                print(f"{method} {path}: {r.status_code} {r.text[:100]}")
            except Exception as e:
                print(f"{method} {path}: FAILED - {str(e)}")

if __name__ == '__main__':
    asyncio.run(diagnose())
