"""Append-only audit trail of agent-loop activity (output/audit_trail.json).

Each chat run adds: one `run_start` entry, one `tool_call` entry per tool call
(with short arguments and a short result summary), a `validation_retry` entry
whenever an output validator sent the model back, and one `run_end` entry with
the stop reason. Entries are summarized and redacted before writing: no message
text, emails, passwords, hashes, tokens, or large product payloads.

The file is never truncated: existing entries are loaded, kept as-is, and the
new entries are appended under an exclusive file lock, then written atomically.
"""

import fcntl
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from models import AuditEntry

logger = logging.getLogger("campus_customs.audit")

AUDIT_PATH = Path(
    os.environ.get("AUDIT_TRAIL_PATH", Path(__file__).resolve().parent.parent / "output" / "audit_trail.json")
)

MAX_ARG_CHARS = 120      # per argument value
MAX_RESULT_CHARS = 240   # per result summary
MAX_LIST_ITEMS = 5       # items kept from any list argument
SENSITIVE_KEY = re.compile(r"pass(word)?|hash|token|secret|api[_-]?key|auth|cookie|session|email", re.I)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def truncate(text: str, limit: int) -> str:
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def scrub(text: str) -> str:
    """Remove anything that looks like an email address."""
    return EMAIL_RE.sub("[email]", text)


def summarize_args(args: dict[str, Any] | None) -> dict[str, Any]:
    """Short, redacted copy of tool-call arguments."""
    out: dict[str, Any] = {}
    for key, value in (args or {}).items():
        if SENSITIVE_KEY.search(key):
            out[key] = "[redacted]"
        elif value is None or isinstance(value, (bool, int, float)):
            out[key] = value
        elif isinstance(value, (list, tuple)):
            out[key] = [truncate(scrub(str(v)), MAX_ARG_CHARS) for v in value[:MAX_LIST_ITEMS]]
            if len(value) > MAX_LIST_ITEMS:
                out[key].append(f"…(+{len(value) - MAX_LIST_ITEMS} more)")
        else:
            out[key] = truncate(scrub(str(value)), MAX_ARG_CHARS)
    return out


def _ids(items: list[dict], limit: int = 4) -> str:
    ids = [i.get("product_id", "?") for i in items[:limit]]
    return ", ".join(ids) + (f", …(+{len(items) - limit})" if len(items) > limit else "")


def summarize_result(content: Any) -> str:
    """Concise description of a tool result: counts + identifiers, never full payloads."""
    data = content.model_dump() if isinstance(content, BaseModel) else content
    if isinstance(data, dict):
        if "total_matches" in data and "products" in data:  # ProductSearchResult
            text = f"{data['total_matches']} match(es); returned {len(data['products'])}: {_ids(data['products'])}"
            if data.get("note"):
                text += f" | note: {data['note']}"
        elif "recommendations" in data:  # RecommendationResult
            text = (
                f"{len(data['recommendations'])} recommendation(s) from {data['total_candidates']} candidate(s): "
                f"{_ids(data['recommendations'])}"
            )
            if data.get("note"):
                text += f" | note: {data['note']}"
        elif "total_products" in data:  # CatalogueOverview
            text = (
                f"{data['total_products']} products; ${data['price_min']:.2f}–${data['price_max']:.2f}; "
                f"categories: {', '.join(data['categories'])}"
            )
        elif "status" in data and "message" in data:  # Problem 6 lookup results
            text = f"[{data['status']}] {data['message']}"
            if data.get("candidates"):
                text += f" | candidates: {_ids(data['candidates'], 3)}"
        else:
            text = json.dumps(data, default=str)
    else:
        text = str(data)
    return truncate(scrub(text), MAX_RESULT_CHARS)


def _load_existing(path: Path) -> list[Any]:
    """Existing entries, kept exactly as stored. An unreadable file is moved aside, never overwritten."""
    if not path.exists() or path.stat().st_size == 0:
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
        raise ValueError("audit trail is not a JSON list")
    except (ValueError, json.JSONDecodeError) as exc:
        aside = path.with_name(f"{path.stem}.unreadable-{now_utc():%Y%m%dT%H%M%S}{path.suffix}")
        path.rename(aside)
        logger.error("Audit trail %s was unreadable (%s); moved to %s and started a new file.", path.name, type(exc).__name__, aside.name)
        return []


def append_entries(entries: list[AuditEntry], path: Path = AUDIT_PATH) -> bool:
    """Append entries to the audit trail. Returns False (and logs why) if the write failed.

    Never raises: a logging problem must not break the shopper's chat.
    """
    if not entries:
        return True
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path.with_name(path.name + ".lock"), "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)  # serializes concurrent chat requests / server processes
            existing = _load_existing(path)
            existing.extend(e.model_dump(mode="json") for e in entries)
            tmp = path.with_name(path.name + ".tmp")
            tmp.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            tmp.replace(path)  # atomic: the file on disk is always complete, valid JSON
        return True
    except Exception as exc:  # visible for debugging; no secrets are in the exception context
        logger.error("Audit trail write failed (%s: %s); %d entr(ies) not recorded.", type(exc).__name__, exc, len(entries))
        return False
