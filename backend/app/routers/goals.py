from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.database import goal_collection
from app.utils.auth_utils import get_current_user
from app.services.notifications import create_notification

router = APIRouter()


def serialize_goal(g):
    g["_id"] = str(g["_id"])
    g["user_id"] = str(g["user_id"])
    return g


@router.post("", status_code=201)
async def create_goal(payload: dict, current_user: dict = Depends(get_current_user)):
    name = (payload.get("name") or "").strip()
    try:
        target_amount = float(payload.get("target_amount"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="target_amount must be a number")

    if not name:
        raise HTTPException(status_code=400, detail="Goal name is required")
    if target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be positive")

    goal = {
        "user_id": current_user["_id"],
        "name": name,
        "target_amount": target_amount,
        "saved_amount": 0.0,
        "created_at": datetime.now(timezone.utc),
    }
    result = await goal_collection.insert_one(goal)
    goal["_id"] = result.inserted_id
    return serialize_goal(goal)


@router.get("/me")
async def get_my_goals(current_user: dict = Depends(get_current_user)):
    goals = await goal_collection.find({"user_id": current_user["_id"]}).sort("created_at", 1).to_list(length=100)
    return [serialize_goal(g) for g in goals]


async def get_own_goal_or_404(goal_id: str, current_user: dict):
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    goal = await goal_collection.find_one({"_id": ObjectId(goal_id)})
    if not goal or goal["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.post("/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    goal = await get_own_goal_or_404(goal_id, current_user)

    try:
        amount = float(payload.get("amount"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Amount must be a number")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    new_saved = min(goal["saved_amount"] + amount, goal["target_amount"])
    await goal_collection.update_one({"_id": goal["_id"]}, {"$set": {"saved_amount": new_saved}})

    if goal["saved_amount"] < goal["target_amount"] <= new_saved:
        await create_notification(
            current_user["_id"], "goal_milestone", "Savings goal reached!",
            f"You've fully funded your \"{goal['name']}\" goal. Great work!"
        )

    goal["saved_amount"] = new_saved
    return serialize_goal(goal)


@router.delete("/{goal_id}", status_code=200)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    goal = await get_own_goal_or_404(goal_id, current_user)
    await goal_collection.delete_one({"_id": goal["_id"]})
    return {"message": "Goal deleted"}
