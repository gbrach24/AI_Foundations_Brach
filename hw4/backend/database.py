"""Shared SQLite access for data/campus_customs.db.

Used by the API routes in main.py and by the chatbot tools in tools.py, so the
website and the agent read products from the same source.
"""

import json
import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
# CAMPUS_CUSTOMS_DB lets tests point at a copy of the database.
DB_PATH = Path(os.environ.get("CAMPUS_CUSTOMS_DB", DATA_DIR / "campus_customs.db"))
MEDIA_URL_PREFIX = "/media"  # catalogue.image_file_path is relative to data/

# Standard apparel sizes in display order; anything else sorts after these.
SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]

PRODUCTS_WITH_STOCK_SQL = """
    SELECT c.*, COALESCE(SUM(i.quantity), 0) AS total_stock
    FROM catalogue c
    LEFT JOIN inventory i ON i.product_id = c.product_id
    GROUP BY c.product_id
    ORDER BY c.name
"""


@contextmanager
def get_connection(writable: bool = False) -> Iterator[sqlite3.Connection]:
    """Connection that is always closed after use; read-only unless writable."""
    mode = "rw" if writable else "ro"
    conn = sqlite3.connect(f"file:{DB_PATH}?mode={mode}", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def size_sort_key(size: str) -> tuple[int, str]:
    upper = size.upper()
    if upper in SIZE_ORDER:
        return (SIZE_ORDER.index(upper), upper)
    return (len(SIZE_ORDER), upper)


def product_from_row(row: sqlite3.Row) -> dict:
    return {
        "product_id": row["product_id"],
        "name": row["name"],
        "garment_type": row["garment_type"],
        "description": row["description"],
        "colors": json.loads(row["colors"]),
        "search_tags": json.loads(row["search_tags"]),
        "price": row["price"],
        "image_file_path": row["image_file_path"],
        "image_url": f"{MEDIA_URL_PREFIX}/{row['image_file_path']}",
    }


def short_description(description: str) -> str:
    """First sentence of catalogue.description, used on cards and in search results."""
    return description.split(". ")[0].rstrip(".") + "."


def fetch_all_products() -> list[dict]:
    """Every catalogue product with total stock and in-stock sizes, sorted by name."""
    with get_connection() as conn:
        rows = conn.execute(PRODUCTS_WITH_STOCK_SQL).fetchall()
        stock_rows = conn.execute("SELECT product_id, size FROM inventory WHERE quantity > 0").fetchall()
    in_stock: dict[str, list[str]] = {}
    for r in stock_rows:
        in_stock.setdefault(r["product_id"], []).append(r["size"])
    return [
        {
            **product_from_row(r),
            "total_stock": r["total_stock"],
            "in_stock_sizes": sorted(in_stock.get(r["product_id"], []), key=size_sort_key),
        }
        for r in rows
    ]


def fetch_product(product_id: str) -> dict | None:
    """One product plus its per-size inventory, or None if it doesn't exist."""
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (product_id,)).fetchone()
        if row is None:
            return None
        inv_rows = conn.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
        ).fetchall()

    inventory = sorted(
        ({"size": r["size"], "quantity": r["quantity"]} for r in inv_rows),
        key=lambda item: size_sort_key(item["size"]),
    )
    return {
        **product_from_row(row),
        "inventory": inventory,
        "total_stock": sum(item["quantity"] for item in inventory),
    }
