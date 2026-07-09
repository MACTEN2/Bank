from fastapi import APIRouter, Depends, HTTPException
from app.utils.auth_utils import admin_required
from app.database import user_collection, account_collection

router = APIRouter()

@router.get("/users/all", status_code=200)
async def get_all_users(admin: dict = Depends(admin_required)):
    """Only an Admin can see the full list of bank customers."""
    users = await user_collection.find().to_list(length=100)
    # Clean up the data for display
    for u in users:
        u["_id"] = str(u["_id"])
        # Use .pop() to safely remove password even if it's missing
        u.pop("password", None) 
    return users

@router.get("/accounts/all", status_code=200)
async def get_all_accounts(admin: dict = Depends(admin_required)):
    """Admin-only: See every account balance in the system."""
    try:
        # Fetch up to 100 accounts
        accounts = await account_collection.find().to_list(length=100)
        
        for a in accounts:
            # Convert ObjectId to string so JSON can read it
            a["_id"] = str(a["_id"])
            a["user_id"] = str(a["user_id"])
            
        return accounts
    except Exception as e:
        # This sends the specific error back to Postman if a DB issue occurs
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")