import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any
from firebase_admin import firestore

from backend.firebase_app import get_db, get_current_user

router = APIRouter()

class AlertSubscribeRequest(BaseModel):
    crop: str
    pincode: str
    target_price: float
    phone_number: str

@router.post("/alerts/subscribe")
def subscribe_alert(req: AlertSubscribeRequest, user: dict = Depends(get_current_user), db: Any = Depends(get_db)):
    """
    Subscribes an authenticated farmer to an SMS alert for a specific crop and target price.
    Stores the alert in Firestore.
    """
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    try:
        # Save to Firestore 'price_alerts' collection
        alert_ref = db.collection("price_alerts").document()
        alert_data = {
            "uid": uid,
            "phone_number": req.phone_number,
            "crop": req.crop,
            "pincode": req.pincode,
            "target_price": req.target_price,
            "is_active": True,
            "created_at": firestore.SERVER_TIMESTAMP
        }
        alert_ref.set(alert_data)
        
        return {"status": "success", "message": f"Alert set for {req.crop} > ₹{req.target_price}/quintal.", "alert_id": alert_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert in Firestore: {e}")
