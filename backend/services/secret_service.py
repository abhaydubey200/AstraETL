import os
import uuid
import asyncpg
from typing import Dict, Any, Optional

from core.security import SecurityUtils

class SecretService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def store_secret(self, connection_id: str, secret_key: str, secret_value: str) -> str:
        """
        Stores an encrypted secret.
        """
        encrypted_val, nonce = SecurityUtils.encrypt(secret_value)
        
        async with self.pool.acquire() as conn:
            # 1. Update connection_credentials with IV (nonce)
            await conn.execute(
                "INSERT INTO connection_credentials (connection_id, encrypted_credentials, iv) "
                "VALUES ($1, $2, $3) ON CONFLICT (connection_id) "
                "DO UPDATE SET encrypted_credentials = $2, iv = $3, created_at = NOW()",
                uuid.UUID(connection_id), encrypted_val, nonce
            )

            # 2. Legacy support: still write to connection_secrets if needed for specific logic
            await conn.execute(
                "INSERT INTO connection_secrets (connection_id, secret_key, secret_value) "
                "VALUES ($1, $2, $3) ON CONFLICT (connection_id, secret_key) "
                "DO UPDATE SET secret_value = $3, updated_at = NOW()",
                uuid.UUID(connection_id), secret_key, encrypted_val
            )
            
            return f"vault://astraflow/connections/{connection_id}/{secret_key}"

    async def get_secret(self, connection_id: str, secret_key: str) -> Optional[str]:
        """Resolves an encrypted secret and decrypts it."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT encrypted_credentials, iv FROM connection_credentials WHERE connection_id = $1",
                uuid.UUID(connection_id)
            )
            
            if row and row['encrypted_credentials'] and row['iv']:
                return SecurityUtils.decrypt(row['encrypted_credentials'], row['iv'])
            
            # Fallback to connection_secrets
            val = await conn.fetchval(
                "SELECT secret_value FROM connection_secrets WHERE connection_id = $1 AND secret_key = $2",
                uuid.UUID(connection_id), secret_key
            )
            return val

    async def rotate_credentials(self, connection_id: str):
        """Placeholder for credential rotation logic."""
        # In a real system, this would generate a new password, 
        # update it in the source DB, and update the vault.
        pass
