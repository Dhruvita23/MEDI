"""
models/bed_model.py — Pydantic schemas for the Beds Master collection.

MongoDB document shape:
{
    _id: ObjectId,
    floor:              1-5,
    bed_number:         1-10,
    is_occupied:        bool,
    current_patient_id: str | null
}
"""

from pydantic import BaseModel, Field
from typing import Optional


class BedStatus(BaseModel):
    """Read-only view of a single bed."""
    id:                 str
    floor:              int
    bed_number:         int
    is_occupied:        bool
    current_patient_id: Optional[str] = None


class BedSeed(BaseModel):
    """Used internally to seed all 50 beds on first run."""
    floor:              int = Field(..., ge=1, le=5)
    bed_number:         int = Field(..., ge=1, le=10)
    is_occupied:        bool = False
    current_patient_id: Optional[str] = None
