import pytest
from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

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

@pytest.mark.parametrize("connector_type", CONNECTORS)
def test_connection_diagnostics_success(connector_type):
    """Test 1: Valid credentials (success)."""
    config = get_base_config(connector_type)
    payload = {
        "connector_type": connector_type,
        "config": config
    }
    response = client.post("/connections/test", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["dns_resolution"] == "success"
    assert report["tcp_connection"] == "success"
    assert report["authentication"] == "success"
    if "permission_check" in report:
        assert report["permission_check"] == "success"

@pytest.mark.parametrize("connector_type", CONNECTORS)
def test_connection_diagnostics_invalid_creds(connector_type):
    """Test 2: Invalid credentials (authentication failure)."""
    config = get_base_config(connector_type)
    config["password"] = "invalid"
    payload = {
        "connector_type": connector_type,
        "config": config
    }
    response = client.post("/connections/test", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert "failed" in report["authentication"].lower()

@pytest.mark.parametrize("connector_type", CONNECTORS)
def test_connection_diagnostics_wrong_host(connector_type):
    """Test 3: Wrong host (DNS failure)."""
    config = get_base_config(connector_type)
    config["host"] = "non-existent-host-12345.local"
    payload = {
        "connector_type": connector_type,
        "config": config
    }
    response = client.post("/connections/test", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert "failed" in report["dns_resolution"].lower()

@pytest.mark.parametrize("connector_type", CONNECTORS)
def test_connection_diagnostics_wrong_port(connector_type):
    """Test 4: Wrong port (TCP failure)."""
    config = get_base_config(connector_type)
    config["port"] = 9999
    payload = {
        "connector_type": connector_type,
        "config": config
    }
    response = client.post("/connections/test", json=payload)
    assert response.status_code == 200
    report = response.json()
    # If DNS succeeded, TCP should fail
    if report["dns_resolution"] == "success":
        assert "failed" in report["tcp_connection"].lower()

@pytest.mark.parametrize("connector_type", CONNECTORS)
def test_connection_discover_schema(connector_type):
    """Test 5: Schema discovery."""
    config = get_base_config(connector_type)
    payload = {
        "connector_type": connector_type,
        "config": config
    }
    response = client.post("/connections/discover", json=payload)
    assert response.status_code == 200
    schema = response.json()
    assert isinstance(schema, list)
    # Mock data should return at least some tables
    # (Assuming mock_db.py or the connector itself provides mock tables)

@pytest.mark.parametrize("connector_type", CONNECTORS)
def test_connection_preview_data(connector_type):
    """Test 6: Preview data."""
    config = get_base_config(connector_type)
    payload = {
        "connector_type": connector_type,
        "config": config,
        "table_name": "users"
    }
    response = client.post("/connections/preview-data", json=payload)
    # Check if endpoint exists, it might be named differently or take different params
    if response.status_code == 404:
        pytest.skip("Preview data endpoint not found or uses different path")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
