from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import accounts, auth, admin, transactions, tickets, goals
from mangum import Mangum
import traceback

app = FastAPI()

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

@app.get("/")
async def root():
    return {"message": "Server is up and running!"}

handler = Mangum(app)