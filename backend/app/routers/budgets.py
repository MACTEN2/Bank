from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import budget_collection, account_collection, transaction_collection
from app.utils.auth_utils import get_current_user
from app.constants import SPENDING_CATEGORIES

router = APIRouter()


async def month_to_date_spend(account_id, category: str) -> float:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cursor = transaction_collection.find({
        "account_id": account_id,
        "category": category,
        "txn_type": "withdrawal",
        "created_at": {"$gte": month_start},
    })
    total = 0.0
    async for txn in cursor:
        total += txn["amount"]
    return total


@router.post("", status_code=201)
async def upsert_budget(payload: dict, current_user: dict = Depends(get_current_user)):
    category = payload.get("category")
    if category not in SPENDING_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {SPENDING_CATEGORIES}")

    try:
        monthly_limit = float(payload.get("monthly_limit"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="monthly_limit must be a number")
    if monthly_limit <= 0:
        raise HTTPException(status_code=400, detail="monthly_limit must be positive")

    now = datetime.now(timezone.utc)
    await budget_collection.update_one(
        {"user_id": current_user["_id"], "category": category},
        {"$set": {"monthly_limit": monthly_limit}, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    budget = await budget_collection.find_one({"user_id": current_user["_id"], "category": category})
    budget["_id"] = str(budget["_id"])
    budget["user_id"] = str(budget["user_id"])
    return budget


@router.get("/me")
async def get_my_budgets(current_user: dict = Depends(get_current_user)):
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    budgets = await budget_collection.find({"user_id": current_user["_id"]}).to_list(length=100)

    result = []
    for b in budgets:
        spent = await month_to_date_spend(account["_id"], b["category"]) if account else 0.0
        result.append({
            "_id": str(b["_id"]),
            "user_id": str(b["user_id"]),
            "category": b["category"],
            "monthly_limit": b["monthly_limit"],
            "spent": spent,
            "percent_used": round(min(spent / b["monthly_limit"], 1.5) * 100, 1) if b["monthly_limit"] else 0,
        })
    return result


@router.delete("/{budget_id}", status_code=200)
async def delete_budget(budget_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(budget_id):
        raise HTTPException(status_code=400, detail="Invalid budget ID")
    budget = await budget_collection.find_one({"_id": ObjectId(budget_id)})
    if not budget or budget["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Budget not found")

    await budget_collection.delete_one({"_id": budget["_id"]})
    return {"message": "Budget deleted"}
