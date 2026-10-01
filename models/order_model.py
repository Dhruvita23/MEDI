"""
models/order_model.py — Pydantic schemas for the Orders collection.

MongoDB document shape:
{
    _id: ObjectId,
    order_id:              str  (UUID),
    ordered_by_role:       str,
    ordered_by_id:         str,
    target_floor:          1-5,
    target_bed:            1-10,
    order_type:            "text_input" | "prescription_upload",
    items_list:            [str, ...],
    prescription_image_url: str | null,
    order_status:          "pending" | "processing" | "delivered" | "cancelled"
}
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class StaffOrderCreate(BaseModel):
    """
    Payload for doctor / staff placing an order.
    They must explicitly specify the target floor and bed.
    """
    target_floor:  int  = Field(..., ge=1, le=5)
    target_bed:    int  = Field(..., ge=1, le=10)
    items_list:    List[str] = Field(..., min_length=1)
    order_type:    Literal["text_input", "prescription_upload"] = "text_input"
    prescription_image_url: Optional[str] = None


class PatientOrderCreate(BaseModel):
    """
    Payload for a patient (user role) placing an order.
    Floor and bed are injected from the JWT — patient never types them.
    """
    items_list:             List[str] = Field(..., min_length=1)
    prescription_image_url: Optional[str] = None   # URL of uploaded image


class OrderResponse(BaseModel):
    """Public representation of a stored order."""
    id:                     str
    order_id:               str
    ordered_by_role:        str
    ordered_by_id:          str
    target_floor:           int
    target_bed:             int
    order_type:             str
    items_list:             List[str]
    prescription_image_url: Optional[str] = None
    order_status:           str
