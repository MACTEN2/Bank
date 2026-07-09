from fastapi import APIRouter, Depends, HTTPException
from app.utils.auth_utils import get_current_user
from app.database import transaction_collection, account_collection
from app.controllers.account_controller import AccountController

router = APIRouter()

@router.post("/deposit")
async def deposit(payload: dict, current_user: dict = Depends(get_current_user)):
    try:
        amount = float(payload.get("amount", 0))
        account = await account_collection.find_one({"user_id": current_user["_id"]})
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        # Use AccountController with string ID
        await AccountController.deposit(str(account["_id"]), amount)
        return {"status": "success"}
    except Exception as e:
        print(f"ERR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/withdraw")
async def withdraw(payload: dict, current_user: dict = Depends(get_current_user)):
    try:
        amount = float(payload.get("amount", 0))
        account = await account_collection.find_one({"user_id": current_user["_id"]})
        if not account or account.get("balance", 0) < amount:
            raise HTTPException(status_code=400, detail="Insufficient funds")

        await AccountController.withdraw(str(account["_id"]), amount)
        return {"status": "success"}
    except Exception as e:
        print(f"ERR: {e}")
        raise HTTPException(status_code=500, detail=str(e))