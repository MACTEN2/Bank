from motor.motor_asyncio import AsyncIOMotorClient
import os

# For local development, use mongodb://localhost:27017
# For Atlas, use your connection string
MONGO_DETAILS = os.getenv("MONGO_URL", "mongodb://localhost:27017")

client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.bank_db

# Collections [cite: 17]
user_collection = database.get_collection("users")
account_collection = database.get_collection("accounts")
transaction_collection = database.get_collection("transactions")
ticket_collection = database.get_collection("tickets")
goal_collection = database.get_collection("goals")