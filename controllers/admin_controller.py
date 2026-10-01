"""
controllers/admin_controller.py — Admin Staff operations.

Endpoints handled:
  1. admit_patient   — creates a 'user' account and marks the bed occupied.
  2. toggle_status   — flips Active ↔ Inactive; frees the bed on deactivation.
  3. seed_beds       — one-time utility to populate all 50 beds in the master table.
  4. get_all_beds    — returns the full bed occupancy grid.
"""

from bson.errors import InvalidId
from bson import ObjectId
from fastapi import HTTPException, status
from config.database import get_db # Use imported serialize_doc
from controllers.auth_controller import hash_password
from models.user_model import UserCreate
from controllers.mongo_utils import serialize_doc

# ---------------------------------------------------------------------------
# 1. Admit Patient
# ---------------------------------------------------------------------------

async def admit_patient(payload: UserCreate) -> dict:
    """
    Creates a new patient ('user' role) account.

    Steps:
      1. Verify the requested bed exists and is NOT already occupied.
      2. Hash the supplied password.
      3. Insert the user document with role='user', status='Active'.
      4. Mark the bed as occupied and store the new patient's ID.
    """
    db = get_db()

    # --- Step 1: Bed availability check ---
    bed = await db["beds"].find_one({
        "floor":      payload.allocated_floor,
        "bed_number": payload.allocated_bed,
    })

    if not bed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bed {payload.allocated_bed} on floor {payload.allocated_floor} does not exist.",
        )

    if bed["is_occupied"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bed {payload.allocated_bed} on floor {payload.allocated_floor} is already occupied.",
        )

    # --- Step 2 & 3: Create user document ---
    user_doc = {
        "full_name":      payload.full_name,
        "email":          payload.email,
        "password_hash":  hash_password(payload.password),
        "role":           "user",
        "account_status": "Active",
        "patient_details": {
            "allocated_floor": payload.allocated_floor,
            "allocated_bed":   payload.allocated_bed,
        },
    }

    result = await db["users"].insert_one(user_doc)
    new_patient_id = str(result.inserted_id)

    # --- Step 4: Mark bed as occupied ---
    await db["beds"].update_one(
        {"floor": payload.allocated_floor, "bed_number": payload.allocated_bed},
        {"$set": {"is_occupied": True, "current_patient_id": new_patient_id}},
    )

    return {
        "message":    "Patient admitted successfully.",
        "patient_id": new_patient_id,
        "floor":      payload.allocated_floor,
        "bed":        payload.allocated_bed,
    }


# ---------------------------------------------------------------------------
# 2. Toggle Patient Status (Active ↔ Inactive)
# ---------------------------------------------------------------------------

async def toggle_patient_status(patient_id: str) -> dict:
    """
    Flips a patient's account_status between 'Active' and 'Inactive'.

    INTERLOCK: When flipped to 'Inactive' (i.e., discharged):
      - Sets is_occupied = False on their bed.
      - Clears current_patient_id on their bed.
    """
    db = get_db()

    # Fetch the patient
    try:
        oid = ObjectId(patient_id) # type: ignore
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient ID format.")

    patient = await db["users"].find_one({"_id": oid, "role": "user"})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    # Determine the new status
    current_status = patient["account_status"]
    new_status     = "Inactive" if current_status == "Active" else "Active"

    # Update the user document
    await db["users"].update_one(
        {"_id": oid},
        {"$set": {"account_status": new_status}},
    )

    # --- Discharge interlock: free the bed when deactivating ---
    if new_status == "Inactive":
        details = patient.get("patient_details") or {}
        await db["beds"].update_one(
            {
                "floor":      details.get("allocated_floor"),
                "bed_number": details.get("allocated_bed"),
            },
            {"$set": {"is_occupied": False, "current_patient_id": None}},
        )
        message = "Patient discharged. Bed has been freed."
    else:
        message = "Patient account re-activated."

    return {
        "message":    message,
        "patient_id": patient_id,
        "new_status": new_status,
    }


# ---------------------------------------------------------------------------
# 3. Seed Beds (one-time utility)
# ---------------------------------------------------------------------------

async def seed_beds() -> dict:
    """
    Populates the 'beds' collection with all 50 beds (5 floors × 10 beds).
    Safe to call multiple times — skips beds that already exist.
    """
    db    = get_db()
    count = await db["beds"].count_documents({})

    if count >= 50:
        return {"message": "Beds already seeded.", "total_beds": count}

    bed_docs = [
        {
            "floor":              floor,
            "bed_number":         bed,
            "is_occupied":        False,
            "current_patient_id": None,
        }
        for floor in range(1, 6)
        for bed   in range(1, 11)
    ]

    await db["beds"].insert_many(bed_docs)
    return {"message": "50 beds seeded successfully.", "total_beds": 50}


# ---------------------------------------------------------------------------
# 4. Get All Beds
# ---------------------------------------------------------------------------

async def get_all_beds() -> list:
    """Returns the full occupancy grid for all 50 beds, sorted by floor then bed."""
    db   = get_db()
    beds = await db["beds"].find({}).sort([("floor", 1), ("bed_number", 1)]).to_list(length=50)
    return [serialize_doc(b) for b in beds]
