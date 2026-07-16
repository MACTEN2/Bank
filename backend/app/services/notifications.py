from datetime import datetime, timezone
from app.database import notification_collection


async def create_notification(user_id, ntype: str, title: str, message: str):
    await notification_collection.insert_one({
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })
