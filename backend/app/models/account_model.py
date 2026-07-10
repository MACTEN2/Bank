from app.database import account_collection, transaction_collection
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone

class AccountModel:
    @staticmethod
    async def find_by_id(acc_id):
        return await account_collection.find_one({"_id": ObjectId(acc_id)})

    @staticmethod
    async def update_balance(acc_id, new_balance):
        await account_collection.update_one(
            {"_id": ObjectId(acc_id)}, 
            {"$set": {"balance": new_balance}}
        )

    @staticmethod
    async def create_transaction(txn_data):
        await transaction_collection.insert_one(txn_data)

    @staticmethod
    async def get_txns_by_acc(acc_id):
        # Professional standard: Sort by newest first
        cursor = transaction_collection.find({"account_id": ObjectId(acc_id)}).sort("created_at", -1)
        return await cursor.to_list(length=100)
    
    @staticmethod
    async def find_by_id(acc_id: str):
        """Requirement 4.1: Fetch account by unique MongoDB ID"""
        return await account_collection.find_one({"_id": ObjectId(acc_id)}) 
    

class UserSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # No client-settable role here on purpose — self-service registration must
    # never be able to grant admin. New accounts always start as "user"; admin
    # status can only be granted afterwards by an existing admin.

class UserResponse(BaseModel):
    #Used to send user data back to the frontend without the password
    id: str
    name: str
    email: EmailStr
    created_at: datetime

class AccountSchema(BaseModel):
    user_id: str
    balance: float = 0.0
    account_type: str = "Checking"
    # Use default_factory so the time is generated at the moment of creation
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionSchema(BaseModel):
    account_id: str
    txn_type: str
    amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

