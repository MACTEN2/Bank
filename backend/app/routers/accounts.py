from fastapi import APIRouter, HTTPException, Depends, status
from app.controllers.account_controller import AccountController
from app.utils.auth_utils import get_current_user
from bson import ObjectId
from app.database import account_collection
from app.services.notifications import create_notification

router = APIRouter()

@router.get("/me")
async def get_my_account(current_user: dict = Depends(get_current_user)):
    account = await account_collection.find_one({"user_id": current_user["_id"]})

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # THE FIX: Convert ALL potential ObjectIds to strings
    account["_id"] = str(account["_id"])
    if "user_id" in account:
        account["user_id"] = str(account["user_id"])

    return account


# Self-service card lock — must stay above the /{id} route (like /me above)
# so "lock" isn't swallowed as a dynamic account ID.
@router.post("/lock")
async def toggle_own_account_lock(current_user: dict = Depends(get_current_user)):
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    new_status = "active" if account.get("status") == "frozen" else "frozen"
    frozen_reason = "Locked by cardholder" if new_status == "frozen" else None

    await account_collection.update_one(
        {"_id": account["_id"]},
        {"$set": {"status": new_status, "frozen_reason": frozen_reason}}
    )

    await create_notification(
        current_user["_id"],
        "card_lock" if new_status == "frozen" else "card_unlock",
        "Card locked" if new_status == "frozen" else "Card unlocked",
        "Your card was locked — deposits, withdrawals, and transfers are paused until you unlock it."
        if new_status == "frozen" else
        "Your card was unlocked and can be used normally again."
    )

    return {"message": f"Card is now {new_status}", "status": new_status, "frozen_reason": frozen_reason}


# 2. Dynamic ID route comes AFTER static routes
@router.get("/{id}")
async def get_account_by_id(id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    account = await AccountController.get_account(id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    return account

# 3. POST (DEPOSIT) - Accuracy to the brim
@router.post("/deposit")
async def deposit_money(payload: dict, current_user: dict = Depends(get_current_user)):
    # 1. Get the account linked to the user
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    amount = payload.get("amount")
    
    # 2. Convert ID to string before passing to Controller
    account_id_str = str(account["_id"])
    
    # 3. Call the controller
    result = await AccountController.deposit(account_id_str, float(amount))
    return result

@router.post("/withdraw")
async def withdraw_money(payload: dict, current_user: dict = Depends(get_current_user)):
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    amount = payload.get("amount")
    account_id_str = str(account["_id"])
    
    return await AccountController.withdraw(account_id_str, float(amount))


# 5. POST (TRANSFER) - Secure Peer-to-Peer
@router.post("/transfer", status_code=200)
async def transfer_money(payload: dict, current_user: dict = Depends(get_current_user)):
    from_account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not from_account:
        raise HTTPException(status_code=404, detail="Your account was not found")

    to_id = payload.get("to_account_id")  # This should be the recipient's Account ID
    amount = payload.get("amount")
    category = payload.get("category")

    if not to_id or not ObjectId.is_valid(to_id):
        raise HTTPException(status_code=400, detail="Invalid recipient account ID")

    if str(from_account["_id"]) == str(to_id):
        raise HTTPException(status_code=400, detail="You can't transfer to your own account")

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Amount must be a number")

    return await AccountController.transfer(str(from_account["_id"]), to_id, amount, category)