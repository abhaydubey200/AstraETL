import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from typing import Tuple

class SecurityUtils:
    @staticmethod
    def get_master_key() -> bytes:
        """Retrieves or generates the master encryption key."""
        key_hex = os.getenv("ASTRAFLOW_MASTER_KEY")
        if not key_hex:
            # In development, use a fixed key if not set, but warn
            # For production, this MUST be set in environment
            return b'\x00' * 32  # 32-byte dev key (256 bits)
        return bytes.fromhex(key_hex)

    @staticmethod
    def encrypt(data: str) -> Tuple[str, str]:
        """Encrypts data using AES-GCM and returns (encrypted_data_b64, nonce_b64)."""
        key = SecurityUtils.get_master_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data.encode(), None)
        return (
            base64.b64encode(ciphertext).decode('utf-8'),
            base64.b64encode(nonce).decode('utf-8')
        )

    @staticmethod
    def decrypt(encrypted_data_b64: str, nonce_b64: str) -> str:
        """Decrypts AES-GCM encrypted data."""
        key = SecurityUtils.get_master_key()
        aesgcm = AESGCM(key)
        ciphertext = base64.b64decode(encrypted_data_b64)
        nonce = base64.b64decode(nonce_b64)
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode('utf-8')
