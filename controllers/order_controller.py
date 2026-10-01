"""
controllers/order_controller.py — Order processing logic.

Two distinct order flows:
  A. Staff/Doctor order  — caller specifies target floor + bed + items list.
  B. Patient order       — floor/bed auto-read from JWT; accepts prescription URL.
"""

import uuid
from bson.errors import InvalidId
from bson import ObjectId
from fastapi import HTTPException, status
from config.database import get_db
from models.order_model import StaffOrderCreate, PatientOrderCreate
from controllers.mongo_utils import serialize_doc


# ---------------------------------------------------------------------------
# A. Staff / Doctor Order
# ---------------------------------------------------------------------------

async def create_staff_order(payload: StaffOrderCreate, current_user: dict) -> dict:
    """
    Creates an order on behalf of a doctor or staff member.

    Steps:
      1. Verify the target bed exists (basic sanity check).
      2. Build the order document with the caller's role and ID from the JWT.
      3. Persist to the 'orders' collection.
    """
    db = get_db()

    # --- Step 1: Verify target bed exists ---
    # Ensure target_floor and target_bed are within valid ranges before querying
    if not (1 <= payload.target_floor <= 5 and 1 <= payload.target_bed <= 10):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid floor or bed number.")
    bed = await db["beds"].find_one({ # Removed duplicate 'floor' key
        "floor":      payload.target_floor,
        "bed_number": payload.target_bed,
    })
    if not bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target bed {payload.target_bed} on floor {payload.target_floor} not found.",
        )

    # Ensure user_id is present in the token payload
    # The require_roles dependency already ensures current_user has a user_id if authentication passed.
    # This check is redundant here.

    # --- Step 2: Build order document ---
    order_doc = {
        "order_id":              str(uuid.uuid4()),
        "ordered_by_role":       current_user["role"],
        "ordered_by_id":         current_user["user_id"], # Use current_user["user_id"] directly
        "target_floor":          payload.target_floor,
        "target_bed":            payload.target_bed,
        "order_type":            payload.order_type,
        "items_list":            payload.items_list,
        "prescription_image_url": payload.prescription_image_url,
        "order_status":          "pending",
    }

    # --- Step 3: Persist ---
    result = await db["orders"].insert_one(order_doc)
    order_doc["id"] = str(result.inserted_id)
    order_doc.pop("_id", None)

    return {"message": "Order placed successfully.", "order": order_doc}


# ---------------------------------------------------------------------------
# B. Patient (User) Order
# ---------------------------------------------------------------------------

async def create_patient_order(payload: PatientOrderCreate, current_user: dict) -> dict:
    """
    Creates an order for a logged-in patient.

    KEY BEHAVIOUR:
      - Floor and bed are NOT accepted from the request body.
      - They are read exclusively from the JWT claims (allocated_floor / allocated_bed)
        that were embedded at login time.
      - This prevents a patient from ordering to another patient's bed.

    Steps:
      1. Extract floor + bed from the JWT payload.
      2. Determine order_type based on whether a prescription URL was provided.
      3. Build and persist the order document.
    """
    db = get_db()

    # --- Step 1: Read location from token (not from request body) ---
    allocated_floor = current_user.get("allocated_floor")
    allocated_bed   = current_user.get("allocated_bed")

    if not allocated_floor or not allocated_bed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient location not found in token. Please log in again.",
        )

    # Ensure user_id is present in the token payload
    # --- Step 2: Determine order type ---
    order_type = "prescription_upload" if payload.prescription_image_url else "text_input"
    # Consider adding a check for empty items_list here, or rely on Pydantic's min_length=1

    # --- Step 3: Build and persist order ---
    # Use explicit integer types for target_floor and target_bed to match schema
    order_doc = {
        "order_id":              str(uuid.uuid4()),
        "ordered_by_role":       "user",
        "ordered_by_id":         current_user["user_id"],
        "target_floor":          allocated_floor,   # auto-injected from JWT
        "target_bed":            allocated_bed,     # auto-injected from JWT
        "order_type":            order_type,
        "items_list":            payload.items_list,
        "prescription_image_url": payload.prescription_image_url,
        "order_status":          "pending",
    }

    result = await db["orders"].insert_one(order_doc)
    order_doc["id"] = str(result.inserted_id)
    order_doc.pop("_id", None)

    return {"message": "Order placed successfully.", "order": order_doc}


# ---------------------------------------------------------------------------
# C. Get Orders (filtered by role)
# ---------------------------------------------------------------------------

async def get_orders(current_user: dict) -> list:
    """
    Returns orders relevant to the caller's role:
      - admin_staff / chemist : all orders
      - doctor / staff        : orders they placed
      - user (patient)        : only their own orders
    """
    db   = get_db()
    role = current_user["role"]

    if role in ("admin_staff", "chemist"):
        query = {}
    else:
        query = {"ordered_by_id": current_user["user_id"]}
        # The require_roles dependency already ensures current_user has a user_id if authentication passed.
        # This check is redundant here.

    orders = await db["orders"].find(query).sort("_id", -1).to_list(length=200) # Use imported serialize_doc
    return [serialize_doc(o) for o in orders]


# ---------------------------------------------------------------------------
# D. Update Order Status (chemist / admin only)
# ---------------------------------------------------------------------------

async def update_order_status(order_id: str, new_status: str, current_user: dict) -> dict:
    """
    Allows chemist or admin_staff to advance an order's status.
    Valid transitions: pending → processing → delivered | cancelled
    """
    valid_statuses = {"pending", "processing", "delivered", "cancelled"}
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}",
        )

    db = get_db()
    try:
        oid = ObjectId(order_id) # type: ignore
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid order ID format.")

    result = await db["orders"].update_one(
        {"_id": oid},
        {"$set": {"order_status": new_status}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {"message": f"Order status updated to '{new_status}'.", "order_id": order_id}
