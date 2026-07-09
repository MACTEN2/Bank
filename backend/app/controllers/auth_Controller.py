from app.models.account_model import UserSchema, AccountModel
from app.database import db
from fastapi import HTTPException
import datetime

class AuthController:
    @staticmethod
    async def register_user(user_data: UserSchema):
        # 1. Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # 2. Prepare user document (Requirement 4.1)
        user_dict = user_data.dict()
        # Note: Password hashing will be added in the next step
        
        # 3. Insert into USERS collection
        new_user = await db.users.insert_one(user_dict)
        
        # 4. Automatically create a default Checking account for the new user (Requirement 31)
        await AccountModel.account_collection.insert_one({
            "user_id": new_user.inserted_id,
            "balance": 0.0,
            "account_type": "Checking",
            "created_at": datetime.datetime.utcnow()
        })

        return {"message": "User registered successfully", "user_id": str(new_user.inserted_id)}