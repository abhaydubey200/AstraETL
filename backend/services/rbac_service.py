import os
import uuid
import asyncpg
from typing import List, Dict, Any, Optional

class RBACService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def check_permission(self, user_id: str, permission_name: str) -> bool:
        """Checks if a user has a specific permission via their assigned role."""
        async with self.pool.acquire() as conn:
            # Join users -> user_profiles -> roles -> role_permissions -> permissions
            row = await conn.fetchrow(
                """
                SELECT 1 FROM public.user_profiles up
                JOIN public.astra_roles r ON up.role_id = r.id
                JOIN public.role_permissions rp ON r.id = rp.role_id
                JOIN public.astra_permissions p ON rp.permission_id = p.id
                WHERE up.id = $1 AND p.permission_name = $2
                """,
                uuid.UUID(user_id), permission_name
            )
            return row is not None

    async def assign_role(self, user_id: str, role_name: str):
        async with self.pool.acquire() as conn:
            role_row = await conn.fetchrow("SELECT id FROM public.astra_roles WHERE role_name = $1", role_name)
            if not role_row:
                raise Exception(f"Role {role_name} does not exist")
            
            await conn.execute(
                "UPDATE public.user_profiles SET role_id = $1 WHERE id = $2",
                role_row['id'], uuid.UUID(user_id)
            )
            
    async def get_user_role(self, user_id: str) -> Optional[str]:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT r.role_name FROM public.astra_roles r JOIN public.user_profiles up ON r.id = up.role_id WHERE up.id = $1",
                uuid.UUID(user_id)
            )
            return row['role_name'] if row else None
