from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import notification_collection
from app.utils.auth_utils import get_current_user

router = APIRouter()


def serialize(n):
    n["_id"] = str(n["_id"])
    n["user_id"] = str(n["user_id"])
    return n


@router.get("")
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await notification_collection.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(length=100)
    return [serialize(n) for n in notifications]


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await notification_collection.count_documents(
        {"user_id": current_user["_id"], "read": False}
    )
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    notification = await notification_collection.find_one({"_id": ObjectId(notification_id)})
    if not notification or notification["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Notification not found")

    await notification_collection.update_one({"_id": notification["_id"]}, {"$set": {"read": True}})
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await notification_collection.update_many(
        {"user_id": current_user["_id"], "read": False}, {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}
