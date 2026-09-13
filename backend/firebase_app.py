import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def _initialize_firebase():
    if firebase_admin._apps:
        return True

    # 1. Try environment variable containing JSON (for Render / cloud hosting)
    env_json = os.getenv("FIREBASE_SERVICE_ACCOUNT") or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if env_json:
        try:
            raw_str = env_json.strip()
            if not raw_str.startswith("{"):
                raw_str = base64.b64decode(raw_str).decode("utf-8")
            service_account_info = json.loads(raw_str)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized from environment variable.")
            return True
        except Exception as e:
            print(f"⚠️ Failed to initialize Firebase from env var: {e}")

    # 2. Try local file path
    env_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    cred_path_backend = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    cred_path_root = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")

    valid_path = None
    for p in [env_path, cred_path_backend, cred_path_root]:
        if p and os.path.exists(p):
            valid_path = p
            break

    if valid_path:
        try:
            cred = credentials.Certificate(valid_path)
            firebase_admin.initialize_app(cred)
            print(f"✅ Firebase Admin SDK initialized from file: {valid_path}")
            return True
        except Exception as e:
            print(f"⚠️ Failed to initialize Firebase from file ({valid_path}): {e}")

    print("⚠️ Firebase Admin SDK NOT initialized (missing serviceAccountKey.json or FIREBASE_SERVICE_ACCOUNT env var).")
    return False

# Trigger initialization on module import
_initialize_firebase()

def get_db():
    if not firebase_admin._apps:
        return None
    try:
        return firestore.client()
    except Exception as e:
        print(f"⚠️ Could not get Firestore client: {e}")
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """FastAPI Dependency to verify Firebase ID tokens."""
    if not firebase_admin._apps:
        raise HTTPException(
            status_code=503,
            detail="Firebase Admin Auth is not initialized on server. Please set FIREBASE_SERVICE_ACCOUNT environment variable."
        )
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {e}")

