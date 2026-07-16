"""One-time helper to create (or promote) the bank's first admin account.

This is intentionally a CLI script, not an API endpoint — letting anyone set
their own role over HTTP would defeat the point. Once there's one admin,
grant everyone else admin access from the Admin Dashboard's "Make Admin"
button instead; this script shouldn't be needed again.

Usage (run from the backend/ directory, with SECRET_KEY set):
    python -m scripts.create_admin --name "Ada Admin" --email admin@example.com --password "changeme123"

If the email already belongs to an existing user, that user is promoted to
admin in place rather than creating a duplicate account.
"""
import argparse
import asyncio
from datetime import datetime, timezone

from app.database import user_collection, account_collection
from app.utils.auth_utils import hash_password


async def create_admin(name: str, email: str, password: str):
    email = email.strip().lower()
    existing = await user_collection.find_one({"email": email})
    if existing:
        if existing.get("role") == "admin":
            print(f"'{email}' is already an admin — nothing to do.")
            return
        await user_collection.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
        print(f"Promoted existing user '{email}' to admin.")
        return

    now = datetime.now(timezone.utc)
    result = await user_collection.insert_one({
        "name": name,
        "email": email,
        "password": hash_password(password),
        "role": "admin",
        "created_at": now,
    })
    await account_collection.insert_one({
        "user_id": result.inserted_id,
        "balance": 0.0,
        "account_type": "Checking",
        "created_at": now,
    })
    print(f"Created admin account for '{email}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or promote the bank's initial admin account.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    asyncio.run(create_admin(args.name, args.email, args.password))
