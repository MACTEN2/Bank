from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import beneficiary_collection, account_collection
from app.utils.auth_utils import get_current_user

router = APIRouter()


def serialize(b):
    b["_id"] = str(b["_id"])
    b["user_id"] = str(b["user_id"])
    b["account_id"] = str(b["account_id"])
    return b


@router.post("", status_code=201)
async def create_beneficiary(payload: dict, current_user: dict = Depends(get_current_user)):
    nickname = (payload.get("nickname") or "").strip()
    account_id = payload.get("account_id")

    if not nickname:
        raise HTTPException(status_code=400, detail="Nickname is required")
    if not account_id or not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=400, detail="Invalid account ID")

    own_account = await account_collection.find_one({"user_id": current_user["_id"]})
    if own_account and str(own_account["_id"]) == str(account_id):
        raise HTTPException(status_code=400, detail="You can't save your own account as a recipient")

    # Catch typos at save time, not the next time the user tries to transfer.
    target_account = await account_collection.find_one({"_id": ObjectId(account_id)})
    if not target_account:
        raise HTTPException(status_code=404, detail="No account found with that ID")

    doc = {
        "user_id": current_user["_id"],
        "nickname": nickname,
        "account_id": target_account["_id"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await beneficiary_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("/me")
async def get_my_beneficiaries(current_user: dict = Depends(get_current_user)):
    beneficiaries = await beneficiary_collection.find(
        {"user_id": current_user["_id"]}
    ).sort("nickname", 1).to_list(length=200)
    return [serialize(b) for b in beneficiaries]


@router.delete("/{beneficiary_id}", status_code=200)
async def delete_beneficiary(beneficiary_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(beneficiary_id):
        raise HTTPException(status_code=400, detail="Invalid beneficiary ID")
    beneficiary = await beneficiary_collection.find_one({"_id": ObjectId(beneficiary_id)})
    if not beneficiary or beneficiary["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Recipient not found")

    await beneficiary_collection.delete_one({"_id": beneficiary["_id"]})
    return {"message": "Recipient removed"}
