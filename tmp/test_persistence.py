import sys
import os
import uuid
import json
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from mock_db import _save_store, _load_store, MOCK_FILE

async def test_persistence():
    print(f"Testing persistence to {MOCK_FILE}...")
    
    # Create test data with UUIDs
    test_id = uuid.uuid4()
    store = _load_store()
    
    # Clear and add test item
    store["connections"] = [
        {"id": test_id, "name": "Persistence Test Connection", "type": "postgres"}
    ]
    
    # Save (should not fail with UUID error)
    _save_store(store)
    print("Save successful (no error).")
    
    # Reload
    new_store = _load_store()
    found = False
    for conn in new_store.get("connections", []):
        if str(conn.get("id")) == str(test_id):
            found = True
            break
            
    if found:
        print("Verification SUCCESS: UUID was serialized and reloaded correctly.")
    else:
        print("Verification FAILED: Test connection not found after reload.")
        
    # Check for backup
    bak_file = f"{MOCK_FILE}.bak"
    if os.path.exists(bak_file):
        print(f"Backup file created: {bak_file}")
    else:
        print("Backup file NOT found.")

if __name__ == "__main__":
    asyncio.run(test_persistence())
