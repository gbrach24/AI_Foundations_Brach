"""Campus Customs API — FastAPI entry point.

Problem 3: product data from data/campus_customs.db and product images from
data/products/ (read-only connections, see database.py).
Problem 4: account creation, login, and logout against the users table, with
PBKDF2 password hashes (security.py) and a signed session cookie.
Problem 5: POST /chat -> PydanticAI shop agent (agent.py, tools.py, prompts/prompt.md).
Problem 8: chat history for logged-in shoppers (chat_messages table, GET /chat/history),
plus customer and page context passed to the agent.

Run from inside backend/:
    cd backend
    uvicorn main:app --reload --port 8000
"""

import json
import logging
import os
import re
import secrets

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from agent import AgentNotConfigured, run_chat
from database import DATA_DIR, DB_PATH, MEDIA_URL_PREFIX, fetch_all_products, fetch_product, get_connection, short_description
from models import (
    ChatHistoryMessage,
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    ChatTurn,
    CustomerContext,
    LoginRequest,
    PageContext,
    ProductCard,
    PublicUser,
    RegisterRequest,
    UserEnvelope,
)
from security import DUMMY_HASH, hash_password, verify_password

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MIN_PASSWORD_LENGTH = 8

# The Vite dev server origin (frontend/vite.config.ts uses port 5173).
FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

logger = logging.getLogger("campus_customs")

# Signs the session cookie. Set SESSION_SECRET to keep logins across restarts;
# otherwise a random key is generated per process (sessions reset on restart).
SESSION_SECRET = os.environ.get("SESSION_SECRET") or secrets.token_hex(32)
if "SESSION_SECRET" not in os.environ:
    logger.warning("SESSION_SECRET not set; using a temporary key for this run.")

app = FastAPI(title="Campus Customs API", version="0.3.0")

# The Vite dev server proxies /api, /media, and /chat, but direct calls from
# the dev origin are allowed too. Only the frontend origins are listed (no "*").
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)

# Session cookie holds only the signed user id: HttpOnly (not readable by JS),
# SameSite=Lax, 7-day lifetime. Set https_only=True when served over HTTPS.
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="cc_session",
    max_age=7 * 24 * 60 * 60,
    same_site="lax",
    https_only=False,
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI's default 422 body echoes the submitted input, which for auth
    # routes would include the password. Return field names and messages only.
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Invalid request.", "errors": errors})


# The database and product images are a local data pack (not in Git). Fail early
# with a clear message if it hasn't been placed at data/ (see README).
if not DB_PATH.is_file() or not (DATA_DIR / "products").is_dir():
    raise RuntimeError(
        f"Local data pack not found: expected {DB_PATH} and {DATA_DIR / 'products'}/. "
        "Copy the provided campus_customs.db and products/ folder into data/ (see README.md)."
    )

# Product images: /media/products/<id>.jpg -> data/products/<id>.jpg
# Only the products folder is exposed, never data/ itself (it holds the database).
app.mount(
    f"{MEDIA_URL_PREFIX}/products",
    StaticFiles(directory=DATA_DIR / "products"),
    name="product-images",
)


# ---------- Products (Problem 3) ----------


@app.get("/api/health")
def health() -> dict:
    with get_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM catalogue").fetchone()[0]
    return {"status": "ok", "products": count}


@app.get("/api/products")
def list_products() -> list[dict]:
    """All catalogue products with total stock across sizes."""
    return fetch_all_products()


@app.get("/api/products/{product_id}")
def get_product(product_id: str) -> dict:
    """One product plus its per-size inventory (empty list if none exists)."""
    product = fetch_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ---------- Accounts (Problem 4) ----------

USER_COLUMNS = "id, name, email, first_name, last_name"


def public_user(row) -> PublicUser:
    return PublicUser(
        id=row["id"], first_name=row["first_name"], last_name=row["last_name"], name=row["name"], email=row["email"]
    )


def normalize_email(email: str) -> str:
    return email.strip().lower()


def session_user(request: Request) -> PublicUser | None:
    user_id = request.session.get("user_id")
    if user_id is None:
        return None
    with get_connection() as conn:
        row = conn.execute(f"SELECT {USER_COLUMNS} FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        request.session.clear()
        return None
    return public_user(row)


@app.post("/api/auth/register", status_code=201)
def register(body: RegisterRequest, request: Request) -> UserEnvelope:
    first_name = body.first_name.strip()
    last_name = body.last_name.strip()
    email = normalize_email(body.email)

    errors: dict[str, str] = {}
    if not first_name:
        errors["first_name"] = "First name is required."
    if not last_name:
        errors["last_name"] = "Last name is required."
    if not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    if len(body.password) < MIN_PASSWORD_LENGTH:
        errors["password"] = f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Please fix the highlighted fields.", "fields": errors})

    password_hash = hash_password(body.password)
    with get_connection(writable=True) as conn:
        if conn.execute("SELECT 1 FROM users WHERE lower(email) = ?", (email,)).fetchone():
            raise HTTPException(
                status_code=409,
                detail={"message": "An account with this email already exists.", "fields": {"email": "This email is already registered."}},
            )
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
            (f"{first_name} {last_name}", email, password_hash, first_name, last_name),
        )
        conn.commit()
        row = conn.execute(f"SELECT {USER_COLUMNS} FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()

    request.session.clear()
    request.session["user_id"] = row["id"]
    return UserEnvelope(user=public_user(row))


@app.post("/api/auth/login")
def login(body: LoginRequest, request: Request) -> UserEnvelope:
    email = normalize_email(body.email)
    with get_connection() as conn:
        row = conn.execute(
            f"SELECT {USER_COLUMNS}, password_hash FROM users WHERE lower(email) = ?", (email,)
        ).fetchone()

    # Same message (and similar work) whether the email or the password is wrong.
    stored_hash = row["password_hash"] if row else DUMMY_HASH
    if not verify_password(body.password, stored_hash) or row is None:
        raise HTTPException(status_code=401, detail={"message": "Incorrect email or password."})

    request.session.clear()
    request.session["user_id"] = row["id"]
    return UserEnvelope(user=public_user(row))


@app.post("/api/auth/logout")
def logout(request: Request) -> dict:
    request.session.clear()
    return {"ok": True}


@app.get("/api/auth/me")
def current_user(request: Request) -> UserEnvelope:
    """The logged-in user, or null. Returns 200 either way to keep the console quiet."""
    return UserEnvelope(user=session_user(request))


# ---------- Shop chatbot (Problem 5) ----------


def product_cards(product_ids: list[str]) -> list[ProductCard]:
    """Build cards from the database so card details always match the catalogue."""
    cards = []
    for product_id in product_ids:
        product = fetch_product(product_id)
        if product is not None:
            cards.append(
                ProductCard(
                    product_id=product["product_id"],
                    name=product["name"],
                    garment_type=product["garment_type"],
                    price=product["price"],
                    image_url=product["image_url"],
                    short_description=short_description(product["description"]),
                    colors=product["colors"],
                    total_stock=product["total_stock"],
                )
            )
    return cards


# ---------- Chat history + context (Problem 8) ----------

AGENT_HISTORY_MESSAGES = 20   # stored messages replayed to the agent (10 turns)
HISTORY_PAGE_SIZE = 100       # stored messages shown in the widget
SAFE_PATH_RE = re.compile(r"[^A-Za-z0-9/_\-?=&%.]")


def customer_context(user: PublicUser | None) -> CustomerContext:
    """Agent-facing identity, from the session user only (no password_hash, no tokens)."""
    if user is None:
        return CustomerContext(logged_in=False)
    return CustomerContext(
        logged_in=True, user_id=user.id, first_name=user.first_name, last_name=user.last_name, email=user.email
    )


def resolve_page_context(page: PageContext | None) -> PageContext | None:
    """Trust only what can be verified: the product must exist, and its name comes from the database."""
    if page is None:
        return None
    path = SAFE_PATH_RE.sub("", page.path)[:300] or "/"
    if page.page_type == "product" and page.product_id:
        product = fetch_product(page.product_id)
        if product is not None:
            return PageContext(page_type="product", path=path, product_id=product["product_id"], product_name=product["name"])
    page_type = "other" if page.page_type == "product" else page.page_type
    return PageContext(page_type=page_type, path=path)


def stored_card_ids(products_json: str | None) -> list[str]:
    """product_ids saved with an assistant message (any stored card shape that has product_id)."""
    if not products_json:
        return []
    try:
        items = json.loads(products_json)
    except json.JSONDecodeError:
        return []
    return [item["product_id"] for item in items if isinstance(item, dict) and isinstance(item.get("product_id"), str)]


def load_agent_history(user_id: int) -> list[ChatTurn]:
    """The user's most recent stored messages, oldest first, for the agent's memory."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? AND role IN ('user', 'assistant') "
            "ORDER BY id DESC LIMIT ?",
            (user_id, AGENT_HISTORY_MESSAGES),
        ).fetchall()
    return [ChatTurn(role=r["role"], content=r["content"][:4000]) for r in reversed(rows)]


def save_chat_message(user_id: int, role: str, content: str, cards: list[ProductCard] | None = None) -> None:
    products_json = json.dumps([c.model_dump() for c in cards]) if cards else None
    with get_connection(writable=True) as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, ?, ?, ?)",
            (user_id, role, content, products_json),
        )
        conn.commit()


@app.get("/chat/history")
def chat_history(request: Request) -> ChatHistoryResponse:
    """The logged-in shopper's own saved conversation (identity from the session cookie only)."""
    user = session_user(request)
    if user is None:
        return ChatHistoryResponse(logged_in=False)
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? AND role IN ('user', 'assistant') ORDER BY id DESC LIMIT ?",
            (user.id, HISTORY_PAGE_SIZE),
        ).fetchall()
    messages = [
        ChatHistoryMessage(
            id=r["id"],
            role=r["role"],
            content=r["content"],
            # Cards are rebuilt from the catalogue so saved replies show current prices and stock.
            products=product_cards(stored_card_ids(r["products_json"])) if r["role"] == "assistant" else [],
            created_at=r["created_at"],
        )
        for r in reversed(rows)
    ]
    return ChatHistoryResponse(logged_in=True, messages=messages)


@app.post("/chat")
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    """Send one shopper message to the PydanticAI agent.

    Logged in: history comes from chat_messages, and both the message and the
    reply are saved there. Guest: history comes from the request; nothing is saved.
    """
    user = session_user(request)
    customer = customer_context(user)
    page = resolve_page_context(body.page_context)

    if user is not None:
        history = load_agent_history(user.id)
        save_chat_message(user.id, "user", body.message)
    else:
        history = body.history

    try:
        output = await run_chat(body.message, history, customer, page)
    except AgentNotConfigured:
        logger.error("Chat unavailable: the model API key is not configured.")
        raise HTTPException(status_code=503, detail="The shop assistant isn't configured right now.")
    except Exception as exc:  # model/network errors: log the type only, never request contents
        logger.error("Chat agent failed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="The shop assistant couldn't answer just now. Please try again.")

    cards = product_cards(output.product_ids)
    if user is not None:
        save_chat_message(user.id, "assistant", output.reply, cards)
    return ChatResponse(
        reply=output.reply,
        products=cards,
        reply_type=output.reply_type,
        suggested_replies=output.suggested_replies,
        saved=user is not None,
    )
