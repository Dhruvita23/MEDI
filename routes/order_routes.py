"""
routes/order_routes.py — Order processing endpoints.

POST  /api/orders/staff          — doctor or staff places an order (specifies floor/bed)
POST  /api/orders/patient        — patient places an order (floor/bed from JWT)
GET   /api/orders/               — list orders (filtered by role)
PATCH /api/orders/{id}/status    — chemist/admin updates order status
"""

from fastapi import APIRouter, Depends

from middleware.auth import require_roles, get_current_user
from controllers.order_controller import (
    create_staff_order,
    create_patient_order,
    get_orders,
    update_order_status,
)
from models.order_model import StaffOrderCreate, PatientOrderCreate
from pydantic import BaseModel

router = APIRouter()


class StatusUpdate(BaseModel):
    new_status: str


# ---------------------------------------------------------------------------
# Staff / Doctor order — must specify target floor + bed
# ---------------------------------------------------------------------------
@router.post("/staff", summary="Doctor or Staff places an order")
async def staff_order_route(
    payload:      StaffOrderCreate,
    current_user: dict = Depends(require_roles("doctor", "staff")),
):
    """
    Accepts items_list, target_floor, target_bed from the request body.
    Caller must be a doctor or staff member.
    """
    return await create_staff_order(payload, current_user)


# ---------------------------------------------------------------------------
# Patient order — floor/bed auto-injected from JWT
# ---------------------------------------------------------------------------
@router.post("/patient", summary="Patient places an order (bed auto-detected from token)")
async def patient_order_route(
    payload:      PatientOrderCreate,
    current_user: dict = Depends(require_roles("user")),
):
    """
    Patient only provides items_list and an optional prescription_image_url.
    The system reads their allocated_floor and allocated_bed from the JWT —
    they cannot order to a different bed.
    """
    return await create_patient_order(payload, current_user)


# ---------------------------------------------------------------------------
# List orders
# ---------------------------------------------------------------------------
@router.get("/", summary="List orders (scope depends on role)")
async def list_orders_route(
    current_user: dict = Depends(require_roles("admin_staff", "doctor", "staff", "chemist", "user")),
):
    return await get_orders(current_user)


# ---------------------------------------------------------------------------
# Update order status (chemist / admin only)
# ---------------------------------------------------------------------------
@router.patch("/{order_id}/status", summary="Update order status")
async def update_status_route(
    order_id:     str,
    body:         StatusUpdate,
    current_user: dict = Depends(require_roles("chemist", "admin_staff")),
):
    return await update_order_status(order_id, body.new_status, current_user)
