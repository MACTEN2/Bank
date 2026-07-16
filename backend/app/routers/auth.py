from fastapi import APIRouter, HTTPException, status, Depends, Request
from pymongo.errors import DuplicateKeyError
from app.database import user_collection, account_collection, login_event_collection
from app.models.account_model import UserSchema
from app.utils.auth_utils import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserSchema):
    # Normalize so "Test@Example.com" and "test@example.com " are treated as
    # the same account — case/whitespace variants must not slip past the
    # duplicate check.
    email = user.email.strip().lower()

    # 1. Check if user exists (Keep your existing check here)
    existing_user = await user_collection.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Prepare data
    user_data = user.model_dump(exclude={"id"})
    user_data["email"] = email
    user_data["password"] = hash_password(user.password)
    user_data["created_at"] = datetime.utcnow()

    # Self-service registration always creates a plain "user" — there is no
    # request field that can change this. Admin status can only be granted
    # afterwards by an existing admin via PATCH /admin/users/{id}/role, or
    # seeded directly with scripts/create_admin.py for the very first admin.
    user_data["role"] = "user"

    # Save User to USERS Collection. The unique index on users.email (created
    # at startup — see main.py) is the real guarantee against duplicates: it
    # catches the race where two requests both pass the find_one check above
    # before either has inserted.
    try:
        user_result = await user_collection.insert_one(user_data)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
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
async def login(payload: dict, request: Request):
    email = (payload.get("email") or "").strip().lower()
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
    now = datetime.utcnow()
    await user_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now}}
    )

    # Recent-logins security log — surfaced on Settings so a user can spot
    # activity that wasn't them.
    await login_event_collection.insert_one({
        "user_id": user["_id"],
        "created_at": now,
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    })

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


@router.get("/login-history")
async def get_login_history(current_user: dict = Depends(get_current_user)):
    events = await login_event_collection.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(length=20)
    return [
        {
            "_id": str(e["_id"]),
            "created_at": e["created_at"],
            "ip_address": e.get("ip_address"),
            "user_agent": e.get("user_agent"),
        }
        for e in events
    ]


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