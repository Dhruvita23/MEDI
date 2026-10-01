"""
controllers/auth_controller.py — Login logic with RBAC + status interlock.

CRITICAL RULE (enforced here):
    A 'user' role account with account_status == 'Inactive' is REJECTED at login
    with the message: "Access Denied: This account has been deactivated upon discharge."
"""

from fastapi import HTTPException, status
from passlib.context import CryptContext

from config.database import get_db
from middleware.auth import create_access_token

# bcrypt password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


# ---------------------------------------------------------------------------
# Login controller
# ---------------------------------------------------------------------------

async def login_user(email: str, password: str) -> dict:
    """
    Authenticates a user by email + password.

    Steps:
      1. Look up the user document by email.
      2. Verify the password hash.
      3. CRITICAL: If role == 'user' AND account_status == 'Inactive' → reject.
      4. Build a JWT payload that embeds role, floor, and bed for downstream use.
      5. Return the signed token.
    """
    db   = get_db()
    user = await db["users"].find_one({"email": email})

    # --- Step 1 & 2: existence + password check ---
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # --- Step 3: CRITICAL discharge interlock ---
    if user["role"] == "user" and user["account_status"] == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: This account has been deactivated upon discharge.",
        )

    # --- Step 4: Build JWT payload ---
    # For patients we embed their floor/bed so orders can be auto-populated.
    patient_details = user.get("patient_details") or {}
    token_payload = {
        "user_id":       str(user["_id"]),
        "email":         user["email"],
        "role":          user["role"],
        "account_status": user["account_status"],
        # These will be None for non-patient roles
        "allocated_floor": patient_details.get("allocated_floor"),
        "allocated_bed":   patient_details.get("allocated_bed"),
    }

    token = create_access_token(token_payload)

    return {
        "access_token": token,
        "token_type":   "bearer",
        "role":         user["role"],
        "full_name":    user["full_name"],
    }
