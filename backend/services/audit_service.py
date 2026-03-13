import os
import uuid
import asyncpg
from typing import List, Dict, Any, Optional
from datetime import datetime

class AuditService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def log_action(self, user_id: str, action: str, resource_type: str, resource_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Logs a platform-level action for audit compliance."""
        async with self.pool.acquire() as conn:
            def to_uuid(val):
                if not val or val == "None": return None
                try:
                    return uuid.UUID(str(val))
                except (ValueError, TypeError):
                    return None

            await conn.execute(
                """
                INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
                VALUES ($1, $2, $3, $4, $5)
                """,
                to_uuid(user_id), 
                action, 
                resource_type, 
                to_uuid(resource_id), 
                details
            )

    async def get_audit_logs(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieves audit logs with pagination."""
        async with self.pool.acquire() as conn:
            try:
                rows = await conn.fetch(
                    """
                    SELECT al.*, u.email as user_email
                    FROM public.audit_logs al
                    LEFT JOIN public.users u ON al.user_id = u.id
                    ORDER BY al.created_at DESC
                    LIMIT $1 OFFSET $2
                    """,
                    limit, offset
                )
                return [dict(r) for r in rows]
            except Exception:
                return []
