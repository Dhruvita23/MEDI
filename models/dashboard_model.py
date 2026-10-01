"""
models/dashboard_model.py — Pydantic schemas for dashboard data.
"""

from pydantic import BaseModel


class AdminDashboardSummary(BaseModel):
    total_beds: int
    occupied_beds: int
    available_beds: int
    total_orders: int
    pending_orders: int
    processing_orders: int
    delivered_orders: int
    cancelled_orders: int