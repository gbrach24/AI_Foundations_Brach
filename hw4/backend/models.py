"""Structured types for the Campus Customs API and chatbot.

None of these models carry password hashes or other secrets.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

# ---------- Chat: frontend <-> FastAPI ----------

ReplyType = Literal["answer", "clarifying_question", "cannot_confirm"]


class ChatTurn(BaseModel):
    """One earlier message in the conversation, sent back so the agent has context."""

    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


PageType = Literal["home", "products", "product", "about", "login", "create_account", "other"]


class PageContext(BaseModel):
    """Which page the shopper is on when they send a message (sent by the frontend).

    FastAPI verifies product_id against the catalogue and replaces product_name
    with the database name before the agent sees it (see main.resolve_page_context).
    """

    page_type: PageType = "other"
    path: str = Field(default="/", max_length=300, description="URL path + query, e.g. /products?category=Hoodies")
    product_id: str | None = Field(default=None, max_length=200, description="catalogue.product_id on a product page")
    product_name: str | None = Field(default=None, max_length=200)


class ChatRequest(BaseModel):
    """Body of POST /chat. history is only used for guests; logged-in shoppers'
    history is loaded from the chat_messages table instead."""

    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    page_context: PageContext | None = None


class CustomerContext(BaseModel):
    """Who is chatting, built by FastAPI from the session (never from the request body).
    Deliberately excludes password_hash and anything else from the users table."""

    logged_in: bool = False
    user_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None


class ProductCard(BaseModel):
    """A structured product match returned with a chat reply. Built by FastAPI
    from the database (never from the model's text), with everything the
    frontend's ProductCard component needs to render a card."""

    product_id: str = Field(description="catalogue.product_id; the card links to /products/<product_id>")
    name: str
    garment_type: str
    price: float = Field(description="catalogue.price in US dollars")
    image_url: str = Field(description="/media/products/<file>.jpg, built from catalogue.image_file_path")
    short_description: str = Field(description="First sentence of catalogue.description")
    colors: list[str]
    total_stock: int


class ChatResponse(BaseModel):
    """Body returned by POST /chat."""

    reply: str
    products: list[ProductCard] = Field(default_factory=list)
    reply_type: ReplyType = "answer"
    suggested_replies: list[str] = Field(default_factory=list, description="Quick replies for a clarifying question")
    saved: bool = Field(default=False, description="True when both messages were stored in chat_messages (logged in)")


class ChatHistoryMessage(BaseModel):
    """One stored chat_messages row, as shown in the chat widget."""

    id: int
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = Field(default_factory=list)
    created_at: str


class ChatHistoryResponse(BaseModel):
    """Body returned by GET /chat/history (only the session user's own messages)."""

    logged_in: bool
    messages: list[ChatHistoryMessage] = Field(default_factory=list)


# ---------- Agent output ----------


class AgentReply(BaseModel):
    """What the PydanticAI agent must return. FastAPI turns product_ids into
    ProductCards from the database, so cards can't contain invented details."""

    reply: str = Field(description="The message shown to the shopper. Plain text; short '-' bullet lists are fine.")
    product_ids: list[str] = Field(
        default_factory=list,
        max_length=6,
        description="product_id values (from tool results) of products mentioned in the reply, most relevant first.",
    )
    reply_type: ReplyType = Field(
        default="answer",
        description=(
            "'answer' when you answered with confirmed facts; 'clarifying_question' when you need the shopper to "
            "specify something (e.g. which product) before you can answer; 'cannot_confirm' when the requested "
            "information isn't in the catalogue or your tools (e.g. materials, shipping)."
        ),
    )
    suggested_replies: list[str] = Field(
        default_factory=list,
        max_length=4,
        description="Only for clarifying_question: up to 4 short options the shopper can tap, e.g. product names from a tool result.",
    )


# ---------- Tool results (what the agent sees) ----------


class ProductSummary(BaseModel):
    product_id: str
    name: str
    garment_type: str
    price: float
    colors: list[str]
    total_stock: int
    short_description: str


# ---------- Database product tools (Problem 6) ----------
# Every tool result carries a status so the agent can tell "found" apart from
# "not found" and "which one did you mean?", plus a plain-English message.

LookupStatus = Literal["found", "not_found", "ambiguous"]


class ProductCandidate(BaseModel):
    """A possible match when a product name is ambiguous or misspelled."""

    product_id: str
    name: str
    price: float


class SizeStock(BaseModel):
    size: str
    quantity: int
    in_stock: bool


class ProductDescriptionResult(BaseModel):
    status: LookupStatus
    product_id: str | None = None
    name: str | None = None
    garment_type: str | None = None
    description: str | None = None
    colors: list[str] = Field(default_factory=list)
    candidates: list[ProductCandidate] = Field(default_factory=list)
    message: str


class ProductPriceResult(BaseModel):
    status: LookupStatus
    product_id: str | None = None
    name: str | None = None
    price: float | None = None
    currency: Literal["USD"] = "USD"
    candidates: list[ProductCandidate] = Field(default_factory=list)
    message: str


class ProductInventoryResult(BaseModel):
    status: LookupStatus
    product_id: str | None = None
    name: str | None = None
    in_stock: bool | None = None
    total_stock: int | None = None
    sizes: list[SizeStock] = Field(default_factory=list)
    in_stock_sizes: list[str] = Field(default_factory=list)
    out_of_stock_sizes: list[str] = Field(default_factory=list)
    candidates: list[ProductCandidate] = Field(default_factory=list)
    message: str


SizeStatus = Literal["in_stock", "out_of_stock", "size_not_offered", "product_not_found", "ambiguous_product"]


class SizeInventoryResult(BaseModel):
    status: SizeStatus
    product_id: str | None = None
    name: str | None = None
    requested_size: str
    size: str | None = Field(default=None, description="The requested size as stored in the database, e.g. 'M'.")
    quantity: int | None = None
    other_sizes_in_stock: list[SizeStock] = Field(default_factory=list)
    sizes_offered: list[str] = Field(default_factory=list)
    candidates: list[ProductCandidate] = Field(default_factory=list)
    message: str


class ProductSearchResult(BaseModel):
    total_matches: int
    products: list[ProductSummary]
    note: str | None = None
    we_carry: list[str] = Field(default_factory=list, description="On zero results: the categories Campus Customs does carry")


# ---------- Recommendations (Problem 9) ----------


class Recommendation(BaseModel):
    """A recommended product with the database facts behind the recommendation."""

    product_id: str
    name: str
    garment_type: str
    price: float
    colors: list[str]
    in_stock_sizes: list[str]
    short_description: str
    reasons: list[str] = Field(description="Why it fits, built only from catalogue/inventory facts")


class RecommendationResult(BaseModel):
    criteria: list[str] = Field(description="The filters and preferences that were applied")
    total_candidates: int
    recommendations: list[Recommendation]
    note: str | None = None


class CatalogueOverview(BaseModel):
    total_products: int
    categories: dict[str, int]
    price_min: float
    price_max: float
    sizes_offered: list[str]
    collections: list[str]


# ---------- Accounts (Problem 4) ----------


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PublicUser(BaseModel):
    """User fields safe to send to the browser (never password_hash)."""

    id: int
    first_name: str | None
    last_name: str | None
    name: str
    email: str


class UserEnvelope(BaseModel):
    user: PublicUser | None


# ---------- Audit trail (Problem 12) ----------

AuditEvent = Literal["run_start", "tool_call", "validation_retry", "run_end"]
StopReason = Literal[
    "final_response",   # the agent produced a validated reply
    "max_iterations",   # UsageLimits hit (model requests or tool calls)
    "content_filter",   # the model provider's safety filter blocked the request
    "validation_error",  # output validators kept rejecting the reply until retries ran out
    "model_error",      # provider/network error
    "not_configured",   # no API key
    "error",            # anything else
]


class AuditEntry(BaseModel):
    """One record in output/audit_trail.json. Short and redacted by design (see backend/audit.py)."""

    timestamp: datetime = Field(description="UTC time the event happened (tool calls use the model response time)")
    run_id: str = Field(description="Groups all entries from one chat message / agent run")
    step: int = Field(description="Order of this entry within its run (1, 2, 3…)")
    event: AuditEvent
    iteration: int | None = Field(default=None, description="Agent-loop iteration (model request number) that made the call")
    tool_name: str | None = None
    args: dict[str, Any] | None = Field(default=None, description="Summarized, redacted tool arguments")
    result: str | None = Field(default=None, max_length=240, description="Short summary of the tool result or run outcome")
    status: Literal["ok", "retry", "error", "no_result"] | None = None
    stop_reason: StopReason | None = Field(default=None, description="Only on run_end: why the loop stopped")
    model: str | None = None
    session: Literal["guest", "logged_in"] | None = None
    user_id: int | None = Field(default=None, description="Numeric id only; never name, email, or message text")
    page: str | None = Field(default=None, description="Page type, plus product_id on product pages")
    duration_ms: int | None = None

