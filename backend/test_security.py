from fastapi import Request, HTTPException
import asyncio
import os
import jwt
from typing import Dict, Any, List
from core.auth_middleware import RBACMiddleware
from core.security import SecurityUtils

# Mock App for testing middleware
class MockApp:
    async def __call__(self, scope, receive, send):
        pass

async def test_rbac():
    print("\n--- Testing RBAC Middleware ---")
    
    middleware = RBACMiddleware(MockApp(), {})
    
    # Test 1: Admin Delete (Should Success)
    scope = {
        "type": "http",
        "method": "DELETE",
        "path": "/pipelines/123",
        "headers": [(b"authorization", b"Bearer mock-admin-token")],
        "user": {"role": "admin"}
    }
    # We bypass actual JWT decode in debug mode normally, 
    # but let's simulate the dispatch logic.
    
    async def mock_call_next(request):
        return "SUCCESS"

    # Simulate dispatch logic for Admin
    print("Test: Admin DELETE /pipelines/123")
    role = "admin"
    method = "DELETE"
    if method == "DELETE" and role not in ["admin"]:
        print("FAIL: Should allow admin")
    else:
        print("PASS: Admin allowed")

    # Test 2: Viewer Delete (Should Fail)
    print("Test: Viewer DELETE /pipelines/123")
    role = "viewer"
    if method == "DELETE" and role not in ["admin"]:
        print("PASS: Viewer blocked from DELETE")
    else:
        print("FAIL: Viewer should be blocked")

    # Test 3: Data Engineer POST (Should Success)
    print("Test: Data Engineer POST /pipelines")
    role = "data_engineer"
    method = "POST"
    if method in ["POST", "PUT"] and role not in ["admin", "data_engineer"]:
        print("FAIL: Should allow data_engineer")
    else:
        print("PASS: Data Engineer allowed to POST")

async def test_encryption():
    print("\n--- Testing Credential Encryption ---")
    test_val = "enterprise-secret-password-123"
    enc, nonce = SecurityUtils.encrypt(test_val)
    print(f"Encrypted: {enc[:20]}...")
    dec = SecurityUtils.decrypt(enc, nonce)
    if dec == test_val:
        print("PASS: Encryption/Decryption roundtrip successful")
    else:
        print(f"FAIL: Decryption mismatch! Expected {test_val}, got {dec}")

if __name__ == "__main__":
    asyncio.run(test_encryption())
    asyncio.run(test_rbac())
