import asyncio
import json
import uuid
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mock DB if needed
os.environ["USE_MOCK_DB"] = "true"

from api.schemas import PipelineCreate, NodeSchema, EdgeSchema
from core.dag_validator import DAGValidator

def test_dag_validator():
    print("Testing DAG Validator...")
    tasks = ["A", "B", "C"]
    
    # Valid DAG: A -> B -> C
    valid_deps = [
        {"parent_task_id": "A", "child_task_id": "B"},
        {"parent_task_id": "B", "child_task_id": "C"}
    ]
    assert DAGValidator.validate(tasks, valid_deps) is True
    print("  - Valid DAG passed")
    
    # Cyclic DAG: A -> B -> C -> A
    invalid_deps = [
        {"parent_task_id": "A", "child_task_id": "B"},
        {"parent_task_id": "B", "child_task_id": "C"},
        {"parent_task_id": "C", "child_task_id": "A"}
    ]
    assert DAGValidator.validate(tasks, invalid_deps) is False
    print("  - Cyclic DAG correctly rejected")
    
    # Parallel DAG: A -> B, A -> C
    parallel_deps = [
        {"parent_task_id": "A", "child_task_id": "B"},
        {"parent_task_id": "A", "child_task_id": "C"}
    ]
    assert DAGValidator.validate(tasks, parallel_deps) is True
    print("  - Parallel DAG passed")

def test_schemas():
    print("Testing Pydantic Schemas...")
    node = NodeSchema(node_type="extract", label="Source", config_json={"url": "test"})
    edge = EdgeSchema(source_node_id="node1", target_node_id="node2")
    
    create_payload = PipelineCreate(
        pipeline={"name": "Test Pipeline"},
        nodes=[node],
        edges=[edge]
    )
    
    json_data = create_payload.model_dump_json()
    parsed = PipelineCreate.model_validate_json(json_data)
    assert parsed.pipeline["name"] == "Test Pipeline"
    assert len(parsed.nodes) == 1
    print("  - Pydantic models validated")

if __name__ == "__main__":
    try:
        test_dag_validator()
        test_schemas()
        print("\nALL VERIFICATION TESTS PASSED")
    except Exception as e:
        print(f"\nVERIFICATION FAILED: {str(e)}")
        sys.exit(1)
