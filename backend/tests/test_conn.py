import urllib.request
import json

try:
    with urllib.request.urlopen("http://127.0.0.1:8081/health") as response:
        data = response.read().decode()
        print(f"127.0.0.1 Result: {data}")
except Exception as e:
    print(f"127.0.0.1 Error: {e}")

try:
    with urllib.request.urlopen("http://localhost:8081/health") as response:
        data = response.read().decode()
        print(f"localhost Result: {data}")
except Exception as e:
    print(f"localhost Error: {e}")
