import pytest
from app.controllers.account_controller import AccountController
from fastapi import HTTPException

# Using your verified ID
VALID_ACC_ID = "69c5b94f80d789586c6b358c"

# We use loop_scope="session" to match the pytest.ini for Python 3.14
@pytest.mark.asyncio(loop_scope="session")
async def test_deposit_logic():
    #Requirement 5.2: Deposit increases balance.
    amount = 100.0
    response = await AccountController.deposit(VALID_ACC_ID, amount)
    assert "success" in response["message"]
    assert "balance" in response
    print(f"\n✅ Deposit Passed")

@pytest.mark.asyncio(loop_scope="session")
async def test_withdraw_insufficient_funds():
    #Requirement 6.1: Prevent withdrawal if balance is too low.
    with pytest.raises(HTTPException) as exc:
        await AccountController.withdraw(VALID_ACC_ID, 99999999.0)
    assert exc.value.status_code == 400
    assert "Insufficient funds" in exc.value.detail
    print("✅ Withdrawal Logic Passed")

@pytest.mark.asyncio(loop_scope="session")
async def test_transaction_history_integrity():
    #Requirement 5.4: Transactions are logged and retrievable.
    transactions = await AccountController.get_transactions(VALID_ACC_ID)
    assert isinstance(transactions, list)
    if len(transactions) > 0:
        assert "txn_type" in transactions[0]
    print(f"✅ History Passed: Found {len(transactions)} records")

# tests/bank_test.py
@pytest.mark.asyncio(loop_scope="session")
async def test_transfer_logic():
    #Requirement 56: Test transferring money between two accounts.
    sender_id = "69c5b94f80d789586c6b358c"
    
    # 1. Create a temporary receiver account so the test always has a valid target
    from app.database import account_collection
    temp_receiver = await account_collection.insert_one({
        "balance": 100.0,
        "account_type": "Savings",
        "user_id": "test_user_123"
    })
    receiver_id = str(temp_receiver.inserted_id)
    
    transfer_amount = 50.0

    # 2. Run the transfer logic
    response = await AccountController.transfer(sender_id, receiver_id, transfer_amount)
    
    # 3. Validation [cite: 59, 62]
    assert "Successfully transferred" in response["message"]
    print(f"\n✅ Transfer Logic Passed: Moved ${transfer_amount} to temporary account {receiver_id}")
    
    # Optional: Clean up the temporary account after test
    await account_collection.delete_one({"_id": temp_receiver.inserted_id})

@pytest.mark.asyncio(loop_scope="session")
async def test_deposit_negative_amount():
    #Requirement 61: Ensure negative deposits are blocked.
    with pytest.raises(HTTPException) as exc:
        await AccountController.deposit(VALID_ACC_ID, -50.0)
    assert exc.value.status_code == 400
    assert "positive" in exc.value.detail.lower()
    print("\n✅ Negative Deposit Blocked")

@pytest.mark.asyncio(loop_scope="session")
async def test_transfer_insufficient_funds():
    #Requirement 60: Sender cannot transfer more than their balance.
    sender_id = VALID_ACC_ID
    receiver_id = "69c5b94f80d789586c6b358c" # Use any valid ID
    
    with pytest.raises(HTTPException) as exc:
        # Attempt to transfer a million dollars
        await AccountController.transfer(sender_id, receiver_id, 1000000.0)
    
    assert exc.value.status_code == 400
    assert "funds" in exc.value.detail.lower()
    print("✅ Transfer Overdraft Blocked")

@pytest.mark.asyncio(loop_scope="session")
async def test_get_account_not_found():
    #Requirement 32: Test behavior for non-existent account ID.
    invalid_id = "000000000000000000000000" # Valid format, but non-existent
    account = await AccountController.get_account(invalid_id)
    assert account is None
    print("✅ Account Not Found Logic Verified")

@pytest.mark.asyncio(loop_scope="session")
async def test_negative_amount_validation():
    #Requirement 61: Ensure system rejects negative values.
    with pytest.raises(HTTPException) as exc:
        await AccountController.deposit(VALID_ACC_ID, -100.0)
    assert exc.value.status_code == 400
    assert "positive" in exc.value.detail.lower()
    print("\n✅ Negative Deposit Blocked")

@pytest.mark.asyncio(loop_scope="session")
async def test_transfer_insufficient_funds():
    #Requirement 60: Sender cannot transfer more than their current balance.
    sender_id = VALID_ACC_ID
    # Creating a quick dummy receiver
    from app.database import account_collection
    receiver = await account_collection.find_one({})
    receiver_id = str(receiver["_id"])
    
    with pytest.raises(HTTPException) as exc:
        # Attempt to transfer an impossible amount
        await AccountController.transfer(sender_id, receiver_id, 99999999.0)
    
    assert exc.value.status_code == 400
    assert "funds" in exc.value.detail.lower()
    print("✅ Transfer Overdraft Blocked")
