from app.models.account_model import AccountModel
from fastapi import HTTPException
from datetime import datetime, timezone

class AccountController:
    @staticmethod
    async def deposit(acc_id, amount):
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        account = await AccountModel.find_by_id(acc_id)
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
    async def withdraw(acc_id, amount):
        account = await AccountModel.find_by_id(acc_id)
        if account["balance"] < amount:
            raise HTTPException(status_code=400, detail="Insufficient funds")

        new_balance = account["balance"] - amount
        await AccountModel.update_balance(acc_id, new_balance)
        await AccountModel.create_transaction({
            "account_id": account["_id"],
            "txn_type": "withdrawal",
            "amount": amount,
            "created_at": datetime.now(timezone.utc)
        })
        return {"message": "success: Withdrawal successful", "balance": new_balance}
    
    @staticmethod
    async def get_transactions(acc_id: str):
        # 1. Validation: Ensure account exists (Optional but Professional)
        account = await AccountModel.find_by_id(acc_id)
        if not account:
            return None # Or raise an error if preferred

        # 2. Call the Model to fetch the data
        transactions = await AccountModel.get_txns_by_acc(acc_id)
        
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
    async def transfer(from_id: str, to_id: str, amount: float):
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Transfer amount must be positive")
        
        # 1. Deduct from sender (Withdraw logic)
        await AccountController.withdraw(from_id, amount)
        
        # 2. Add to receiver (Deposit logic)
        await AccountController.deposit(to_id, amount)
        
        return {"message": f"Successfully transferred ${amount} to account {to_id}"}
    
    @staticmethod
    async def transfer(from_id: str, to_id: str, amount: float):
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Transfer amount must be positive")
        
        # 1. Validation: Ensure both accounts exist
        sender = await AccountModel.find_by_id(from_id)
        receiver = await AccountModel.find_by_id(to_id)
        
        if not sender or not receiver:
            raise HTTPException(status_code=404, detail="One or both accounts not found")

        # 2. Logic: Withdraw from Sender (Reuse existing controller logic)
        # This automatically checks for insufficient funds 
        await AccountController.withdraw(from_id, amount)
        
        # 3. Logic: Deposit to Receiver
        await AccountController.deposit(to_id, amount)
        
        return {"message": f"Successfully transferred ${amount} from {from_id} to {to_id}"}