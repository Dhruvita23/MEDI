"""
middleware/auth.py — JWT creation, verification, and RBAC dependency guards.

Usage in a route:
    current_user = Depends(require_roles("admin_staff", "doctor"))
"""

import os
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET          = os.getenv("JWT_SECRET", "change_me")
JWT_ALGORITHM       = "HS256"
JWT_EXPIRE_MINUTES  = int(os.getenv("JWT_EXPIRE_MINUTES", 60))

# FastAPI will look for a Bearer token in the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------

def create_access_token(payload: dict) -> str:
    """
    Signs a JWT containing the supplied payload dict.
    Automatically appends an expiry claim.
    """
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decodes and validates a JWT.
    Raises HTTP 401 if the token is invalid or expired.
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Dependency: get the current authenticated user from the token
# ---------------------------------------------------------------------------

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency that decodes the Bearer token and returns the
    embedded user payload (user_id, role, floor, bed, etc.).
    """
    return decode_access_token(token)


# ---------------------------------------------------------------------------
# Dependency factory: RBAC guard
# ---------------------------------------------------------------------------

def require_roles(*allowed_roles: str):
    """
    Returns a FastAPI dependency that enforces role-based access.

    Example:
        @router.get("/admin-only")
        async def view(user=Depends(require_roles("admin_staff"))):
            ...
    """
    async def _guard(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {list(allowed_roles)}",
            )
        return current_user

    return _guard
