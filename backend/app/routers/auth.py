from fastapi import APIRouter, HTTPException, status, Depends
from app.database import user_collection, account_collection
from app.models.account_model import UserSchema
from app.utils.auth_utils import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserSchema):
    # 1. Check if user exists (Keep your existing check here)
    existing_user = await user_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Prepare data
    user_data = user.model_dump(exclude={"id"})
    user_data["password"] = hash_password(user.password)
    user_data["created_at"] = datetime.utcnow()

    # Self-service registration always creates a plain "user" — there is no
    # request field that can change this. Admin status can only be granted
    # afterwards by an existing admin via PATCH /admin/users/{id}/role, or
    # seeded directly with scripts/create_admin.py for the very first admin.
    user_data["role"] = "user"

    # Save User to USERS Collection
    user_result = await user_collection.insert_one(user_data)
    user_id = user_result.inserted_id

    # 3. STRICT REQUIREMENT: Create the initial Bank Account for this User
    new_account = {
        "user_id": user_id,
        "balance": 0.0,
        "account_type": "Checking",
        "created_at": datetime.utcnow()
    }
    await account_collection.insert_one(new_account)

    return {
        "message": "User and Account created successfully", 
        "user_id": str(user_id),
        "role": user_data["role"] # Added to response for confirmation
    }

@router.post("/login")
async def login(payload: dict):
    email = payload.get("email")
    password = payload.get("password")

    user = await user_collection.find_one({"email": email})

    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # THE FIX: Ensure the user ID is a string before making the token
    user_id_str = str(user["_id"])
    token = create_access_token(data={"sub": user_id_str})

    # A user who has never logged in before (no last_login yet) gets a
    # first-time welcome message on the frontend instead of "welcome back".
    is_first_login = user.get("last_login") is None
    await user_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.get("role", "user"),
        "first_login": is_first_login,
        "user": {
            "email": user["email"],
            "name": user.get("name", ""),
            "id": user_id_str  # String only!
        }
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "name": current_user.get("name", ""),
        "email": current_user["email"],
        "role": current_user.get("role", "user"),
    }


@router.patch("/me")
async def update_me(payload: dict, current_user: dict = Depends(get_current_user)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    await user_collection.update_one({"_id": current_user["_id"]}, {"$set": {"name": name}})
    return {"message": "Profile updated successfully", "name": name}


@router.post("/change-password")
async def change_password(payload: dict, current_user: dict = Depends(get_current_user)):
    current_password = payload.get("current_password")
    new_password = payload.get("new_password")

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new password are required")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    if not verify_password(current_password, current_user["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    await user_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hash_password(new_password)}}
    )
    return {"message": "Password updated successfully"}