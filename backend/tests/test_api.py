import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AstraFlow API is running"}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@patch("api.monitoring_router.analytics_service.get_performance_trends", new_callable=AsyncMock)
def test_get_analytics_trends(mock_trends):
    mock_trends.return_value = {"throughput": []}
    response = client.get("/analytics/trends")
    assert response.status_code == 200
    assert "throughput" in response.json()

@patch("api.monitoring_router.ai_service.get_insights", new_callable=AsyncMock)
def test_get_ai_insights(mock_insights):
    mock_insights.return_value = []
    response = client.get("/api/ai/insights")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@patch("api.metadata_router.metadata_service.detect_pii", new_callable=AsyncMock)
def test_detect_pii(mock_pii):
    mock_pii.return_value = {"status": "pii_detection_triggered"}
    response = client.post("/api/metadata/tables/test-table-id/detect-pii")
    assert response.status_code == 200
    assert response.json()["status"] == "pii_detection_triggered"
