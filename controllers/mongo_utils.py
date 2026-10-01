"""
utils/mongo_utils.py — Helper functions for MongoDB operations.
"""

from bson import ObjectId

def serialize_doc(doc: dict) -> dict:
    """
    Converts a MongoDB document (dict) into a serializable format.
    Specifically, it converts the '_id' ObjectId to a string 'id' field.
    """
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc