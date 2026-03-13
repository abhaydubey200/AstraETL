"""
Stage 9: Distributed Load Testing Simulation
Simulates concurrent users hitting the API to detect bottlenecks.
Measures response times, failure rates, and throughput.
"""
import asyncio
import httpx
import time
import statistics
from collections import defaultdict

BASE_URL = "http://localhost:8001"
HEADERS = {"Authorization": "Bearer fake_token", "Content-Type": "application/json"}

# Load test profile
ENDPOINTS = [
    ("GET", "/health", None),
    ("GET", "/pipelines/", None),
    ("GET", "/connections/", None),
    ("GET", "/monitoring/metrics", None),
]

async def make_request(client: httpx.AsyncClient, method: str, path: str, body=None):
    start = time.monotonic()
    try:
        if method == "GET":
            resp = await client.get(path, headers=HEADERS, timeout=5.0)
        else:
            resp = await client.post(path, headers=HEADERS, json=body, timeout=5.0)
        elapsed = (time.monotonic() - start) * 1000  # ms
        return resp.status_code, elapsed, None
    except Exception as e:
        elapsed = (time.monotonic() - start) * 1000
        return None, elapsed, str(e)

async def run_load_test(concurrent_users: int = 20, requests_per_user: int = 5):
    print(f"\n=== Load Test: {concurrent_users} concurrent users × {requests_per_user} requests ===")
    
    results = defaultdict(list)
    errors = defaultdict(int)
    
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        tasks = []
        for user_id in range(concurrent_users):
            for req_num in range(requests_per_user):
                method, path, body = ENDPOINTS[(user_id + req_num) % len(ENDPOINTS)]
                tasks.append(make_request(client, method, path, body))
        
        start_time = time.monotonic()
        responses = await asyncio.gather(*tasks)
        total_time = (time.monotonic() - start_time) * 1000
    
    # Analyze
    status_counts = defaultdict(int)
    all_times = []
    error_count = 0
    
    for status, elapsed, err in responses:
        if err:
            error_count += 1
        else:
            status_counts[status] += 1
            all_times.append(elapsed)
    
    total_requests = concurrent_users * requests_per_user
    success_rate = ((total_requests - error_count) / total_requests) * 100
    
    print(f"\nTotal Requests: {total_requests}")
    print(f"Completed in:   {total_time:.0f}ms")
    print(f"Success Rate:   {success_rate:.1f}%")
    print(f"Network Errors: {error_count}")
    print(f"\nStatus Distribution: {dict(status_counts)}")
    
    if all_times:
        print(f"\nResponse Times:")
        print(f"  Min:    {min(all_times):.1f}ms")
        print(f"  Max:    {max(all_times):.1f}ms")
        print(f"  Avg:    {statistics.mean(all_times):.1f}ms")
        print(f"  Median: {statistics.median(all_times):.1f}ms")
        if len(all_times) > 1:
            p95 = sorted(all_times)[int(len(all_times) * 0.95)]
            print(f"  P95:    {p95:.1f}ms")
    
    # Check SLAs
    sla_passed = True
    if all_times and statistics.mean(all_times) > 2000:
        print("\n[SLA BREACH] Average response time exceeds 2000ms threshold!")
        sla_passed = False
    if error_count > 0:
        print(f"\n[SLA BREACH] {error_count} network errors detected!")
        sla_passed = False
    if sla_passed:
        print("\n✅ All SLAs passed: Response times and error rates within acceptable bounds.")
    
    return sla_passed

if __name__ == "__main__":
    asyncio.run(run_load_test(concurrent_users=20, requests_per_user=5))
