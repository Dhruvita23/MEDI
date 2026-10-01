"""
routes/auth_routes.py — Authentication endpoints.

POST /api/auth/login  — returns a JWT on valid credentials
"""

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from controllers.auth_controller import login_user

router = APIRouter()


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


@router.post("/login", summary="Login and receive a JWT")
async def login(body: LoginRequest):
    """
    Authenticates the user and returns a Bearer token.

    - All roles may log in.
    - EXCEPTION: 'user' role with 'Inactive' status is rejected with a
      discharge message.
    """
    return await login_user(body.email, body.password)
