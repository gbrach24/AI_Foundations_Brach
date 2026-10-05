"""Tools the Campus Customs chatbot can call.

Every product fact the agent states should come from one of these tools, which
read the same data/campus_customs.db the website uses (via database.py). No
prices or stock levels live in this file; they are queried on every call.

Problem 5: get_catalogue_overview, search_products.
Problem 6: database lookups for one product's description, price, inventory,
and inventory in a specific size (get_product_description, get_product_price,
get_product_inventory, get_size_inventory).
Problem 9: recommend_products (in-stock recommendations with database-backed reasons).

To add a shopping ability later, write a function taking RunContext[ChatDeps]
and add it to SHOP_TOOLS.
"""

import difflib
import re
from dataclasses import dataclass, field
from typing import Literal

from pydantic_ai import RunContext

from database import fetch_all_products, fetch_product, get_connection, short_description, size_sort_key
from models import (
    CatalogueOverview,
    CustomerContext,
    PageContext,
    ProductCandidate,
    ProductDescriptionResult,
    ProductInventoryResult,
    ProductPriceResult,
    ProductSearchResult,
    ProductSummary,
    Recommendation,
    RecommendationResult,
    SizeInventoryResult,
    SizeStock,
)


@dataclass
class ChatDeps:
    """Per-request context handed to every tool."""

    customer: CustomerContext = field(default_factory=CustomerContext)
    page: PageContext | None = None
    # product_ids returned by tools during this run; the agent may only cite these.
    seen_product_ids: set[str] = field(default_factory=set)
    # Prices returned by tools during this run; any $ amount in the reply must be one of these.
    seen_prices: set[float] = field(default_factory=set)
    # Set by agent.run_chat: the message says "it"/"this" but nothing identifies a product.
    unresolved_reference: bool = False


Category = Literal["Hoodies", "Crewnecks", "Quarter-Zips", "Tees & Tops", "Jackets & Fleece"]
CATEGORIES: tuple[str, ...] = Category.__args__

# catalogue.garment_type has 22 inconsistent spellings; these keyword rules
# mirror categoryOf() in frontend/src/lib/format.ts so the bot and site agree.
def category_of(garment_type: str) -> Category:
    t = garment_type.lower()
    if "hood" in t:
        return "Hoodies"
    if "quarter-zip" in t:
        return "Quarter-Zips"
    if "jacket" in t or "fleece" in t:
        return "Jackets & Fleece"
    if "shirt" in t and "sweatshirt" not in t:
        return "Tees & Tops"
    return "Crewnecks"


# Same collection names as the website (frontend/src/lib/collections.ts).
COLLECTIONS = ["Residential Colleges", "Game Day & Sports", "For the Family", "Graduate Schools"]

STOPWORDS = {
    "a", "an", "and", "any", "anything", "are", "do", "does", "for", "from", "have", "i", "in", "is", "it",
    "me", "my", "of", "on", "or", "show", "some", "something", "that", "the", "to", "what", "with", "you",
    "your", "got", "want", "looking", "need", "find", "item", "items", "product", "products",
}
SYNONYMS = {
    "tee": ["t shirt"],
    "tshirt": ["t shirt"],
    "hoodie": ["hoodie", "hooded"],
    "hoody": ["hoodie", "hooded"],
    "sweater": ["sweatshirt", "fleece", "sweater"],
    "quarterzip": ["quarter zip", "1 4 zip"],
    "grey": ["gray"],
}
# Words that name a kind of item. They only match a product's name and
# garment_type, so a "sailor hat" graphic or a "college shirt" tag doesn't make
# a hoodie show up for "hats" or "shirts".
GARMENT_WORDS = {
    "hoodie", "hoody", "hooded", "crewneck", "sweatshirt", "shirt", "tshirt", "tee", "quarterzip", "zip",
    "jacket", "fleece", "sweater", "bomber", "mockneck", "pullover", "hat", "cap", "beanie", "mug", "sock",
    "shorts", "pants", "jogger", "sweatpants", "polo", "scarf", "bag", "tote", "pennant", "blanket", "sticker",
}
KEEP_PLURAL = {"shorts", "pants", "sweatpants", "glasses"}  # singularizing changes the meaning


def _normalize(text: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text.lower()).split())


@dataclass
class _Term:
    variants: list[str]  # normalized spellings, matched as whole words
    garment: bool        # match only name + garment_type
    word: str = ""       # the shopper's original word, for explanations


def _terms(query: str) -> list[_Term]:
    """Split a query into terms, each with its accepted spellings."""
    text = re.sub(r"quarter[\s-]zip", "quarterzip", query.lower()).replace("t-shirt", "tshirt").replace("t shirt", "tshirt")
    terms = []
    for word in re.findall(r"[a-z0-9/]+", text):
        if word in STOPWORDS or len(word) < 2:
            continue
        singular = word[:-1] if word.endswith("s") and len(word) > 3 and word not in KEEP_PLURAL else word
        variants = {word, singular, *SYNONYMS.get(singular, []), *SYNONYMS.get(word, [])}
        if singular == "tshirt":
            variants = {"t shirt", "tshirt"}
        terms.append(_Term(sorted({_normalize(v) for v in variants}), garment=singular in GARMENT_WORDS, word=word))
    return terms


def _has_word(text: str, variant: str) -> bool:
    """Whole-word match on normalized text, allowing a plural ending ("hoodie" ~ "hoodies")."""
    return re.search(rf"(?<![a-z0-9]){re.escape(variant)}(?:s|es)?(?![a-z0-9])", text) is not None


def _summary(product: dict) -> ProductSummary:
    return ProductSummary(
        product_id=product["product_id"],
        name=product["name"],
        garment_type=product["garment_type"],
        price=product["price"],
        colors=product["colors"],
        total_stock=product["total_stock"],
        short_description=short_description(product["description"]),
    )


def _passes_filters(
    p: dict,
    category: str | None = None,
    color: str | None = None,
    max_price: float | None = None,
    min_price: float | None = None,
    size_in_stock: str | None = None,
) -> bool:
    if category and category_of(p["garment_type"]) != category:
        return False
    if color and not any(color.lower() in c.lower() for c in p["colors"]):
        return False
    if max_price is not None and p["price"] > max_price:
        return False
    if min_price is not None and p["price"] < min_price:
        return False
    if size_in_stock and size_in_stock.upper() not in {s.upper() for s in p["in_stock_sizes"]}:
        return False
    return True


def _match(p: dict, terms: list["_Term"]) -> tuple[int, int]:
    """(keywords matched, weighted score) for one product."""
    fields = {
        "name": (_normalize(p["name"]), 3),
        "type": (_normalize(p["garment_type"]), 2),
        "tags": (_normalize(" ".join(p["search_tags"])), 2),
        "colors": (_normalize(" ".join(p["colors"])), 1),
        "description": (_normalize(p["description"]), 1),
    }
    matched_terms, score = 0, 0
    for term in terms:
        searchable = ("name", "type") if term.garment else fields
        term_score = max(
            (fields[f][1] for f in searchable if any(_has_word(fields[f][0], v) for v in term.variants)), default=0
        )
        if term_score:
            matched_terms += 1
            score += term_score
    return matched_terms, score


def _rank(products: list[dict], terms: list["_Term"]) -> tuple[list[tuple[int, int, dict]], int]:
    """Products matching at least one keyword, best first; plus the best keyword count.
    With several keywords, only products matching the most keywords are kept."""
    scored = []
    for p in products:
        matched, score = _match(p, terms)
        if terms and matched == 0:
            continue
        scored.append((matched, score, p))
    scored.sort(key=lambda item: (-item[0], -item[1], item[2]["name"]))
    best = scored[0][0] if scored else 0
    if len(terms) > 1:
        scored = [item for item in scored if item[0] == best]
    return scored, best


def search_products(
    ctx: RunContext[ChatDeps],
    query: str = "",
    category: Category | None = None,
    color: str | None = None,
    max_price: float | None = None,
    min_price: float | None = None,
    size_in_stock: str | None = None,
    limit: int = 8,
) -> ProductSearchResult:
    """Search the Campus Customs catalogue.

    Args:
        query: Keywords such as a college, sport, school, family member, design, or garment
            (e.g. "Saybrook", "hockey hoodie", "Yale Mom", "vintage bulldog"). Leave empty to browse.
        category: Optional category filter.
        color: Optional color filter, e.g. "navy" or "gray".
        max_price: Optional maximum price in US dollars.
        min_price: Optional minimum price in US dollars.
        size_in_stock: Optional size (XS, S, M, L, XL, XXL); only products with that size in stock are returned.
        limit: Maximum number of products to return (1-12).
    """
    limit = max(1, min(limit, 12))
    products = [
        p for p in fetch_all_products()
        if _passes_filters(p, category, color, max_price, min_price, size_in_stock)
    ]
    terms = _terms(query)
    scored, best = _rank(products, terms)
    results = [p for *_, p in scored]

    ctx.deps.seen_product_ids.update(p["product_id"] for p in results[:limit])
    ctx.deps.seen_prices.update(p["price"] for p in results[:limit])
    note, we_carry = None, []
    if not results:
        note = "No products matched. Try fewer or broader keywords, or drop a filter."
        we_carry = list(CATEGORIES)
    elif len(terms) > 1 and best < len(terms):
        note = f"No product matched every keyword; these match {best} of {len(terms)}."
    return ProductSearchResult(
        total_matches=len(results), products=[_summary(p) for p in results[:limit]], note=note, we_carry=we_carry
    )


def get_catalogue_overview(ctx: RunContext[ChatDeps]) -> CatalogueOverview:
    """A summary of what Campus Customs sells: product count, categories, price range, sizes, and collections.
    Use this for broad questions like "what do you sell?"."""
    products = fetch_all_products()
    categories: dict[str, int] = {}
    for p in products:
        cat = category_of(p["garment_type"])
        categories[cat] = categories.get(cat, 0) + 1
    with get_connection() as conn:
        sizes = [r[0] for r in conn.execute("SELECT DISTINCT size FROM inventory").fetchall()]
    price_min, price_max = min(p["price"] for p in products), max(p["price"] for p in products)
    ctx.deps.seen_prices.update({price_min, price_max})
    return CatalogueOverview(
        total_products=len(products),
        categories=dict(sorted(categories.items(), key=lambda kv: -kv[1])),
        price_min=price_min,
        price_max=price_max,
        sizes_offered=sorted(sizes, key=size_sort_key),
        collections=COLLECTIONS,
    )


# ---------- Recommendations (Problem 9) ----------

Recipient = Literal[
    "myself", "student", "alum", "fan", "mom", "dad", "parent", "grandparent", "sibling", "relative", "other"
]
# Family products are named for the wearer ("Yale Mom Hoodie"), so they are only
# recommended for that relative, and never for a student or the shopper themself.
FAMILY_NAME_KEYWORDS: dict[str, list[str]] = {
    "mom": ["yale mom"],
    "dad": ["yale dad"],
    "parent": ["yale mom", "yale dad"],
    "grandparent": ["yale grandma", "yale grandpa"],
    "sibling": ["yale brother"],
    "relative": ["yale mom", "yale dad", "yale grandma", "yale grandpa", "yale aunt", "yale uncle", "yale brother", "yale cousin"],
}
ALL_FAMILY_KEYWORDS = sorted({k for kws in FAMILY_NAME_KEYWORDS.values() for k in kws})
# Words that describe the request rather than the product.
REQUEST_WORDS = {
    "recommend", "recommendation", "suggest", "suggestion", "gift", "gifts", "present", "idea", "ideas", "good",
    "nice", "great", "best", "popular", "student", "students", "freshman", "alum", "alumni", "fan", "fans", "someone",
    "him", "her", "them", "their", "his", "who", "likes", "like", "would", "should", "buy", "get", "under",
    "mom", "dad", "mother", "father", "parent", "parents", "grandma", "grandpa", "grandparent", "brother", "sister",
}


def _family_kind(name: str) -> bool:
    lowered = name.lower()
    return any(k in lowered for k in ALL_FAMILY_KEYWORDS)


def recommend_products(
    ctx: RunContext[ChatDeps],
    request: str = "",
    recipient: Recipient | None = None,
    category: Category | None = None,
    color: str | None = None,
    max_price: float | None = None,
    size: str | None = None,
    limit: int = 4,
) -> RecommendationResult:
    """Recommend in-stock Campus Customs products for a shopper's need, e.g. a gift or "a Yale hoodie for a student".

    Only products that exist and are in stock are returned, each with database-backed reasons.

    Args:
        request: Keywords for what they want, e.g. "Yale hoodie", "Saybrook", "hockey", "vintage bulldog". May be empty.
        recipient: Who it's for, if known. Family items ("Yale Mom", "Yale Dad"...) are only suggested for that relative.
        category: Optional category filter.
        color: Optional color, e.g. "navy".
        max_price: Optional budget in US dollars.
        size: Optional size the recipient wears (e.g. "M", "large"); only products in stock in it are returned.
        limit: How many to recommend (1-6).
    """
    limit = max(1, min(limit, 6))
    size_code = normalize_size(size) if size else None
    criteria = [f"for: {recipient}" if recipient else "", f"category: {category}" if category else "",
                f"color: {color}" if color else "", f"under ${max_price:.2f}" if max_price is not None else "",
                f"in stock in {size_code}" if size_code else "", f"keywords: {request}" if request.strip() else ""]
    criteria = [c for c in criteria if c] or ["no preferences given"]

    candidates = [
        p for p in fetch_all_products()
        if p["total_stock"] > 0 and _passes_filters(p, category, color, max_price, None, size_code)
    ]
    family_keywords = FAMILY_NAME_KEYWORDS.get(recipient or "")
    note = None
    if family_keywords:
        family = [p for p in candidates if any(k in p["name"].lower() for k in family_keywords)]
        if family:
            candidates = family
        else:
            note = f"No in-stock '{recipient}' items match these filters, so these are general Yale picks."
            candidates = [p for p in candidates if not _family_kind(p["name"])]
    else:
        candidates = [p for p in candidates if not _family_kind(p["name"])]

    terms = [t for t in _terms(request) if not set(t.variants) & REQUEST_WORDS]
    scored, best = _rank(candidates, terms)
    if terms and not scored:
        return RecommendationResult(
            criteria=criteria, total_candidates=0, recommendations=[],
            note=f"No in-stock products match '{request}' with these filters. Try broader keywords or fewer filters.",
        )
    # More sizes in stock = safer gift; then more stock overall.
    scored.sort(key=lambda item: (-item[0], -item[1], -len(item[2]["in_stock_sizes"]), -item[2]["total_stock"], item[2]["name"]))

    # Variety: without a category, take at most 2 per category on the first pass.
    picked, per_category = [], {}
    for _, _, p in scored:
        cat = category_of(p["garment_type"])
        if category or per_category.get(cat, 0) < 2:
            picked.append(p)
            per_category[cat] = per_category.get(cat, 0) + 1
        if len(picked) == limit:
            break
    for _, _, p in scored:
        if len(picked) == limit:
            break
        if p not in picked:
            picked.append(p)

    recommendations = []
    for p in picked:
        _record(ctx, p)
        reasons = []
        if terms:
            hits = [t.word for t in terms if _match(p, [t])[0]]
            if hits:
                reasons.append("Matches: " + ", ".join(hits))
        if family_keywords and any(k in p["name"].lower() for k in family_keywords):
            reasons.append(f"Made for a proud {recipient}")
        if max_price is not None:
            reasons.append(f"Within budget at ${p['price']:.2f}")
        reasons.append(f"In stock in {len(p['in_stock_sizes'])} size(s): {', '.join(p['in_stock_sizes'])}")
        recommendations.append(Recommendation(
            product_id=p["product_id"], name=p["name"], garment_type=p["garment_type"], price=p["price"],
            colors=p["colors"], in_stock_sizes=p["in_stock_sizes"], short_description=short_description(p["description"]),
            reasons=reasons,
        ))
    return RecommendationResult(criteria=criteria, total_candidates=len(scored), recommendations=recommendations, note=note)


# ---------- Database product lookups (Problem 6) ----------

MAX_CANDIDATES = 8

SIZE_ALIASES = {
    "xs": "XS", "x small": "XS", "extra small": "XS", "xsmall": "XS",
    "s": "S", "sm": "S", "small": "S",
    "m": "M", "med": "M", "medium": "M",
    "l": "L", "lg": "L", "large": "L",
    "xl": "XL", "x large": "XL", "extra large": "XL", "xlarge": "XL",
    "xxl": "XXL", "2xl": "XXL", "xx large": "XXL", "extra extra large": "XXL", "double xl": "XXL", "xxlarge": "XXL",
}


def normalize_size(size: str) -> str:
    """Map shopper wording ("medium", "larges", "2XL") to the inventory.size code."""
    key = _normalize(size)
    if key in SIZE_ALIASES:
        return SIZE_ALIASES[key]
    if key.endswith("s") and key[:-1] in SIZE_ALIASES:  # "larges", "mediums"
        return SIZE_ALIASES[key[:-1]]
    return size.strip().upper()


@dataclass
class _Resolution:
    status: Literal["found", "not_found", "ambiguous"]
    product: dict | None = None  # database.fetch_product() result when found
    candidates: list[dict] = field(default_factory=list)


def _resolve_product(query: str) -> _Resolution:
    """Find exactly one catalogue product from a product_id or a name.

    Order: exact product_id -> exact name -> every keyword in the name/garment
    type (one match = found, several = ambiguous) -> close spellings (not_found
    with suggestions). Never picks one of several matches on its own.
    """
    products = fetch_all_products()
    raw = query.strip()
    wanted = _normalize(raw)
    for p in products:
        if raw.lower() == p["product_id"] or wanted == _normalize(p["name"]):
            return _Resolution("found", fetch_product(p["product_id"]))

    terms = _terms(wanted)
    if terms:
        matches = [
            p for p in products
            if all(any(_has_word(_normalize(p["name"] + " " + p["garment_type"]), v) for v in t.variants) for t in terms)
        ]
        if len(matches) == 1:
            return _Resolution("found", fetch_product(matches[0]["product_id"]))
        if matches:
            matches.sort(key=lambda p: (len(p["name"]), p["name"]))
            return _Resolution("ambiguous", candidates=matches[:MAX_CANDIDATES])

    by_name = {_normalize(p["name"]): p for p in products}
    close = difflib.get_close_matches(wanted, list(by_name), n=3, cutoff=0.6)
    return _Resolution("not_found", candidates=[by_name[name] for name in close])


def _candidates(ctx: RunContext[ChatDeps], resolution: _Resolution) -> list[ProductCandidate]:
    for p in resolution.candidates:
        ctx.deps.seen_product_ids.add(p["product_id"])
        ctx.deps.seen_prices.add(p["price"])
    return [ProductCandidate(product_id=p["product_id"], name=p["name"], price=p["price"]) for p in resolution.candidates]


def _lookup_message(query: str, resolution: _Resolution) -> str:
    if resolution.status == "ambiguous":
        return (
            f"'{query}' matches {len(resolution.candidates)}+ products. Do not guess: ask the shopper which one "
            "they mean (the candidates are listed), then look it up again by product_id."
        )
    suggestion = " Similar names are listed in candidates." if resolution.candidates else ""
    return f"No product matching '{query}' was found in the Campus Customs catalogue.{suggestion}"


def _record(ctx: RunContext[ChatDeps], product: dict) -> None:
    ctx.deps.seen_product_ids.add(product["product_id"])
    ctx.deps.seen_prices.add(product["price"])


def _size_stock(inventory: list[dict]) -> list[SizeStock]:
    return [SizeStock(size=i["size"], quantity=i["quantity"], in_stock=i["quantity"] > 0) for i in inventory]


def get_product_description(ctx: RunContext[ChatDeps], product: str) -> ProductDescriptionResult:
    """Look up a product's description (plus garment type and colors) in the database.

    Args:
        product: The product_id (preferred, e.g. "yale-mom-hoodie") or the product name (e.g. "Yale Mom Hoodie").
    """
    resolution = _resolve_product(product)
    if resolution.status != "found":
        return ProductDescriptionResult(
            status=resolution.status, candidates=_candidates(ctx, resolution), message=_lookup_message(product, resolution)
        )
    p = resolution.product
    _record(ctx, p)
    return ProductDescriptionResult(
        status="found",
        product_id=p["product_id"],
        name=p["name"],
        garment_type=p["garment_type"],
        description=p["description"],
        colors=p["colors"],
        message=f"Description of {p['name']} from catalogue.description.",
    )


def get_product_price(ctx: RunContext[ChatDeps], product: str) -> ProductPriceResult:
    """Look up a product's current price (US dollars) in the database. Call this for every price question.

    Args:
        product: The product_id (preferred) or the product name.
    """
    resolution = _resolve_product(product)
    if resolution.status != "found":
        return ProductPriceResult(
            status=resolution.status, candidates=_candidates(ctx, resolution), message=_lookup_message(product, resolution)
        )
    p = resolution.product
    _record(ctx, p)
    return ProductPriceResult(
        status="found",
        product_id=p["product_id"],
        name=p["name"],
        price=p["price"],
        message=f"{p['name']} costs ${p['price']:.2f}.",
    )


def get_product_inventory(ctx: RunContext[ChatDeps], product: str) -> ProductInventoryResult:
    """Look up current stock for a product across all sizes. Call this for general "is it in stock?" questions.

    Args:
        product: The product_id (preferred) or the product name.
    """
    resolution = _resolve_product(product)
    if resolution.status != "found":
        return ProductInventoryResult(
            status=resolution.status, candidates=_candidates(ctx, resolution), message=_lookup_message(product, resolution)
        )
    p = resolution.product
    _record(ctx, p)
    sizes = _size_stock(p["inventory"])
    in_stock_sizes = [s.size for s in sizes if s.in_stock]
    out_sizes = [s.size for s in sizes if not s.in_stock]
    if not sizes:
        message = f"The database has no inventory records for {p['name']}; stock is unknown."
    elif in_stock_sizes:
        message = f"{p['name']} is in stock in {', '.join(in_stock_sizes)} ({p['total_stock']} total)."
        if out_sizes:
            message += f" Out of stock in {', '.join(out_sizes)}."
    else:
        message = f"{p['name']} is out of stock in every size."
    return ProductInventoryResult(
        status="found",
        product_id=p["product_id"],
        name=p["name"],
        in_stock=bool(in_stock_sizes) if sizes else None,
        total_stock=p["total_stock"] if sizes else None,
        sizes=sizes,
        in_stock_sizes=in_stock_sizes,
        out_of_stock_sizes=out_sizes,
        message=message,
    )


def get_size_inventory(ctx: RunContext[ChatDeps], product: str, size: str) -> SizeInventoryResult:
    """Look up how many of a product are in stock in one specific size. Call this whenever a size is mentioned.

    Args:
        product: The product_id (preferred) or the product name.
        size: The size the shopper asked about, e.g. "M", "medium", "Large", "XL", "XXL".
    """
    resolution = _resolve_product(product)
    if resolution.status != "found":
        status = "ambiguous_product" if resolution.status == "ambiguous" else "product_not_found"
        return SizeInventoryResult(
            status=status,
            requested_size=size,
            candidates=_candidates(ctx, resolution),
            message=_lookup_message(product, resolution),
        )

    p = resolution.product
    _record(ctx, p)
    code = normalize_size(size)
    sizes = _size_stock(p["inventory"])
    offered = [s.size for s in sizes]
    match = next((s for s in sizes if s.size.upper() == code), None)
    others = [s for s in sizes if s.in_stock and s is not match]
    common = dict(product_id=p["product_id"], name=p["name"], requested_size=size, sizes_offered=offered, other_sizes_in_stock=others)

    if match is None:
        return SizeInventoryResult(
            status="size_not_offered",
            message=f"{p['name']} does not come in size '{size}'. Sizes offered: {', '.join(offered) or 'none recorded'}.",
            **common,
        )
    if match.quantity > 0:
        return SizeInventoryResult(
            status="in_stock",
            size=match.size,
            quantity=match.quantity,
            message=f"{p['name']} is in stock in size {match.size}: {match.quantity} available.",
            **common,
        )
    alternatives = f" In stock in: {', '.join(s.size for s in others)}." if others else " It is out of stock in every size."
    return SizeInventoryResult(
        status="out_of_stock",
        size=match.size,
        quantity=0,
        message=f"{p['name']} is OUT OF STOCK in size {match.size} (quantity 0).{alternatives}",
        **common,
    )


SHOP_TOOLS = [
    get_catalogue_overview,
    search_products,
    recommend_products,
    get_product_description,
    get_product_price,
    get_product_inventory,
    get_size_inventory,
]
