from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.database import ticket_collection
from app.utils.auth_utils import get_current_user, admin_required

router = APIRouter()


def serialize_ticket(t):
    t["_id"] = str(t["_id"])
    t["user_id"] = str(t["user_id"])
    return t


async def get_ticket_or_404(ticket_id: str):
    if not ObjectId.is_valid(ticket_id):
        raise HTTPException(status_code=400, detail="Invalid ticket ID")
    ticket = await ticket_collection.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def authorize_ticket_access(ticket, current_user):
    is_owner = ticket["user_id"] == current_user["_id"]
    is_admin = current_user.get("role") == "admin"
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="You don't have access to this ticket")


@router.post("", status_code=201)
async def create_ticket(payload: dict, current_user: dict = Depends(get_current_user)):
    subject = (payload.get("subject") or "").strip()
    message = (payload.get("message") or "").strip()
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message are required")

    now = datetime.now(timezone.utc)
    ticket = {
        "user_id": current_user["_id"],
        "user_email": current_user["email"],
        "subject": subject,
        "status": "open",
        "created_at": now,
        "updated_at": now,
        "messages": [{
            "sender": "user",
            "sender_name": current_user.get("name", "Customer"),
            "text": message,
            "created_at": now,
        }],
    }
    result = await ticket_collection.insert_one(ticket)
    ticket["_id"] = result.inserted_id
    return serialize_ticket(ticket)


@router.get("/me")
async def get_my_tickets(current_user: dict = Depends(get_current_user)):
    tickets = await ticket_collection.find({"user_id": current_user["_id"]}).sort("updated_at", -1).to_list(length=100)
    return [serialize_ticket(t) for t in tickets]


@router.get("")
async def get_all_tickets(admin: dict = Depends(admin_required)):
    tickets = await ticket_collection.find().sort("updated_at", -1).to_list(length=200)
    return [serialize_ticket(t) for t in tickets]


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    ticket = await get_ticket_or_404(ticket_id)
    authorize_ticket_access(ticket, current_user)
    return serialize_ticket(ticket)


@router.post("/{ticket_id}/messages")
async def add_message(ticket_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    ticket = await get_ticket_or_404(ticket_id)
    authorize_ticket_access(ticket, current_user)

    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    is_admin = current_user.get("role") == "admin"
    now = datetime.now(timezone.utc)
    message = {
        "sender": "admin" if is_admin else "user",
        "sender_name": current_user.get("name", "Admin" if is_admin else "Customer"),
        "text": text,
        "created_at": now,
    }
    update = {"$push": {"messages": message}, "$set": {"updated_at": now}}
    # A customer reply on a resolved ticket reopens it automatically.
    if not is_admin and ticket.get("status") == "resolved":
        update["$set"]["status"] = "open"

    await ticket_collection.update_one({"_id": ticket["_id"]}, update)
    updated = await ticket_collection.find_one({"_id": ticket["_id"]})
    return serialize_ticket(updated)


@router.post("/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: str, admin: dict = Depends(admin_required)):
    ticket = await get_ticket_or_404(ticket_id)
    await ticket_collection.update_one(
        {"_id": ticket["_id"]},
        {"$set": {"status": "resolved", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Ticket marked resolved", "status": "resolved"}
