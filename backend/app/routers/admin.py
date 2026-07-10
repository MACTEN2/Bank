from fastapi import APIRouter, Depends, HTTPException, Body
from app.utils.auth_utils import admin_required
from app.database import user_collection, account_collection, transaction_collection
from app.controllers.account_controller import AccountController
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.get("/users/all", status_code=200)
async def get_all_users(admin: dict = Depends(admin_required)):
    """Only an Admin can see the full list of bank customers."""
    users = await user_collection.find().to_list(length=100)
    # Clean up the data for display
    for u in users:
        u["_id"] = str(u["_id"])
        # Use .pop() to safely remove password even if it's missing
        u.pop("password", None)
    return users

@router.get("/accounts/all", status_code=200)
async def get_all_accounts(admin: dict = Depends(admin_required)):
    """Admin-only: See every account balance in the system."""
    try:
        # Fetch up to 100 accounts
        accounts = await account_collection.find().to_list(length=100)

        for a in accounts:
            # Convert ObjectId to string so JSON can read it
            a["_id"] = str(a["_id"])
            a["user_id"] = str(a["user_id"])
            a.setdefault("status", "active")

        return accounts
    except Exception as e:
        # This sends the specific error back to Postman if a DB issue occurs
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


@router.get("/accounts/{account_id}/transactions")
async def get_account_transactions(account_id: str, admin: dict = Depends(admin_required)):
    """Admin-only: full transaction history for a single customer's account."""
    if not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=400, detail="Invalid account ID")

    transactions = await AccountController.get_transactions(account_id)
    if transactions is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return transactions


@router.post("/accounts/{account_id}/adjust", status_code=200)
async def adjust_account_balance(account_id: str, payload: dict, admin: dict = Depends(admin_required)):
    """Admin-only: manually credit or debit an account, e.g. for support cases."""
    if not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=400, detail="Invalid account ID")

    try:
        amount = float(payload.get("amount"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Amount must be a number")

    adjustment_type = payload.get("type")
    reason = (payload.get("reason") or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="A reason is required for manual adjustments")

    return await AccountController.admin_adjust(account_id, amount, adjustment_type, reason)


@router.post("/accounts/{account_id}/freeze", status_code=200)
async def toggle_account_freeze(account_id: str, payload: dict = Body(default={}), admin: dict = Depends(admin_required)):
    """Admin-only: freeze an active account, or unfreeze a frozen one."""
    if not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=400, detail="Invalid account ID")

    account = await account_collection.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    new_status = "active" if account.get("status") == "frozen" else "frozen"
    frozen_reason = (payload or {}).get("reason") or None if new_status == "frozen" else None

    await account_collection.update_one(
        {"_id": ObjectId(account_id)},
        {"$set": {"status": new_status, "frozen_reason": frozen_reason}}
    )
    return {"message": f"Account is now {new_status}", "status": new_status, "frozen_reason": frozen_reason}


@router.patch("/users/{user_id}/role", status_code=200)
async def update_user_role(user_id: str, payload: dict, admin: dict = Depends(admin_required)):
    """Admin-only: promote a user to admin, or demote an admin back to user."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    new_role = payload.get("role")
    if new_role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'user'")

    if str(admin["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="You can't change your own role")

    target = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await user_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role}})
    return {"message": f"User role updated to {new_role}", "role": new_role}


@router.get("/transactions/feed")
async def get_transaction_feed(admin: dict = Depends(admin_required), limit: int = 50):
    """Admin-only: a live feed of the most recent transactions across the whole bank."""
    limit = max(1, min(limit, 200))
    transactions = await transaction_collection.find().sort("created_at", -1).to_list(length=limit)

    accounts = await account_collection.find().to_list(length=1000)
    accounts_by_id = {str(a["_id"]): a for a in accounts}
    users = await user_collection.find().to_list(length=1000)
    users_by_id = {str(u["_id"]): u for u in users}

    feed = []
    for tx in transactions:
        account = accounts_by_id.get(str(tx.get("account_id")))
        owner = users_by_id.get(str(account["user_id"])) if account else None
        created_at = tx.get("created_at")
        feed.append({
            "_id": str(tx["_id"]),
            "account_id": str(tx.get("account_id")),
            "txn_type": tx.get("txn_type"),
            "amount": tx.get("amount"),
            "reason": tx.get("reason"),
            "created_at": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
            "owner_email": owner["email"] if owner else "Unknown",
        })
    return feed
