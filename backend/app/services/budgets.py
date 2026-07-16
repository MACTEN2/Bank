from datetime import datetime, timezone
from app.database import budget_collection, transaction_collection
from app.services.notifications import create_notification


async def check_budget_alert(user_id, account_id, category: str, amount: float):
    """Fires a budget-alert notification the moment this month's spend for a
    category crosses the user's configured limit. Compares the pre- vs
    post-transaction totals so it fires once per crossing, not on every
    subsequent transaction in the same category."""
    budget = await budget_collection.find_one({"user_id": user_id, "category": category})
    if not budget:
        return

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    cursor = transaction_collection.find({
        "account_id": account_id,
        "category": category,
        "txn_type": "withdrawal",
        "created_at": {"$gte": month_start},
    })
    total_spent = 0.0
    async for txn in cursor:
        total_spent += txn["amount"]

    limit = budget["monthly_limit"]
    previous_total = total_spent - amount
    if previous_total < limit <= total_spent:
        await create_notification(
            user_id,
            "budget_alert",
            f"{category} budget reached",
            f"You've spent ${total_spent:,.2f} on {category} this month, at or above your ${limit:,.2f} budget.",
        )
