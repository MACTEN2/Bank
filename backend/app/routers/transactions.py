import calendar
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from datetime import datetime, timezone
from fpdf import FPDF
import csv
import io
from app.utils.auth_utils import get_current_user
from app.database import account_collection, transaction_collection
from app.controllers.account_controller import AccountController

router = APIRouter()


def is_debit_type(txn_type: str) -> bool:
    return txn_type in ("withdrawal", "admin_debit")


def signed_amount(txn: dict) -> float:
    return -txn["amount"] if is_debit_type(txn["txn_type"]) else txn["amount"]


def build_txn_filters(start_date, end_date, txn_type, min_amount, max_amount):
    filters = {}
    created_at = {}
    if start_date:
        try:
            created_at["$gte"] = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date")
    if end_date:
        try:
            created_at["$lte"] = datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date")
    if created_at:
        filters["created_at"] = created_at

    if txn_type:
        filters["txn_type"] = txn_type

    amount = {}
    if min_amount is not None:
        amount["$gte"] = min_amount
    if max_amount is not None:
        amount["$lte"] = max_amount
    if amount:
        filters["amount"] = amount

    return filters


@router.get("/me")
async def get_my_transactions(
    current_user: dict = Depends(get_current_user),
    start_date: str = Query(None),
    end_date: str = Query(None),
    txn_type: str = Query(None),
    min_amount: float = Query(None),
    max_amount: float = Query(None),
):
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    filters = build_txn_filters(start_date, end_date, txn_type, min_amount, max_amount)
    return await AccountController.get_transactions(str(account["_id"]), filters or None)


@router.get("/me/export")
async def export_my_transactions(
    current_user: dict = Depends(get_current_user),
    start_date: str = Query(None),
    end_date: str = Query(None),
    txn_type: str = Query(None),
    min_amount: float = Query(None),
    max_amount: float = Query(None),
):
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    filters = build_txn_filters(start_date, end_date, txn_type, min_amount, max_amount)
    transactions = await AccountController.get_transactions(str(account["_id"]), filters or None, limit=1000)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Type", "Amount", "Category", "Reason"])
    for tx in transactions:
        writer.writerow([
            tx.get("created_at", ""),
            tx.get("txn_type", ""),
            tx.get("amount", ""),
            tx.get("category", ""),
            tx.get("reason", ""),
        ])

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.get("/me/statement")
async def download_statement(
    current_user: dict = Depends(get_current_user),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
):
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        period_start = datetime(year, month, 1, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid year/month")

    next_month = month + 1
    next_year = year + (next_month - 1) // 12
    next_month = ((next_month - 1) % 12) + 1
    period_end = period_start.replace(
        year=next_year, month=next_month,
        day=min(period_start.day, calendar.monthrange(next_year, next_month)[1]),
    )

    # Everything since the period started — used to back into the opening
    # balance from the account's current balance, so this is correct even
    # for a past month, not just the current one.
    since_period_txns = await transaction_collection.find({
        "account_id": account["_id"],
        "created_at": {"$gte": period_start},
    }).sort("created_at", 1).to_list(length=10000)

    month_txns = [t for t in since_period_txns if t["created_at"] < period_end]
    opening_balance = account["balance"] - sum(signed_amount(t) for t in since_period_txns)
    total_deposits = sum(t["amount"] for t in month_txns if not is_debit_type(t["txn_type"]))
    total_withdrawals = sum(t["amount"] for t in month_txns if is_debit_type(t["txn_type"]))
    closing_balance = opening_balance + total_deposits - total_withdrawals

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Sterling Bank", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, f"Monthly Statement -- {period_start.strftime('%B %Y')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Account holder: {current_user.get('name', '')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Account ID: {account['_id']}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Account type: {account.get('account_type', 'Checking')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"Opening balance: ${opening_balance:,.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Total deposits: ${total_deposits:,.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Total withdrawals: ${total_withdrawals:,.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Closing balance: ${closing_balance:,.2f}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    col_widths = [28, 35, 32, 35, 35]
    pdf.set_font("Helvetica", "B", 9)
    for w, h in zip(col_widths, ["Date", "Type", "Category", "Amount", "Balance"]):
        pdf.cell(w, 7, h, border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    running = opening_balance
    for t in month_txns:
        running += signed_amount(t)
        row = [
            t["created_at"].strftime("%Y-%m-%d"),
            t["txn_type"].replace("_", " ").title(),
            t.get("category") or "-",
            f"{'-' if is_debit_type(t['txn_type']) else '+'}${t['amount']:,.2f}",
            f"${running:,.2f}",
        ]
        for w, val in zip(col_widths, row):
            pdf.cell(w, 6, val, border=1)
        pdf.ln()

    if not month_txns:
        pdf.cell(0, 8, "No transactions during this period.", new_x="LMARGIN", new_y="NEXT")

    pdf_bytes = bytes(pdf.output())
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="statement-{year}-{month:02d}.pdf"'},
    )


@router.post("/deposit")
async def deposit(payload: dict, current_user: dict = Depends(get_current_user)):
    amount = float(payload.get("amount", 0))
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Use AccountController with string ID
    await AccountController.deposit(str(account["_id"]), amount)
    return {"status": "success"}

@router.post("/withdraw")
async def withdraw(payload: dict, current_user: dict = Depends(get_current_user)):
    amount = float(payload.get("amount", 0))
    category = payload.get("category")
    account = await account_collection.find_one({"user_id": current_user["_id"]})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    await AccountController.withdraw(str(account["_id"]), amount, category)
    return {"status": "success"}
