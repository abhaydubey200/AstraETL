import pytest
import uuid
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from services.analytics_service import AnalyticsService
from services.ai_insight_service import AIInsightService
from services.validation_service import ValidationService
from services.lineage_service import LineageService
from services.governance_service import GovernanceService

@pytest.fixture
def mock_db_conn():
    conn = AsyncMock()
    return conn

@pytest.mark.asyncio
async def test_analytics_service_trends(mock_db_conn):
    pool = MagicMock()
    pool.acquire.return_value.__aenter__.return_value = mock_db_conn
    service = AnalyticsService(pool=pool)
    mock_db_conn.fetch.return_value = [
        {
            'metric_name': 'throughput',
            'bucket': datetime.now(),
            'avg_value': 100.0,
            'max_value': 150.0,
            'sample_count': 10
        }
    ]
    trends = await service.get_performance_trends()
    assert 'throughput' in trends
    assert trends['throughput'][0]['avg'] == 100.0

@pytest.mark.asyncio
async def test_ai_insight_service_get_insights(mock_db_conn):
    pool = MagicMock()
    pool.acquire.return_value.__aenter__.return_value = mock_db_conn
    with patch('services.ai_insight_service.AnalyticsService.detect_bottlenecks', return_value=[]), \
         patch('services.ai_insight_service.AnalyticsService.get_resource_utilization', return_value={'worker_utilization': 50}):
        service = AIInsightService(pool=pool)
        insights = await service.get_insights(str(uuid.uuid4()))
        assert isinstance(insights, list)

@pytest.mark.asyncio
async def test_validation_service_rules(mock_db_conn):
    pool = MagicMock()
    pool.acquire.return_value.__aenter__.return_value = mock_db_conn
    service = ValidationService(pool=pool)
    mock_db_conn.fetch.return_value = [
        {'id': uuid.uuid4(), 'rule_name': 'Test Rule', 'rule_expression': 'email not null', 'severity': 'error'}
    ]
    rules = await service.get_rules_for_pipeline(str(uuid.uuid4()))
    assert len(rules) == 1
    assert rules[0]['rule_name'] == 'Test Rule'

@pytest.mark.asyncio
async def test_lineage_service_record(mock_db_conn):
    pool = MagicMock()
    pool.acquire.return_value.__aenter__.return_value = mock_db_conn
    service = LineageService(pool=pool)
    pipeline_id = str(uuid.uuid4())
    source_id = str(uuid.uuid4())
    target_id = str(uuid.uuid4())
    await service.record_asset_lineage(source_id, target_id, pipeline_id)
    mock_db_conn.execute.assert_called_once()

@pytest.mark.asyncio
async def test_governance_service_audit(mock_db_conn):
    pool = MagicMock()
    pool.acquire.return_value.__aenter__.return_value = mock_db_conn
    service = GovernanceService(pool=pool)
    mock_db_conn.fetch.return_value = [
        {'id': 1, 'action': 'test_action', 'resource_type': 'pipeline', 'created_at': datetime.now()}
    ]
    audit = await service.get_audit_trail()
    assert len(audit) == 1
    assert audit[0]['action'] == 'test_action'
