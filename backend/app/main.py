import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Must run before any `app.*` module is imported — several of them read
# required env vars (SECRET_KEY, ANTHROPIC_API_KEY, ...) at import time via
# os.environ/os.getenv, so .env has to be loaded first. The .env file lives
# at the repo root, one level above backend/.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import accounts, auth, admin, transactions, tickets, goals, recurring, budgets, notifications, chat, beneficiaries
from app.database import user_collection
from mangum import Mangum
import traceback


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enforces one account per email at the database level — the app-level
    # check in routers/auth.py handles the common case, but only a unique
    # index closes the race where two registration requests for the same
    # email both pass that check before either has inserted.
    try:
        await user_collection.create_index("email", unique=True)
    except Exception as exc:
        print(f"⚠️ Could not create unique index on users.email: {exc}")
    yield


app = FastAPI(lifespan=lifespan)

# Add this block!
# Ensure CORS is enabled so your frontend (localhost:3000) can talk to backend
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("❌ MAINFRAME ERROR DETECTED:")
    traceback.print_exc() # This prints the actual line of code that failed
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Mainframe Error. Check backend terminal for logs."},
    )

app.add_middleware(
    CORSMiddleware,
    # Matches any localhost port so the frontend still works if 3000 is
    # already taken by another project and react-scripts picks a different one.
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"]) # Add this line
app.include_router(tickets.router, prefix="/api/tickets", tags=["Tickets"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(recurring.router, prefix="/api/recurring", tags=["Recurring Transfers"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Support Chat"])
app.include_router(beneficiaries.router, prefix="/api/beneficiaries", tags=["Saved Recipients"])

@app.get("/")
async def root():
    return {"message": "Server is up and running!"}

handler = Mangum(app)