import firebase_admin
from firebase_admin import auth
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Define the security scheme
security = HTTPBearer()

def verify_firebase_token(res: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validates the Firebase JWT token from the Authorization header.
    Returns the decoded user payload (including email and uid) if valid.
    """
    token = res.credentials
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        return decoded_token
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ALIAS: This makes your old code (which looks for get_current_user) 
# work with the new function name.
get_current_user = verify_firebase_token