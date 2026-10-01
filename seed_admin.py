"""
seed_admin.py - Run this ONCE to create staff accounts and seed all 50 beds.
Usage: venv/Scripts/python.exe seed_admin.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME",   "medibot_hospital")

STAFF_ACCOUNTS = [
    {"full_name": "Admin User",  "email": "admin@medibot.com",   "password": "admin123",   "role": "admin_staff"},
    {"full_name": "Dr. Smith",   "email": "doctor@medibot.com",  "password": "doctor123",  "role": "doctor"},
    {"full_name": "Nurse Joy",   "email": "staff@medibot.com",   "password": "staff123",   "role": "staff"},
    {"full_name": "Chem Pharma", "email": "chemist@medibot.com", "password": "chemist123", "role": "chemist"},
]

async def seed():
    client = AsyncIOMotorClient(MONGO_URI)
    db     = client[DB_NAME]

    # 1. Seed staff accounts
    print("\n[1] Seeding staff accounts...")
    for acc in STAFF_ACCOUNTS:
        exists = await db["users"].find_one({"email": acc["email"]})
        if exists:
            print(f"    SKIP  {acc['email']} (already exists)")
            continue
        await db["users"].insert_one({
            "full_name":       acc["full_name"],
            "email":           acc["email"],
            "password_hash":   pwd_context.hash(acc["password"]),
            "role":            acc["role"],
            "account_status":  "Active",
            "patient_details": None,
        })
        print(f"    OK    {acc['email']}  role={acc['role']}")

    # 2. Seed 50 beds
    print("\n[2] Seeding beds...")
    count = await db["beds"].count_documents({})
    if count >= 50:
        print(f"    SKIP  Beds already seeded ({count} found)")
    else:
        bed_docs = [
            {"floor": f, "bed_number": b, "is_occupied": False, "current_patient_id": None}
            for f in range(1, 6)
            for b in range(1, 11)
        ]
        await db["beds"].insert_many(bed_docs)
        print("    OK    50 beds created (5 floors x 10 beds)")

    # 3. Seed patient (user) account
    print("\n[3] Seeding patient account...")
    patient_email = "patient@medibot.com"
    exists = await db["users"].find_one({"email": patient_email})
    if exists:
        print(f"    SKIP  {patient_email} (already exists)")
    else:
        # Check if floor 1 bed 1 is available
        bed = await db["beds"].find_one({"floor": 1, "bed_number": 1})
        if bed:
            # Insert patient user
            res = await db["users"].insert_one({
                "full_name": "John Doe (Patient)",
                "email": patient_email,
                "password_hash": pwd_context.hash("patient123"),
                "role": "user",
                "account_status": "Active",
                "patient_details": {
                    "allocated_floor": 1,
                    "allocated_bed": 1
                }
            })
            # Mark bed as occupied
            await db["beds"].update_one(
                {"floor": 1, "bed_number": 1},
                {"$set": {"is_occupied": True, "current_patient_id": str(res.inserted_id)}}
            )
            print(f"    OK    {patient_email}  role=user (Floor 1 Bed 1)")
        else:
            print("    ERROR Bed for patient seeding not found.")

    client.close()

    # Summary
    print("\n" + "="*52)
    print("  MEDIBOT seed complete!")
    print("="*52)
    print("\n  Login credentials:")
    print("  " + "-"*48)
    for acc in STAFF_ACCOUNTS:
        print(f"  role    : {acc['role']}")
        print(f"  email   : {acc['email']}")
        print(f"  password: {acc['password']}")
        print("  " + "-"*48)
    print(f"  role    : user (Patient)")
    print(f"  email   : {patient_email}")
    print(f"  password: patient123")
    print("  " + "-"*48)
    print("\n  Swagger UI -> http://127.0.0.1:8000/docs\n")

if __name__ == "__main__":
    asyncio.run(seed())
