from fastapi import APIRouter, Depends, HTTPException
from app.utils.auth_utils import get_current_user
from app.database import transaction_collection, account_collection
from app.controllers.account_controller import AccountController

router = APIRouter()

@router.get("/me")
async def get_my_transactions(current_user: dict = Depends(get_current_user)):
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return await AccountController.get_transactions(str(account["_id"]))

@router.post("/deposit")
async def deposit(payload: dict, current_user: dict = Depends(get_current_user)):
    amount = float(payload.get("amount", 0))
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Use AccountController with string ID
    await AccountController.deposit(str(account["_id"]), amount)
    return {"status": "success"}

@router.post("/withdraw")
async def withdraw(payload: dict, current_user: dict = Depends(get_current_user)):
    amount = float(payload.get("amount", 0))
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    await AccountController.withdraw(str(account["_id"]), amount)
    return {"status": "success"}