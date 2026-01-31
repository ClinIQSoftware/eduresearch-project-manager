"""Encryption utilities for sensitive data at rest.

Uses Fernet symmetric encryption with a key derived from the
application's SECRET_KEY environment variable.
"""

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    """Get a Fernet instance using the app's secret key.

    Derives a 32-byte key from SECRET_KEY using SHA-256,
    then base64-encodes it for Fernet compatibility.
    """
    from app.config import settings
    key_bytes = hashlib.sha256(settings.secret_key.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value and return the ciphertext as a string.

    Args:
        plaintext: The value to encrypt.

    Returns:
        Base64-encoded encrypted string.
    """
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt an encrypted string value.

    Args:
        ciphertext: The encrypted value (base64-encoded).

    Returns:
        The decrypted plaintext string.

    Raises:
        ValueError: If decryption fails (wrong key or corrupted data).
    """
    f = _get_fernet()
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt value — key may have changed or data is corrupted")
        raise ValueError("Failed to decrypt value. The encryption key may have changed.")
