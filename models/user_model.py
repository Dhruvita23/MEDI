"""
models/user_model.py — Pydantic schemas for the User collection.

MongoDB document shape:
{
    _id: ObjectId,
    full_name: str,
    email: str,
    password_hash: str,
    role: "admin_staff" | "doctor" | "staff" | "chemist" | "user",
    account_status: "Active" | "Inactive",
    patient_details: {          # only populated for role == "user"
        allocated_floor: 1-5,
        allocated_bed:   1-10
    }
}
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal


class PatientDetails(BaseModel):
    allocated_floor: int = Field(..., ge=1, le=5)
    allocated_bed:   int = Field(..., ge=1, le=10)


class UserCreate(BaseModel):
    """Payload used by admin_staff to admit a new patient."""
    full_name:       str
    email:           EmailStr
    password:        str                          # plain-text; hashed in controller
    allocated_floor: int = Field(..., ge=1, le=5)
    allocated_bed:   int = Field(..., ge=1, le=10)


class UserResponse(BaseModel):
    """Safe public representation — never exposes password_hash."""
    id:             str
    full_name:      str
    email:          str
    role:           str
    account_status: str
    patient_details: Optional[PatientDetails] = None
