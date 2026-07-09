from pydantic import BaseModel, EmailStr, Field, ConfigDict # Updated import
from pydantic_core import core_schema # For v2 validation
from bson import ObjectId
from datetime import datetime
from typing import Optional, Any

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ]),
            # FIXED LINE BELOW: Changed 'plain_serializer_function_with_info' 
            # to 'plain_serializer_function_ser_schema'
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda v, _: str(v)
            ),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

# Example of updated UserSchema using ConfigDict
class UserSchema(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    email: EmailStr
    password: str 
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # In Pydantic v2, we use model_config instead of class Config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class AccountSchema(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId
    account_type: str
    balance: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class TransactionSchema(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    account_id: PyObjectId
    amount: float
    transaction_type: str  # e.g., 'deposit', 'withdrawal'
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )