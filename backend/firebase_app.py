import os
import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# Initialize Firebase Admin SDK
cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
if os.path.exists(cred_path) and not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK initialized.")
    except Exception as e:
        print(f"⚠️ Failed to initialize Firebase Admin: {e}")

def get_db():
    if not firebase_admin._apps:
        raise HTTPException(status_code=500, detail="Firebase Admin not initialized.")
    return firestore.client()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """FastAPI Dependency to verify Firebase ID tokens."""
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {e}")
