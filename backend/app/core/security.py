"""
Security utilities for the EduResearch Project Manager.

Provides password hashing and JWT token operations for authentication.
Uses bcrypt directly for password hashing and python-jose for JWT tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.

    Args:
        password: The plain text password to hash.

    Returns:
        The bcrypt-hashed password string.

    Example:
        hashed = hash_password("my_secure_password")
    """
    # bcrypt has a 72-byte limit for passwords
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plain text password against a hashed password.

    Args:
        plain: The plain text password to verify.
        hashed: The bcrypt-hashed password to compare against.

    Returns:
        True if the password matches, False otherwise.

    Example:
        if verify_password(submitted_password, user.password_hash):
            # Password is correct
    """
    # bcrypt has a 72-byte limit for passwords
    plain_bytes = plain.encode("utf-8")[:72]
    hashed_bytes = hashed.encode("utf-8")
    return bcrypt.checkpw(plain_bytes, hashed_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with the provided data.

    Args:
        data: Dictionary of claims to include in the token.
              Typically includes {"sub": user_id} at minimum.
        expires_delta: Optional custom expiration time.
                      If not provided, uses ACCESS_TOKEN_EXPIRE_MINUTES from settings.

    Returns:
        The encoded JWT token string.

    Example:
        token = create_access_token({"sub": str(user.id)})
        token = create_access_token(
            {"sub": str(user.id)},
            expires_delta=timedelta(hours=24)
        )
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )

    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.

    Args:
        token: The JWT token string to decode.

    Returns:
        The decoded payload dictionary if valid, None if invalid or expired.

    Example:
        payload = decode_token(token)
        if payload:
            user_id = payload.get("sub")
        else:
            # Token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return None
