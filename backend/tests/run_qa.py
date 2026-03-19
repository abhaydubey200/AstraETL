import sys
import os
import io
from fastapi.testclient import TestClient

# Force UTF-8 for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ensure backend is in path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from main import app

CONNECTORS = ["postgresql", "mysql", "mssql", "snowflake"]

def get_base_config(connector_type):
    if connector_type == "postgresql":
        return {"host": "localhost", "port": 5432, "user": "test", "password": "pwd", "database": "db"}
    elif connector_type == "mysql":
        return {"host": "localhost", "port": 3306, "user": "test", "password": "pwd", "database": "db"}
    elif connector_type == "mssql":
        return {"host": "localhost", "port": 1433, "user": "test", "password": "pwd", "database": "db"}
    elif connector_type == "snowflake":
        return {"host": "test.snowflake", "user": "test", "password": "pwd", "warehouse": "wh", "database": "db"}
    return {}

def run_tests():
    print("=== AstraFlow Stage 1 QA Final ===")
    
    with TestClient(app) as client:
        for connector in CONNECTORS:
            print(f"\nConnector: {connector}")
            
            # 1. Valid
            cfg = get_base_config(connector)
            payload = {"connector_type": connector, "config": cfg}
            resp = client.post("/connections/test", json=payload)
            res = resp.json()
            if res.get("success") == True:
                print(f"  Test 1 (Valid): PASS")
            else:
                print(f"  Test 1 (Valid): FAIL")
                print(f"    Full Response: {res}")

            # 2. Invalid
            cfg = get_base_config(connector)
            cfg["password"] = "invalid"
            payload = {"connector_type": connector, "config": cfg}
            resp = client.post("/connections/test", json=payload)
            res = resp.json()
            if res.get("success") == False and "rejected" in str(res).lower():
                print(f"  Test 2 (Invalid): PASS")
            else:
                print(f"  Test 2 (Invalid): FAIL")
                print(f"    Full Response: {res}")

            # 3. Wrong Host
            cfg = get_base_config(connector)
            cfg["host"] = "non-existent-host-999.local"
            payload = {"connector_type": connector, "config": cfg}
            resp = client.post("/connections/test", json=payload)
            res = resp.json()
            if res.get("success") == False and "service not known" in str(res).lower():
                print(f"  Test 3 (Bad Host): PASS")
            else:
                print(f"  Test 3 (Bad Host): FAIL")
                print(f"    Full Response: {res}")

            # 4. Discovery
            cfg = get_base_config(connector)
            payload = {"connector_type": connector, "config": cfg}
            resp = client.post("/connections/discover-schema", json=payload)
            res = resp.json()
            if isinstance(res, list) and len(res) > 0:
                print(f"  Test 4 (Discovery): PASS")
            elif isinstance(res, dict) and "tables" in res:
                print(f"  Test 4 (Discovery): PASS")
            else:
                print(f"  Test 4 (Discovery): FAIL")
                print(f"    Full Response: {res}")

if __name__ == "__main__":
    run_tests()
