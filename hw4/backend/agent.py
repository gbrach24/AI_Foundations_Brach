"""The Campus Customs shop chatbot: a PydanticAI agent.

- System prompt: loaded from prompts/prompt.md (edit that file, not this one).
- Model: gpt-5.6-luna through the Portkey OpenAI-compatible gateway, matching
  the course AGENTS.md and the Homework 3 setup. The key is read from the
  PORTKEY_API_KEY environment variable (loaded from .env, never hard-coded).
- Tools: tools.SHOP_TOOLS, registered on the agent below: catalogue overview,
  product search (Problem 5), and database lookups for description, price,
  inventory, and size inventory (Problem 6).
- Output validators keep answers grounded: product cards must come from tool
  results, and every $ amount in a reply must be a price a tool returned.
"""

import os
import re
import time
import uuid
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior, UsageLimitExceeded
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    RetryPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)

REFERENCE_RE = re.compile(r"\b(it|its|this|these|them|this one|that one|the same one)\b", re.IGNORECASE)
PRICE_RE = re.compile(r"\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{1,2})?)")
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.profiles.openai import OpenAIModelProfile
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from audit import append_entries, now_utc, summarize_args, summarize_result, truncate
from models import AgentReply, AuditEntry, ChatTurn, CustomerContext, PageContext, StopReason
from database import fetch_all_products
from tools import GARMENT_WORDS, SHOP_TOOLS, ChatDeps

BACKEND_DIR = Path(__file__).resolve().parent
PROMPT_PATH = BACKEND_DIR / "prompts" / "prompt.md"

# Settings come from the environment, or from .env in the project root (copy
# .env.example to .env). Variables already set in the environment take precedence.
load_dotenv(BACKEND_DIR.parent / ".env")

PORTKEY_BASE_URL = os.getenv("PORTKEY_BASE_URL", "https://api.portkey.ai/v1")
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")
# Agent-loop limits per chat message (see output/harness.md "Specs").
MAX_MODEL_REQUESTS = 8   # model round-trips (each tool round = 1 request, plus the final answer)
MAX_TOOL_CALLS = 12      # tool executions across the whole run
RUN_LIMITS = UsageLimits(request_limit=MAX_MODEL_REQUESTS, tool_calls_limit=MAX_TOOL_CALLS)
OUTPUT_TOOL = "final_result"  # PydanticAI's internal tool that carries the structured AgentReply

# Shown when a run hits RUN_LIMITS before finishing.
LIMIT_REPLY = (
    "Sorry, I couldn't finish looking that up. Could you ask about one product or category at a time? "
    "You can also browse everything on the Products page."
)
os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")  # keep the server log quiet

# Shown when the model provider's safety filter blocks a message (e.g. jailbreak
# attempts); the provider returns an error instead of a reply in that case.
SAFETY_FALLBACK_REPLY = (
    "Sorry, I can't help with that. I'm here to help you shop Campus Customs, "
    "so feel free to ask me about our hoodies, crewnecks, tees, sizes, or prices!"
)


class AgentNotConfigured(RuntimeError):
    """Raised when the model API key is missing."""


def is_content_filtered(exc: Exception) -> bool:
    return isinstance(exc, ModelHTTPError) and isinstance(exc.body, dict) and exc.body.get("code") == "content_filter"


def build_model() -> OpenAIChatModel:
    api_key = os.getenv("PORTKEY_API_KEY")
    if not api_key:
        raise AgentNotConfigured("PORTKEY_API_KEY is not set (add it to .env).")
    client = AsyncOpenAI(api_key=api_key, base_url=PORTKEY_BASE_URL, max_retries=2, timeout=60)
    return OpenAIChatModel(
        MODEL_NAME,
        provider=OpenAIProvider(openai_client=client),
        # Portkey's Azure-backed Luna deployment requires max_completion_tokens.
        profile=OpenAIModelProfile(openai_chat_supports_max_completion_tokens=True),
    )


@lru_cache(maxsize=1)
def get_agent() -> Agent[ChatDeps, AgentReply]:
    """Build the agent once, on first use, so the API can start without a key."""
    agent = Agent(
        build_model(),
        deps_type=ChatDeps,
        output_type=AgentReply,
        instructions=PROMPT_PATH.read_text(encoding="utf-8"),
        tools=SHOP_TOOLS,
        retries=2,
    )

    @agent.instructions
    def shopper_context(ctx: RunContext[ChatDeps]) -> str:
        text = customer_context_text(ctx.deps) + "\n\n" + page_context_text(ctx.deps)
        if ctx.deps.unresolved_reference:
            text += (
                "\n\n## Clarification needed\n"
                "The shopper's message refers to a product (\"it\", \"this\"…) but no product page is open, there is "
                "no earlier conversation, and no product is named. Don't guess which product they mean: reply with "
                "reply_type 'clarifying_question', ask briefly which product they mean, and offer up to 4 "
                "suggested_replies: our categories (Hoodies, Crewnecks, Quarter-Zips, Tees & Tops, Jackets & Fleece), "
                "not arbitrary product names. You don't need a tool call to ask."
            )
        return text

    @agent.output_validator
    def only_known_products(ctx: RunContext[ChatDeps], output: AgentReply) -> AgentReply:
        unknown = [pid for pid in output.product_ids if pid not in ctx.deps.seen_product_ids]
        if unknown:
            raise ModelRetry(
                f"These product_ids did not come from a tool result in this conversation turn: {unknown}. "
                "Look them up with search_products or a get_product_* tool, or remove them."
            )
        return output.model_copy(update={"product_ids": list(dict.fromkeys(output.product_ids))})

    @agent.output_validator
    def clarify_instead_of_guessing(ctx: RunContext[ChatDeps], output: AgentReply) -> AgentReply:
        deps = ctx.deps
        if deps.unresolved_reference and output.reply_type == "answer":
            raise ModelRetry(
                "Nothing identifies which product the shopper means. Don't answer for a guessed product: "
                "set reply_type='clarifying_question' and ask which product they mean."
            )
        if (
            output.reply_type == "clarifying_question"
            and deps.page is not None and deps.page.product_id
            and REFERENCE_RE.search(ctx.prompt if isinstance(ctx.prompt, str) else "")
        ):
            raise ModelRetry(
                f"The shopper is viewing {deps.page.product_name} (product_id {deps.page.product_id}), so "
                "\"it\"/\"this\" means that product. Answer about it using your tools instead of asking which product."
            )
        if output.reply_type == "clarifying_question" and "?" not in output.reply:
            raise ModelRetry("A clarifying_question reply must actually ask the shopper a question.")
        if output.reply_type != "clarifying_question" and output.suggested_replies:
            output = output.model_copy(update={"suggested_replies": []})
        return output

    @agent.output_validator
    def only_database_prices(ctx: RunContext[ChatDeps], output: AgentReply) -> AgentReply:
        # Amounts the shopper typed (e.g. a budget) may be repeated back.
        shopper_text = " ".join(
            part.content
            for message in ctx.messages
            for part in getattr(message, "parts", [])
            if isinstance(part, UserPromptPart) and isinstance(part.content, str)
        )
        allowed = ctx.deps.seen_prices | {float(a.replace(",", "")) for a in PRICE_RE.findall(shopper_text)}
        unverified = sorted(
            {a for a in PRICE_RE.findall(output.reply) if not any(abs(float(a.replace(",", "")) - p) < 0.005 for p in allowed)}
        )
        if unverified:
            raise ModelRetry(
                f"The reply states price(s) {['$' + a for a in unverified]} that no tool returned in this turn. "
                "Call get_product_price (or another product tool) and use the exact database price, or remove the amount."
            )
        return output

    return agent


# ---------- Context sections appended to the system prompt each run ----------
# Built from ChatDeps (set by FastAPI from the session and the verified page
# context), so the shopper can't spoof them by typing into the chat.

PAGE_LABELS = {
    "home": "the Home page",
    "products": "the Products (catalogue) page",
    "about": "the About Us page",
    "login": "the Log in page",
    "create_account": "the Create account page",
    "other": "another page",
}


def customer_context_text(deps: ChatDeps) -> str:
    c = deps.customer
    if not c.logged_in:
        return "## Customer context\nThe shopper is a guest (not logged in). You don't know their name or email."
    full_name = " ".join(part for part in (c.first_name, c.last_name) if part) or "unknown"
    return (
        "## Customer context\n"
        "The shopper is logged in to their Campus Customs account.\n"
        f"- First name: {c.first_name or 'unknown'}\n"
        f"- Full name: {full_name}\n"
        f"- Email: {c.email or 'unknown'}\n"
        "This chat is saved to their account, so earlier messages in this conversation may be from previous visits."
    )


def page_context_text(deps: ChatDeps) -> str:
    page = deps.page
    if page is None:
        return "## Page context\nThe current page is unknown."
    if page.page_type == "product" and page.product_id:
        return (
            "## Page context\n"
            f"The shopper is viewing the product page for **{page.product_name}** (product_id: `{page.product_id}`).\n"
            "References like \"this\", \"it\", \"this one\", or \"the item I'm looking at\" mean this product, "
            "unless the shopper names a different one. Use this product_id with your tools."
        )
    return f"## Page context\nThe shopper is on {PAGE_LABELS.get(page.page_type, 'another page')} (`{page.path}`). No specific product is open."


def to_message_history(history: list[ChatTurn]) -> list[ModelMessage]:
    """Convert the widget's earlier turns into PydanticAI message history."""
    messages: list[ModelMessage] = []
    for turn in history:
        if turn.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=turn.content)]))
        else:
            messages.append(ModelResponse(parts=[TextPart(content=turn.content)]))
    return messages


def has_unresolved_reference(message: str, history: list[ChatTurn], page: PageContext | None) -> bool:
    """True when the message says "it"/"this" but nothing (page, conversation, or a named
    product or item type) tells us which product is meant."""
    if not REFERENCE_RE.search(message) or history or (page is not None and page.product_id):
        return False
    text = " ".join(re.sub(r"[^a-z0-9]+", " ", message.lower()).split())
    words = set(text.split())
    if words & GARMENT_WORDS or {w.rstrip("s") for w in words} & GARMENT_WORDS:
        return False  # e.g. "show me hoodies; does it come in navy?" is a search, not a lost reference
    names = (" ".join(re.sub(r"[^a-z0-9]+", " ", p["name"].lower()).split()) for p in fetch_all_products())
    return not any(name in text for name in names)


def _audit_entries(
    run_id: str,
    messages: list[ModelMessage],
    stop_reason: StopReason,
    started: float,
    started_at,
    deps: ChatDeps,
    output: AgentReply | None,
) -> list[AuditEntry]:
    """Turn one run's messages into audit entries: start, each tool call + result, retries, end."""
    session = "logged_in" if deps.customer.logged_in else "guest"
    page = None
    if deps.page is not None:
        page = f"product:{deps.page.product_id}" if deps.page.product_id else deps.page.page_type
    common = dict(run_id=run_id, model=MODEL_NAME, session=session, user_id=deps.customer.user_id, page=page)

    entries = [AuditEntry(timestamp=started_at, step=1, event="run_start", result="Agent run started", **common)]
    calls: dict[str, tuple[ToolCallPart, int, object]] = {}
    iteration = 0
    tool_calls = 0
    for message in messages:
        if isinstance(message, ModelResponse):
            iteration += 1
            for part in message.parts:
                if isinstance(part, ToolCallPart) and part.tool_name != OUTPUT_TOOL:
                    calls[part.tool_call_id] = (part, iteration, message.timestamp)
        elif isinstance(message, ModelRequest):
            for part in message.parts:
                if isinstance(part, ToolReturnPart) and part.tool_name != OUTPUT_TOOL:
                    call, it, ts = calls.pop(part.tool_call_id, (None, iteration, part.timestamp))
                    tool_calls += 1
                    entries.append(AuditEntry(
                        timestamp=ts, step=len(entries) + 1, event="tool_call", iteration=it, tool_name=part.tool_name,
                        args=summarize_args(call.args_as_dict()) if call else None,
                        result=summarize_result(part.content), status="ok", **common,
                    ))
                elif isinstance(part, RetryPromptPart):
                    reason = truncate(str(part.content), 240)
                    if part.tool_name in (None, OUTPUT_TOOL):
                        # An output validator rejected the reply (e.g. an unverified price) and asked for a retry.
                        entries.append(AuditEntry(
                            timestamp=part.timestamp, step=len(entries) + 1, event="validation_retry",
                            iteration=iteration, tool_name=OUTPUT_TOOL, result=reason, status="retry", **common,
                        ))
                    else:
                        call, it, ts = calls.pop(part.tool_call_id or "", (None, iteration, part.timestamp))
                        tool_calls += 1
                        entries.append(AuditEntry(
                            timestamp=ts, step=len(entries) + 1, event="tool_call", iteration=it, tool_name=part.tool_name,
                            args=summarize_args(call.args_as_dict()) if call else None,
                            result=reason, status="retry", **common,
                        ))
    for call, it, ts in calls.values():  # calls that never got a result (e.g. the run was stopped)
        entries.append(AuditEntry(
            timestamp=ts, step=len(entries) + 1, event="tool_call", iteration=it, tool_name=call.tool_name,
            args=summarize_args(call.args_as_dict()), result="No result (run stopped first)", status="no_result", **common,
        ))

    if output is not None:
        outcome = f"reply_type={output.reply_type}; {len(output.product_ids)} product card(s)"
    else:
        outcome = "No reply produced"
    entries.append(AuditEntry(
        timestamp=now_utc(), step=len(entries) + 1, event="run_end", iteration=iteration,
        result=f"{outcome}; {tool_calls} tool call(s) in {iteration} model request(s)",
        status="ok" if stop_reason == "final_response" else "error",
        stop_reason=stop_reason, duration_ms=round((time.monotonic() - started) * 1000), **common,
    ))
    return entries


async def run_chat(
    message: str,
    history: list[ChatTurn],
    customer: CustomerContext | None = None,
    page: PageContext | None = None,
) -> AgentReply:
    """Run the agent for one shopper message and return its structured reply.

    customer and page travel in the agent's dependency object (ChatDeps), not
    in the shopper's message text. Every run is recorded in output/audit_trail.json
    (backend/audit.py), including runs that stop early or fail.
    """
    run_id = uuid.uuid4().hex[:12]
    started, started_at = time.monotonic(), now_utc()
    deps = ChatDeps(
        customer=customer or CustomerContext(),
        page=page,
        unresolved_reference=has_unresolved_reference(message, history, page),
    )
    agent_run = None
    output: AgentReply | None = None
    stop_reason: StopReason = "error"
    try:
        async with get_agent().iter(
            message,
            deps=deps,
            message_history=to_message_history(history),
            usage_limits=RUN_LIMITS,
        ) as agent_run:
            async for _node in agent_run:  # the same agent loop as agent.run(), stepped node by node
                pass
        output = agent_run.result.output
        stop_reason = "final_response"
    except UsageLimitExceeded:
        stop_reason = "max_iterations"
        output = AgentReply(reply=LIMIT_REPLY, reply_type="cannot_confirm")
    except ModelHTTPError as exc:
        if not is_content_filtered(exc):
            stop_reason = "model_error"
            raise
        stop_reason = "content_filter"
        output = AgentReply(reply=SAFETY_FALLBACK_REPLY)
    except AgentNotConfigured:
        stop_reason = "not_configured"
        raise
    except UnexpectedModelBehavior:
        stop_reason = "validation_error"  # e.g. output validators kept rejecting the reply
        raise
    finally:
        messages = agent_run.new_messages() if agent_run is not None else []
        append_entries(_audit_entries(run_id, messages, stop_reason, started, started_at, deps, output))
    return output
