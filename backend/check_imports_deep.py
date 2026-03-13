import sys
import os

# Add the current directory to path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

services = [
    "ai_insight_service", "ai_service", "alert_service", "analytics_service",
    "audit_service", "bulk_load_service", "capability_service", "catalog_service",
    "connection_service", "cost_service", "governance_service", "lineage_service",
    "metadata_service", "monitoring_service", "notification_service", "partition_planner",
    "pipeline_service", "quality_service", "rbac_service", "scheduler_service",
    "schema_service", "secret_service", "storage_service", "validation_service",
    "worker_service"
]

failed = []

for service_name in services:
    try:
        module = __import__(f"services.{service_name}", fromlist=["*"])
        print(f"SUCCESS: {service_name} imported successfully")
    except Exception as e:
        import traceback
        print(f"FAILURE: Error importing {service_name}: {e}")
        traceback.print_exc()
        failed.append((service_name, str(e)))

if failed:
    print(f"\nTotal failures: {len(failed)}")
    sys.exit(1)
else:
    print("\nAll services imported correctly!")
    sys.exit(0)
