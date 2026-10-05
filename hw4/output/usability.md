# Campus Customs — Usability Improvements (Problem 9)

Four improvements were added to the running app: **two front-end** and **two agent/backend**. Each builds on Problems 3–8 rather than replacing them: the same `ProductCard` component, product detail route, `/chat` API contract, database tools, login, and saved chat history.

| # | Type | Improvement | Where to see it |
|---|---|---|---|
| 1 | Front-end | Smarter product search & filters | **Products** page, plus the search box in the navbar |
| 2 | Front-end | Shopping bag (cart) | **Add to bag** on any product page; the 🛍 bag icon in the navbar; `/cart` |
| 3 | Agent/backend | Product recommendation tool | Chat: "I'm looking for a Yale hoodie for a student." |
| 4 | Agent/backend | Clarification & "can't confirm" fallback behavior | Chat: "Do you have it in another color?" with no product open |

How to run: `source .venv/bin/activate && cd backend && uvicorn main:app --reload --port 8000`, and in a second terminal `cd frontend && npm run dev`, then open http://localhost:5173.

---

## Improvement 1 — Smarter product search & filters

- **Type:** Front-end
- **What I added:** The Problems 3/7 Products page had only a keyword box, category chips, a collection menu, and sort. I added:
  - **Color filter:** color-swatch buttons (Navy, Blue, Gray, White & Cream, Black, Red, Yellow & Gold, Green, Coral & Pink), built from the catalogue's actual `colors` values. Only colors that exist are shown.
  - **Price bands:** Under $40, $40–$60, $60–$80, $80+.
  - **"In stock in size" filter (XS–XXL):** it uses live inventory, so a shopper sees only items they can actually buy in their size.
  - **Better keyword search:** all words must match, so "navy hoodie" means navy *and* hoodie.
  - **Active-filter pills:** "Showing N of 102 products", plus a removable pill for each active filter (✕) and **Clear all**.
  - **Useful empty state:** "No products match these filters" with one-click **Remove "…"** buttons for each filter, **Clear all filters**, and a pointer to the chat assistant.
  - **Navbar search box:** available on every page (desktop) and jumps to filtered Products results.
  - **Shareable URLs:** every filter is in the URL (`/products?q=…&category=…&color=…&price=…&size=…`), so results can be bookmarked, shared, and restored with Back.
  - **Mobile:** the filter panel collapses behind a **Filters (n)** button.
- **Why it helps a Campus Customs shopper or the business:** With 102 products, shoppers usually know a constraint: "navy", "under $60", or "I wear an M". Before, they had to scroll and open product pages to check colors and stock. The size filter in particular stops shoppers falling for items that are sold out in their size (145 of 612 size rows are at zero), which reduces frustration and abandoned visits. Shareable URLs let a parent send a filtered list to a student. For the business, faster discovery means more product-page visits and more add-to-bag.
- **Files changed:**
  - `frontend/src/pages/ProductsPage.tsx`: filter state, filtering, pills, and the empty state.
  - `frontend/src/lib/format.ts`: `COLOR_FAMILIES`, `PRICE_RANGES`, `SIZE_OPTIONS`, `hasColorFamily`.
  - `frontend/src/components/NavBar.tsx`: the navbar search form.
  - `frontend/src/lib/api.ts`: the `in_stock_sizes` field.
  - `frontend/src/index.css`: styles.
  - `backend/database.py`: `fetch_all_products()` now returns `in_stock_sizes` for each product, used by `/api/products` and by the agent's tools.
- **How it works:** `/api/products` returns each product's catalogue fields plus `total_stock` and `in_stock_sizes`. All filtering happens in the browser on that live data. Results still render with the existing `ProductGrid` / `ProductCard` from Problem 3, so every card still opens the same `/products/:productId` page.
- **How a grader can see it:**
  1. Open **Products**. Type "hoodie", tap **Hoodies**, then **Navy**, **$60–$80**, and size **M**: 27 → 25 → 21 → 15 results (matches the database).
  2. Tap **Coral & Pink**: you get the empty state. Use **Remove "Coral & Pink"** or **Clear all filters**.
  3. Remove any single pill with ✕.
  4. On a wide window, type "saybrook" in the navbar search on any page: 3 results.

## Improvement 2 — Shopping bag (cart)

- **Type:** Front-end
- **What I added:** The site had no cart. I added a full bag experience:
  - **Product page:** pick a size (the existing size buttons; sold-out sizes stay disabled), choose a quantity with a −/+ stepper capped at that size's stock, and tap **Add to bag**.
    - Tapping it without a size shows "Please choose a size first."
    - Adding shows "✓ Added 2 × Yale Grandpa Hoodie (XL) to your bag. View bag →".
    - Once you hold all the stock for a size, the button reads **Max in bag**.
  - **Navbar:** a bag icon 🛍 with a live item-count badge on every page.
  - **Bag page (`/cart`):** each line shows the image and name (linking back to the product page), size, unit price, a quantity stepper, the line total, and **Remove**. It also has a subtotal, **Continue shopping**, **Empty bag**, and a clearly disabled **Checkout coming soon** button (there's no payment system), plus a friendly empty state.
  - **Live re-check:** when the bag opens, every line is re-checked against the catalogue. If a price changed, it's updated with a notice. If the quantity is more than is now in stock, it's reduced ("Only 2 left in XL, so we adjusted your quantity."). A size that sold out is flagged and left out of the subtotal.
  - **Persistence:** the bag survives reloads and navigation for the browser session (`sessionStorage`).
- **Why it helps a Campus Customs shopper or the business:** Shoppers often build a set: a crewneck for themselves, a "Yale Dad" tee for a parent. Without a bag they had to remember items and sizes across pages. The bag gives a clear "I want this" action on every product page, a running count, and a summary to review. The stock-aware stepper and re-check stop people planning around items that aren't available. For the business, the bag is the foundation for real checkout.
- **Files changed:**
  - `frontend/src/lib/cart.tsx` (new): `CartProvider` / `useCart`, saved to sessionStorage.
  - `frontend/src/pages/CartPage.tsx` (new).
  - `frontend/src/components/QuantityStepper.tsx` (new).
  - `frontend/src/pages/ProductPage.tsx`: size + Add to bag panel.
  - `frontend/src/components/NavBar.tsx`: bag icon and badge.
  - `frontend/src/App.tsx`: the `/cart` route.
  - `frontend/src/main.tsx`: the provider.
  - `frontend/src/index.css`: styles.
  - `backend/prompts/prompt.md`: the bot now points shoppers to "Add to bag" instead of saying they can only browse.
- **How it works:** the bag is React context, mirrored to `sessionStorage`. Each line is keyed by `product_id` + `size`. The quantity limit comes from the product page's live inventory, and the Bag page refetches `/api/products/:id` for each line to confirm price and stock. No payment or orders are created.
- **How a grader can see it:**
  1. Open **Yale Grandpa Hoodie** (Large is sold out, XL has 2).
  2. Tap **Add to bag** with no size: you're prompted to choose one.
  3. Choose **XL**: + stops at 2. Add it, then add an **M**. The bag badge shows 3.
  4. Click the bag icon, change quantities, remove a line, reload the page (the bag is kept), and **Empty bag** to see the empty state.

## Improvement 3 — Product recommendation tool

- **Type:** Agent/backend
- **What I added:** A new PydanticAI tool, **`recommend_products`**, registered on the agent. It takes:
  - `request` keywords (e.g. "Yale hoodie", "Saybrook", "hockey");
  - a `recipient` (myself, student, alum, fan, mom, dad, parent, grandparent, sibling, relative, other);
  - and optional `category`, `color`, `max_price`, `size`, and `limit`.

  It returns a structured `RecommendationResult`: the criteria used, the candidate count, a `note`, and `Recommendation` items with `product_id`, name, garment type, price, colors, `in_stock_sizes`, short description, and **`reasons`** built only from database facts (e.g. "Matches: yale, hoodie", "Made for a proud dad", "Within budget at $32.00", "In stock in 6 size(s)…").

  The rules:
  - **Real products only:** it recommends only real, **in-stock** products, and only in the requested size if one is given.
  - **Family items:** items named for a relative ("Yale Mom", "Yale Dad"…) are recommended only for that relative, never for a student or the shopper themself. If no such item fits, it falls back to general picks with a note.
  - **Variety:** at most 2 per category on the first pass unless a category was requested.
  - **Ranking:** keyword relevance first, then the number of sizes in stock (safer for gifts), then stock depth.

  The agent puts the chosen `product_ids` in its normal output, so the **existing structured `products` cards** appear in the chat (same `/chat` contract, same `ProductCard`, same detail page).
- **Why it helps a Campus Customs shopper or the business:** Many shoppers are buying for someone else and don't know the product names: parents, grandparents, friends of students. "What should I get my dad under $40?" is a real question that keyword search can't answer. The tool gives a short, relevant, in-stock shortlist with honest reasons, instead of the model guessing or listing products that are sold out or wrong for the person (a "Yale Mom" hoodie for a freshman). Because every recommendation comes from the database and stock is checked, the shop never recommends something it can't sell.
- **Files changed:**
  - `backend/tools.py`: `recommend_products`, plus search scoring split into reusable `_passes_filters` / `_match` / `_rank` helpers that `search_products` and `recommend_products` both use, with no duplicated database logic.
  - `backend/models.py`: `Recommendation`, `RecommendationResult`.
  - `backend/agent.py`: registered via `SHOP_TOOLS`; recommended prices and ids feed the existing "only known products / only database prices" validators.
  - `backend/prompts/prompt.md`: §5 "Recommendations".
  - `backend/database.py`: `in_stock_sizes`.
- **How a grader can see it:** In the chat, ask **"I'm looking for a Yale hoodie for a student."** You get 4 in-stock Yale hoodies (no "Yale Mom/Dad/Grandpa" items) as clickable cards; clicking one opens the normal product page. Also try **"What would you recommend as a gift for my dad under $60?"**: you get the Yale Dad T Shirt ($32) and Yale Dad Crewneck ($58), with the in-stock sizes stated.

## Improvement 4 — Clarification & "can't confirm" fallback behavior

- **Type:** Agent/backend
- **What I added:** The agent no longer guesses when it lacks information, and this is enforced in code as well as the prompt.
  1. **Structured reply types:** `AgentReply` (and the `/chat` `ChatResponse`) now carry `reply_type`, one of `answer`, `clarifying_question`, or `cannot_confirm`, plus `suggested_replies` (up to 4 tap-to-send options, only for clarifying questions).
  2. **Lost-reference detection** (`agent.has_unresolved_reference`): before each run the backend checks whether the message says "it"/"this"/"that one" when **no product page is open, there's no earlier conversation, and no product or item type is named**. If so, it adds a "Clarification needed" instruction, and an **output validator rejects any confident `answer`** and makes the model retry with a clarifying question.
  3. **Using page context:** the same validator also **rejects a "which product?" question on a product page**, because the Problem 8 page context already says what "this" is.
  4. **No dead ends:** `search_products` now returns `we_carry` (the categories we do sell) when nothing matches, so the agent can offer real alternatives.
  5. **Prompt rules:** prompt §8 adds when to clarify (lost reference, ambiguous names, vague requests; one short question), when to say `cannot_confirm` (materials, fit, care, shipping, returns, discounts, restocks, hours), answering the confirmable part with tools, and never using "it should be available" wording.
  6. **Chat display:** the widget shows `suggested_replies` as tappable **quick-reply chips** under a clarifying question (tapping one sends it), and a small **"ℹ️ Not in our catalogue data. Ask the store to confirm."** note under `cannot_confirm` replies.
- **Why it helps a Campus Customs shopper or the business:** A wrong confident answer ("Yes, it comes in blue!" about the wrong product, or an invented fabric) is worse than a question, because it leads to wrong purchases, returns, and lost trust. Asking one quick question, with tap-to-answer options, resolves ambiguity in a single tap. Marking unconfirmed information makes the bot's limits visible and points shoppers to the store for those answers. This protects the business from accidental false claims about materials or policies.
- **Files changed:**
  - `backend/agent.py`: `REFERENCE_RE`, `has_unresolved_reference`, the "Clarification needed" instruction, and the `clarify_instead_of_guessing` validator.
  - `backend/models.py`: `ReplyType`, `AgentReply.reply_type` / `suggested_replies`, `ChatResponse.reply_type` / `suggested_replies`, `ProductSearchResult.we_carry`.
  - `backend/tools.py`: `unresolved_reference` on `ChatDeps`, `we_carry`.
  - `backend/main.py`: passes the new fields through.
  - `backend/prompts/prompt.md`: §7 output fields, §8 "When you're unsure".
  - `frontend/src/components/ChatWidget.tsx`, `frontend/src/lib/api.ts`, `frontend/src/index.css`: quick-reply chips and the "not in our catalogue data" note.
- **How a grader can see it:**
  1. On the Home page (no product open, fresh chat), ask **"Do you have it in another color?"**. You get "Happy to check! Which product do you mean?" with category quick-reply chips.
  2. After a recommendation list, the same question offers those products as chips; tap one to get its real colors.
  3. On the **Yale Grandpa Hoodie** page, ask **"Do you have this in blue?"**. It answers directly about that hoodie (navy blue / white) with no clarifying question.
  4. Ask **"What fabric is the Basic Hoodie Big Yale made of, and how long does shipping take?"**. It says it can't confirm either, gives the confirmed description, and shows the ℹ️ note.

---

## How the four fit with Problems 3–8

- **Search/filter → product cards:** filtered results use the existing `ProductGrid` / `ProductCard`.
- **Cards → product detail:** every card, from the grid, chat, recommendations, Home, or Bag page, still links to `/products/:productId` → `ProductPage`.
- **Product detail → chatbot:** `ProductPage` still registers its product (Problem 8), so after searching "hoodie" → opening a hoodie → "Do you have this in blue?", the agent knows which product is meant.
- **Recommendations → cards:** the agent uses the same `product_ids` → `ProductCard[]` contract in `/chat`; no second card system.
- **Logged-in history:** unchanged. Clarifications and recommendations are saved like any other message.

## Verification performed

| Area | Result |
|---|---|
| Filters (search, category, color, price, size) | ✅ Counts match SQL at every step (27/25/21/15; 25 navy hoodies; 23 hoodies in stock in XXL); typing then tapping a chip keeps both filters (a race bug was found and fixed); empty state, single-pill removal, and Clear all work; navbar search → `/products?q=saybrook` (3 results); mobile filter toggle with no sideways scroll |
| Bag | ✅ Size required; sold-out size disabled; stepper capped at stock (XL = 2); "Max in bag"; badge count; Bag page totals; quantity +/−, stepping to 0 removes; Remove; Empty bag; kept after reload; a tampered bag re-checked (price corrected, quantity cut to stock, sold-out line flagged and excluded) |
| Recommendations | ✅ "Yale hoodie for a student" → 4 in-stock Yale hoodies (no family items) as cards; card → product page; "gift for my dad under $60" → Yale Dad tee $32 + crewneck $58 (DB-verified); "pink hats" → nothing, honest note |
| Clarification / fallback | ✅ No context → clarifying question + category chips; after a list → those products as chips, tapping one sends it and gets real colors; product page → answers directly; fabric/shipping → `cannot_confirm` + ℹ️ note; "Yale baseball caps" → "we don't carry…" plus real baseball items |
| Regression (Problems 3–8) | ✅ Home, About, Products (102), product pages, Log in, Create account; auth suite 15/15; database tool suite 17/17; chat history / customer / page-context suite 16/16; logged-in chat saved with name + "this" price; no console errors |
