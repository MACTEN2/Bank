import calendar
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import recurring_transfer_collection, account_collection
from app.utils.auth_utils import get_current_user
from app.controllers.account_controller import AccountController
from app.services.notifications import create_notification

router = APIRouter()

FREQUENCIES = ("weekly", "monthly")


def add_interval(dt: datetime, frequency: str) -> datetime:
    if frequency == "weekly":
        return dt + timedelta(weeks=1)
    # monthly — advance one calendar month, clamping the day to the target
    # month's length (e.g. Jan 31 -> Feb 28).
    month = dt.month + 1
    year = dt.year + (month - 1) // 12
    month = ((month - 1) % 12) + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def serialize(r):
    r["_id"] = str(r["_id"])
    r["user_id"] = str(r["user_id"])
    r["from_account_id"] = str(r["from_account_id"])
    r["to_account_id"] = str(r["to_account_id"])
    return r


@router.post("", status_code=201)
async def create_recurring_transfer(payload: dict, current_user: dict = Depends(get_current_user)):
    from_account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not from_account:
        raise HTTPException(status_code=404, detail="Your account was not found")

    to_id = payload.get("to_account_id")
    frequency = payload.get("frequency")
    if not to_id or not ObjectId.is_valid(to_id):
        raise HTTPException(status_code=400, detail="Invalid recipient account ID")
    if str(from_account["_id"]) == str(to_id):
        raise HTTPException(status_code=400, detail="You can't set up a recurring transfer to your own account")
    if frequency not in FREQUENCIES:
        raise HTTPException(status_code=400, detail="frequency must be 'weekly' or 'monthly'")

    to_account = await account_collection.find_one({"_id": ObjectId(to_id)})
    if not to_account:
        raise HTTPException(status_code=404, detail="Recipient account not found")

    try:
        amount = float(payload.get("amount"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Amount must be a number")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": current_user["_id"],
        "from_account_id": from_account["_id"],
        "to_account_id": to_account["_id"],
        "amount": amount,
        "frequency": frequency,
        "active": True,
        "next_run_at": add_interval(now, frequency),
        "last_run_at": None,
        "created_at": now,
    }
    result = await recurring_transfer_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("/me")
async def get_my_recurring_transfers(current_user: dict = Depends(get_current_user)):
    transfers = await recurring_transfer_collection.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(length=100)
    return [serialize(t) for t in transfers]


async def get_own_recurring_or_404(transfer_id: str, current_user: dict):
    if not ObjectId.is_valid(transfer_id):
        raise HTTPException(status_code=400, detail="Invalid recurring transfer ID")
    transfer = await recurring_transfer_collection.find_one({"_id": ObjectId(transfer_id)})
    if not transfer or transfer["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Recurring transfer not found")
    return transfer


@router.post("/{transfer_id}/toggle")
async def toggle_recurring_transfer(transfer_id: str, current_user: dict = Depends(get_current_user)):
    transfer = await get_own_recurring_or_404(transfer_id, current_user)
    new_active = not transfer.get("active", True)
    await recurring_transfer_collection.update_one({"_id": transfer["_id"]}, {"$set": {"active": new_active}})
    return {"message": "Recurring transfer updated", "active": new_active}


@router.delete("/{transfer_id}", status_code=200)
async def delete_recurring_transfer(transfer_id: str, current_user: dict = Depends(get_current_user)):
    transfer = await get_own_recurring_or_404(transfer_id, current_user)
    await recurring_transfer_collection.delete_one({"_id": transfer["_id"]})
    return {"message": "Recurring transfer canceled"}


@router.post("/process")
async def process_due_recurring_transfers(current_user: dict = Depends(get_current_user)):
    """Runs any of the current user's due recurring transfers. There's no
    background worker in this app, so the frontend calls this once per
    dashboard load to simulate scheduled execution."""
    now = datetime.now(timezone.utc)
    due = await recurring_transfer_collection.find({
        "user_id": current_user["_id"],
        "active": True,
        "next_run_at": {"$lte": now},
    }).to_list(length=50)

    processed = []
    for transfer in due:
        next_run_at = add_interval(transfer["next_run_at"], transfer["frequency"])
        try:
            await AccountController.transfer(
                str(transfer["from_account_id"]), str(transfer["to_account_id"]),
                transfer["amount"], "Recurring Transfer"
            )
            await create_notification(
                current_user["_id"], "recurring_transfer", "Recurring transfer sent",
                f"Your recurring transfer of ${transfer['amount']:,.2f} was sent successfully."
            )
        except HTTPException as exc:
            await create_notification(
                current_user["_id"], "recurring_transfer_failed", "Recurring transfer failed",
                f"Your recurring transfer of ${transfer['amount']:,.2f} could not be completed: {exc.detail}"
            )

        await recurring_transfer_collection.update_one(
            {"_id": transfer["_id"]},
            {"$set": {"next_run_at": next_run_at, "last_run_at": now}}
        )
        processed.append(str(transfer["_id"]))

    return {"processed": processed}
