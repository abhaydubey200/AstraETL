from fastapi import FastAPI, Request
import time
import uuid
import json
import os
from services.audit_service import AuditService

class AuditMiddleware:
    def __init__(self, app):
        self.app = app
        self._audit_service = None

    def get_audit_service(self, request: Request):
        if self._audit_service is None:
            pool = request.app.state.db_pool
            self._audit_service = AuditService(pool)
        return self._audit_service

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        path = request.url.path
        method = request.method
        
        # Start timer
        start_time = time.time()
        
        # Get user from scope if set by auth middleware
        user_id = scope.get("user", {}).get("id") if "user" in scope else None
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]
                duration = time.time() - start_time
                
                # Log sensitive actions (POST, PUT, DELETE)
                if method in ["POST", "PUT", "DELETE"]:
                    audit_service = self.get_audit_service(request)
                    # In a real app we'd want to capture the request body but carefully skip passwords/secrets
                    await audit_service.log_action(
                        user_id=user_id,
                        action=f"API_{method}_{path}",
                        resource_type="api_endpoint",
                        details={
                            "status_code": status_code,
                            "duration_ms": int(duration * 1000),
                            "ip": request.client.host if request.client else "unknown"
                        }
                    )
            await send(message)

        await self.app(scope, receive, send_wrapper)
