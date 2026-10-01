"""
config/database.py — Async MongoDB connection manager using Motor.
Exposes a `get_db()` helper used by all controllers.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Module-level client reference (initialised on startup)
_client: AsyncIOMotorClient = None


async def connect_db():
    """Open the MongoDB connection pool when the app starts."""
    global _client
    _client = AsyncIOMotorClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    print("[DB] Connected to MongoDB")


async def close_db():
    """Close the MongoDB connection pool when the app shuts down."""
    global _client
    if _client:
        _client.close()
        print("[DB] MongoDB connection closed")


def get_db():
    """
    Returns the database instance.
    Used as a FastAPI dependency: db = Depends(get_db)
    """
    db_name = os.getenv("DB_NAME", "medibot_hospital")
    return _client[db_name]
