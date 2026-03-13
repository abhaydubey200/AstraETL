from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import os
import jwt
from typing import List, Dict, Optional

class RBACMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, role_permissions: Dict[str, List[str]]):
        super().__init__(app)
        self.role_permissions = role_permissions

    async def dispatch(self, request: Request, call_next):
        # 0. Always allow CORS preflight (OPTIONS) requests through
        if request.method == "OPTIONS":
            return await call_next(request)

        # 1. Skip auth for public endpoints
        if request.url.path in ["/", "/health", "/auth", "/docs", "/openapi.json"]:
            return await call_next(request)

        # 2. Development mode bypass: Only if ASTRA_DEBUG_MODE is "true"
        debug_mode = os.getenv("ASTRA_DEBUG_MODE", "false").lower() == "true"
        if debug_mode:
            request.scope["user"] = {
                "id": "debug-user",
                "email": "debug@astraflow.local",
                "role": "admin" # Give full access in debug mode
            }
            return await call_next(request)

        secret = os.getenv("SUPABASE_JWT_SECRET")

        # 3. Enforce Token for non-public endpoints (production mode)
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
             from fastapi.responses import JSONResponse
             return JSONResponse(
                 status_code=401,
                 content={"detail": "Not authenticated"},
                 headers={"WWW-Authenticate": "Bearer"}
             )
             
        try:
            token = auth_header.split(" ")[1]
            if not token:
                raise ValueError("Empty token")
                
            payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_exp": True})
            
            # Populate request scope for downstream middleware (like Audit)
            request.scope["user"] = {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "role": payload.get("role", "viewer")
            }
            
            user_role = payload.get("role", "viewer")
            
            # 4. Check Permissions
            method = request.method
            path = request.url.path
            
            if method == "DELETE" and user_role not in ["admin"]:
                raise HTTPException(status_code=403, detail="Only admins can delete resources")
            
            if method in ["POST", "PUT"] and user_role not in ["admin", "data_engineer"]:
                if "/run" not in path:
                    raise HTTPException(status_code=403, detail="Insufficient permissions to modify resources")

        except Exception as e:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid session or insufficient permissions"},
                headers={"WWW-Authenticate": "Bearer"}
            )

        return await call_next(request)
