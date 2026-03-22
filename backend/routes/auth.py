from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from utils.auth import get_current_user  # This now works because of the alias we added
from firebase_admin import auth

router = APIRouter()

class SetRoleRequest(BaseModel):
    role: str  # "student" or "teacher"

@router.post("/set-role")
async def set_user_role(request: SetRoleRequest, current_user: dict = Depends(get_current_user)):
    """Set user role (called after Firebase authentication)"""
    try:
        # Set custom claims in Firebase
        auth.set_custom_user_claims(current_user["uid"], {"role": request.role})
        return {"message": f"Role set to {request.role}", "role": request.role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set role: {str(e)}")

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@router.post("/verify-token")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """
    Verify Firebase ID token.
    UPDATED: Uses Depends() instead of manual Request parsing for better security.
    """
    return {"valid": True, "user": current_user}