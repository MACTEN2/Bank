import json
import os
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from app.database import account_collection, transaction_collection, ticket_collection
from app.utils.auth_utils import get_current_user
from app.routers.tickets import insert_ticket

router = APIRouter()

MODEL = "claude-opus-4-8"
MAX_TOOL_ITERATIONS = 5

SYSTEM_PROMPT = """You are Sterling Bank's AI support assistant, embedded in the customer's \
online banking dashboard. You can look up the authenticated customer's own account and \
transactions with your tools — never ask them for account numbers or other identifying \
details, and never make up balances or transaction data.

Help directly with simple questions: checking balance, explaining a recent transaction, \
or how transfers, savings goals, recurring transfers, and budgets work in this app. Use a \
tool to look up real data before answering anything account-specific.

Escalate to a human instead of guessing: if the customer describes a dispute, suspected \
fraud, a complaint, an account problem you can't resolve, or explicitly asks for a human \
or agent, call create_support_ticket with a clear subject and a summary of the issue \
(including anything you already tried). Then tell the customer a ticket was opened and \
that our support team will follow up in the Support section of the app.

Keep replies short and conversational — a few sentences, not a report."""

TOOLS = [
    {
        "name": "get_account_summary",
        "description": "Get the authenticated customer's own account balance, account type, and status (active/frozen). Call this whenever the customer asks about their balance or account.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_recent_transactions",
        "description": "Get the authenticated customer's most recent transactions. Call this when the customer asks about a specific charge, deposit, or recent activity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "How many recent transactions to return. Defaults to 5, max 20."}
            },
            "required": [],
        },
    },
    {
        "name": "list_my_tickets",
        "description": "List the authenticated customer's existing support tickets and their status. Call this if the customer asks about a ticket they already filed.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "create_support_ticket",
        "description": "Escalate the conversation to a human support agent by opening a real support ticket. Use this for disputes, suspected fraud, complaints, account issues you can't resolve yourself, or whenever the customer asks for a human.",
        "input_schema": {
            "type": "object",
            "properties": {
                "subject": {"type": "string", "description": "A short subject line for the ticket."},
                "summary": {
                    "type": "string",
                    "description": "A clear summary of the customer's issue and relevant conversation details, written for a human support agent to read.",
                },
            },
            "required": ["subject", "summary"],
        },
    },
]


async def run_tool(name: str, tool_input: dict, current_user: dict, account: dict, escalation: dict):
    if name == "get_account_summary":
        if not account:
            return {"error": "No account found for this customer."}
        return {
            "balance": account.get("balance", 0),
            "account_type": account.get("account_type", "Checking"),
            "status": account.get("status", "active"),
        }

    if name == "get_recent_transactions":
        if not account:
            return []
        limit = min(int(tool_input.get("limit") or 5), 20)
        cursor = transaction_collection.find({"account_id": account["_id"]}).sort("created_at", -1)
        txns = await cursor.to_list(length=limit)
        return [
            {
                "txn_type": t.get("txn_type"),
                "amount": t.get("amount"),
                "category": t.get("category"),
                "created_at": t["created_at"].isoformat() if t.get("created_at") else None,
            }
            for t in txns
        ]

    if name == "list_my_tickets":
        tickets = await ticket_collection.find(
            {"user_id": current_user["_id"]}
        ).sort("updated_at", -1).to_list(length=20)
        return [
            {"subject": t["subject"], "status": t["status"], "updated_at": t["updated_at"].isoformat()}
            for t in tickets
        ]

    if name == "create_support_ticket":
        subject = (tool_input.get("subject") or "Support request via AI Assistant").strip()
        summary = (tool_input.get("summary") or "").strip()
        message = (
            f"{summary}\n\n[This ticket was opened automatically by the AI support "
            "assistant on the customer's behalf.]"
        )
        ticket = await insert_ticket(current_user, subject, message)
        escalation["ticket"] = ticket
        return {"ticket_id": ticket["_id"], "status": "created"}

    return {"error": f"Unknown tool {name}"}


@router.post("/message")
async def send_chat_message(payload: dict, current_user: dict = Depends(get_current_user)):
    history = payload.get("messages") or []
    # Only forward role/content — never trust any other field the client sends.
    messages = [
        {"role": m.get("role"), "content": m.get("content")}
        for m in history if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    if not messages:
        raise HTTPException(status_code=400, detail="messages must include at least one user message")

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        raise HTTPException(
            status_code=503,
            detail="The AI assistant isn't configured yet — set ANTHROPIC_API_KEY in the backend's .env file and restart the server.",
        )

    account = await account_collection.find_one({"user_id": current_user["_id"]})
    escalation = {"ticket": None}
    client = anthropic.AsyncAnthropic()

    response = None
    for _ in range(MAX_TOOL_ITERATIONS):
        try:
            response = await client.messages.create(
                model=MODEL,
                max_tokens=1024,
                thinking={"type": "adaptive"},
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            )
        except anthropic.AuthenticationError as exc:
            print(f"⚠️ Anthropic authentication error: {exc}")
            raise HTTPException(
                status_code=503,
                detail="The AI assistant's API key is invalid or expired. Check ANTHROPIC_API_KEY in the backend's .env file.",
            )
        except anthropic.PermissionDeniedError as exc:
            print(f"⚠️ Anthropic permission error: {exc}")
            raise HTTPException(
                status_code=503,
                detail="The AI assistant's Anthropic account doesn't have access to this model or feature.",
            )
        except anthropic.APIError as exc:
            # Logged so the real cause (invalid request, low credit balance,
            # rate limit, connection failure, ...) is visible in the backend
            # console instead of only a generic message reaching the client.
            print(f"⚠️ Anthropic API error: {exc}")
            raise HTTPException(
                status_code=502,
                detail="The AI assistant is temporarily unavailable. Please try again or reach us from the Support page.",
            )

        if response.stop_reason != "tool_use":
            break

        messages.append({"role": "assistant", "content": response.content})
        tool_results = [
            {
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(await run_tool(block.name, block.input, current_user, account, escalation)),
            }
            for block in response.content if block.type == "tool_use"
        ]
        messages.append({"role": "user", "content": tool_results})
    else:
        raise HTTPException(status_code=502, detail="The assistant took too long to respond. Please try again.")

    if response.stop_reason == "refusal":
        reply = "I'm not able to help with that request. Please reach out from the Support page and our team will assist you."
    else:
        reply = "".join(block.text for block in response.content if block.type == "text").strip()
        if not reply:
            reply = "Got it — is there anything else I can help with?"

    return {"reply": reply, "ticket": escalation["ticket"]}
