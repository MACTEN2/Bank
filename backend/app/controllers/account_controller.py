from app.models.account_model import AccountModel
from app.services.notifications import create_notification
from app.services.budgets import check_budget_alert
from fastapi import HTTPException
from datetime import datetime, timezone

# Thresholds for automatic customer notifications.
LARGE_TRANSACTION_THRESHOLD = 1000.0
LOW_BALANCE_THRESHOLD = 100.0

class AccountController:
    @staticmethod
    async def deposit(acc_id, amount):
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        account = await AccountModel.find_by_id(acc_id)
        if account.get("status") == "frozen":
            raise HTTPException(status_code=403, detail="This account is frozen and cannot process transactions")
        if account.get("status") == "terminated":
            raise HTTPException(status_code=403, detail="This account has been terminated and can no longer process transactions")
        new_balance = account["balance"] + amount

        await AccountModel.update_balance(acc_id, new_balance)
        await AccountModel.create_transaction({
            "account_id": account["_id"],
            "txn_type": "deposit",
            "amount": amount,
            "created_at": datetime.now(timezone.utc)
        })
        return {"message": "success: Deposit successful", "balance": new_balance}

    @staticmethod
    async def withdraw(acc_id, amount, category: str = None):
        account = await AccountModel.find_by_id(acc_id)
        if account.get("status") == "frozen":
            raise HTTPException(status_code=403, detail="This account is frozen and cannot process transactions")
        if account.get("status") == "terminated":
            raise HTTPException(status_code=403, detail="This account has been terminated and can no longer process transactions")
        if account["balance"] < amount:
            raise HTTPException(status_code=400, detail="Insufficient funds")

        new_balance = account["balance"] - amount
        await AccountModel.update_balance(acc_id, new_balance)
        txn = {
            "account_id": account["_id"],
            "txn_type": "withdrawal",
            "amount": amount,
            "created_at": datetime.now(timezone.utc)
        }
        if category:
            txn["category"] = category
        await AccountModel.create_transaction(txn)

        user_id = account.get("user_id")
        if user_id is not None:
            if amount >= LARGE_TRANSACTION_THRESHOLD:
                await create_notification(
                    user_id, "large_transaction", "Large withdrawal",
                    f"A withdrawal of ${amount:,.2f} was processed on your account."
                )
            if new_balance < LOW_BALANCE_THRESHOLD:
                await create_notification(
                    user_id, "low_balance", "Low balance alert",
                    f"Your balance is now ${new_balance:,.2f}."
                )
            if category:
                await check_budget_alert(user_id, account["_id"], category, amount)

        return {"message": "success: Withdrawal successful", "balance": new_balance}
    
    @staticmethod
    async def admin_adjust(acc_id, amount, adjustment_type, reason):
        """Admin-only manual balance correction. Bypasses the frozen-account
        guard on purpose — freezing blocks the customer, not staff resolving
        the case that caused the freeze (e.g. reversing a fraudulent charge)."""
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        if adjustment_type not in ("credit", "debit"):
            raise HTTPException(status_code=400, detail="type must be 'credit' or 'debit'")

        account = await AccountModel.find_by_id(acc_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        if adjustment_type == "debit" and account["balance"] < amount:
            raise HTTPException(status_code=400, detail="Insufficient funds for this debit")

        new_balance = account["balance"] + amount if adjustment_type == "credit" else account["balance"] - amount

        await AccountModel.update_balance(acc_id, new_balance)
        await AccountModel.create_transaction({
            "account_id": account["_id"],
            "txn_type": "admin_credit" if adjustment_type == "credit" else "admin_debit",
            "amount": amount,
            "reason": reason,
            "created_at": datetime.now(timezone.utc)
        })

        if account.get("user_id") is not None:
            await create_notification(
                account["user_id"], "admin_adjustment", "Account adjustment",
                f"An admin applied a {adjustment_type} of ${amount:,.2f} to your account. Reason: {reason}"
            )

        return {"message": f"Account manually {adjustment_type}ed", "balance": new_balance}

    @staticmethod
    async def get_transactions(acc_id: str, filters: dict = None, limit: int = 100):
        # 1. Validation: Ensure account exists (Optional but Professional)
        account = await AccountModel.find_by_id(acc_id)
        if not account:
            return None # Or raise an error if preferred

        # 2. Call the Model to fetch the data
        transactions = await AccountModel.get_txns_by_acc(acc_id, filters, limit)

        # 3. Data Formatting (Converting BSON types to JSON-safe strings)
        for tx in transactions:
            tx["_id"] = str(tx["_id"])
            tx["account_id"] = str(tx["account_id"])
            # Ensure the datetime is a string for Postman
            if isinstance(tx.get("created_at"), datetime):
                tx["created_at"] = tx["created_at"].isoformat()
                
        return transactions
    
    @staticmethod
    async def get_account(acc_id: str):
        # Requirement 5.4: Fetch account details
        account = await AccountModel.find_by_id(acc_id)
        if account:
            account["_id"] = str(account["_id"])
            account["user_id"] = str(account["user_id"])
        return account
    

    @staticmethod
    async def transfer(from_id: str, to_id: str, amount: float, category: str = None):
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Transfer amount must be positive")

        # 1. Validation: Ensure both accounts exist
        sender = await AccountModel.find_by_id(from_id)
        receiver = await AccountModel.find_by_id(to_id)

        if not sender:
            raise HTTPException(status_code=404, detail="Your account was not found")
        if not receiver:
            raise HTTPException(
                status_code=404,
                detail="Recipient account not found. Double-check the Account ID — it's different from a user's login/email, and it's shown in full on the sender's Dashboard or Settings page.",
            )

        # 2. Logic: Withdraw from Sender (Reuse existing controller logic)
        # This automatically checks for insufficient funds
        await AccountController.withdraw(from_id, amount, category)

        # 3. Logic: Deposit to Receiver
        await AccountController.deposit(to_id, amount)

        if receiver.get("user_id") is not None:
            await create_notification(
                receiver["user_id"], "transfer_received", "Money received",
                f"You received ${amount:,.2f} from another Sterling Bank account."
            )

        return {"message": f"Successfully transferred ${amount} from {from_id} to {to_id}"}