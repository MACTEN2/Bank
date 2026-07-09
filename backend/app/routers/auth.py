from fastapi import APIRouter, HTTPException, status
from app.database import user_collection, account_collection
from app.models.account_model import UserSchema
from app.utils.auth_utils import hash_password, verify_password, create_access_token
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

    # --- THE FIX: POSITIVE ROLE ASSIGNMENT ---
    # This says: "If the user object HAS a role (like 'admin'), use it. 
    # Otherwise, default to 'user'."
    if not user.role:
        user_data["role"] = "user"
    else:
        user_data["role"] = user.role
    
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

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.get("role", "user"),
        "user": {
            "email": user["email"],
            "id": user_id_str  # String only!
        }
    }