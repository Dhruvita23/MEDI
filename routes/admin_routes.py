"""
routes/admin_routes.py — Admin Staff restricted endpoints.

All routes require role: 'admin_staff'

POST   /api/admin/seed-beds              — seed 50 beds (one-time setup)
GET    /api/admin/beds                   — view full bed occupancy grid
POST   /api/admin/admit-patient          — admit a new patient
PATCH  /api/admin/toggle-status/{id}     — discharge or re-activate a patient
"""

from fastapi import APIRouter, Depends

from middleware.auth import require_roles
from controllers.admin_controller import (
    admit_patient,
    toggle_patient_status,
    seed_beds,
    get_all_beds,
)
from models.user_model import UserCreate

router = APIRouter()

# Reusable dependency: only admin_staff may access these routes
AdminOnly = Depends(require_roles("admin_staff"))


@router.post("/seed-beds", summary="Seed all 50 beds (run once on setup)")
async def seed_beds_route(_: dict = AdminOnly):
    return await seed_beds()


@router.get("/beds", summary="Get full bed occupancy grid")
async def beds_route(_: dict = AdminOnly):
    return await get_all_beds()


@router.post("/admit-patient", summary="Admit a new patient and assign a bed")
async def admit_patient_route(payload: UserCreate, _: dict = AdminOnly):
    """
    Creates a 'user' account and marks the specified bed as occupied.
    Rejects if the bed is already taken.
    """
    return await admit_patient(payload)


@router.patch(
    "/toggle-status/{patient_id}",
    summary="Toggle patient Active ↔ Inactive (discharge / re-admit)",
)
async def toggle_status_route(patient_id: str, _: dict = AdminOnly):
    """
    Flips the patient's account_status.
    On deactivation: frees the bed (is_occupied=False, current_patient_id=null).
    """
    return await toggle_patient_status(patient_id)
