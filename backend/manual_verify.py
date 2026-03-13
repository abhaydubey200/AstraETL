import asyncio
import uuid
import os
from datetime import datetime
from unittest.mock import AsyncMock, patch

import sys
sys.path.append(os.getcwd())

from services.analytics_service import AnalyticsService
from services.ai_insight_service import AIInsightService
from services.validation_service import ValidationService
from services.lineage_service import LineageService
from services.governance_service import GovernanceService

async def test_analytics():
    print("Testing AnalyticsService...")
    mock_db_conn = AsyncMock()
    with patch('services.analytics_service.AnalyticsService._get_db_connection', return_value=mock_db_conn):
        service = AnalyticsService()
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
    print("AnalyticsService passed!")

async def test_ai():
    print("Testing AIInsightService...")
    with patch('services.ai_insight_service.AnalyticsService.detect_bottlenecks', return_value=[]), \
         patch('services.ai_insight_service.AnalyticsService.get_resource_utilization', return_value={'worker_utilization': 50}):
        service = AIInsightService()
        insights = await service.get_insights(str(uuid.uuid4()))
        assert isinstance(insights, list)
    print("AIInsightService passed!")

async def test_validation():
    print("Testing ValidationService...")
    mock_db_conn = AsyncMock()
    with patch('services.validation_service.ValidationService._get_db_connection', return_value=mock_db_conn):
        service = ValidationService()
        mock_db_conn.fetch.return_value = [
            {'id': uuid.uuid4(), 'rule_name': 'Test Rule', 'rule_expression': 'email not null', 'severity': 'error'}
        ]
        rules = await service.get_rules_for_pipeline(str(uuid.uuid4()))
        assert len(rules) == 1
    print("ValidationService passed!")

async def test_lineage():
    print("Testing LineageService...")
    mock_db_conn = AsyncMock()
    with patch('services.lineage_service.LineageService._get_db_connection', return_value=mock_db_conn):
        service = LineageService()
        run_id = str(uuid.uuid4())
        source_id = str(uuid.uuid4())
        target_id = str(uuid.uuid4())
        await service.record_lineage(run_id, source_id, target_id)
        mock_db_conn.execute.assert_called_once()
    print("LineageService passed!")

async def test_governance():
    print("Testing GovernanceService...")
    mock_db_conn = AsyncMock()
    with patch('services.governance_service.GovernanceService._get_db_connection', return_value=mock_db_conn):
        service = GovernanceService()
        mock_db_conn.fetch.return_value = [
            {'id': 1, 'action': 'test_action', 'resource_type': 'pipeline', 'created_at': datetime.now()}
        ]
        audit = await service.get_audit_trail()
        assert len(audit) == 1
    print("GovernanceService passed!")

async def main():
    try:
        await test_analytics()
        await test_ai()
        await test_validation()
        await test_lineage()
        await test_governance()
        print("\nAll service checks passed manually!")
    except Exception as e:
        print(f"\nManual verification failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
