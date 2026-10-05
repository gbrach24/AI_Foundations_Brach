# AI Prompt Log

## Problem 1 — AI Prompt Log Setup

Prompt I gave the vibe coder:

> Let's work on problem 1. For this problem, create a file named `AI_prompts.md` at the root of the project. This file will be my running log of the prompts I give you while completing this assignment. Set it up so that there is one clearly labeled section for each homework problem. For Problem 1, create a section with the problem number and title, and record the prompt I am giving you now in my own words as closely as possible. Use this structure: `# AI Prompt Log`, `## Problem 1 — AI Prompt Log Setup`, "Prompt I gave the vibe coder", "Follow-up prompt", and "What was lacking after the first prompt" (leave the last two blank if no follow-up is needed). Do not work on any other homework problems yet. Do not create unnecessary application code. Just create `AI_prompts.md` and make sure it is ready to be updated throughout the rest of the assignment. Going forward, whenever we work on a new problem, update this same file with a new section containing: (1) the problem number and title, (2) at least one prompt I gave you, written in my own words as much as possible, and (3) if I needed a follow-up prompt, record that prompt and add one sentence explaining what was missing or inadequate after the first prompt. Do not overwrite previous sections when updating the file.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 2 — Database Schema Inspection

Prompt I gave the vibe coder:

> OK, now onto Problem 2. Locate the data-2 file I have just downloaded. That is the file with data that I have been provided to do this assignment. Knowing that, work only on Problem 2. First, inspect the actual SQLite database at `data/campus_customs.db`. Do not assume the schema or invent fields. Use the database itself to determine the tables, columns, and relevant field information. At minimum, inspect and understand the `catalogue`, `inventory`, and `users` tables. Also check whether there are any other tables in the database; if there are, document those too because they may be relevant to the website or chatbot. Create `output/harness.md` if it does not already exist. In that file, document the database schema you actually found. For each table, include the table name, every field/column, a short explanation of what each field represents, and one short sentence explaining why each field matters for the Campus Customs shop or chatbot (e.g. how catalogue fields help display products and answer product questions, how inventory fields allow size/stock answers, and how user fields support accounts and authentication), based on the actual fields rather than assumptions. Also include any useful information about relationships between the tables. Keep the documentation concise and readable, and structure it as a living harness file we can add more sections to in later problems, without deleting or overwriting useful existing content. Do not modify the database itself. After completing the task, verify that `output/harness.md` exists and accurately reflects the actual database schema. Also update `AI_prompts.md` with a new Problem 2 section (my prompt, plus a follow-up and one sentence on what was missing only if a follow-up was actually needed). Do not start Problem 3 yet.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 3 — React Storefront, Products API, and Chat Stub

Prompt I gave the vibe coder:

> Now work only on Problem 3. Before making changes, inspect the existing project structure, `data/campus_customs.db`, and `output/harness.md` from Problem 2 so that you build on what is already there rather than guessing or recreating anything.
> 1. Set up the frontend: scaffold a React + Vite + TypeScript frontend for the Campus Customs customer website with a clean, polished ecommerce design appropriate for Yale/Campus Customs. Create a top navigation bar with links to Home, Products, About Us, Log in, and Create account, and make sure the navigation actually routes to the appropriate pages even though login/account functionality will come later.
> 2. Research the public Yale Bulldog Blue website at `yalebulldogblue.com` to understand its branding, tone, product presentation, and what it communicates about Campus Customs. Use it as inspiration for the Home and About Us pages, but do not copy text; write original wording in our own voice. The Home page should feel like a real customer-facing storefront, and the About Us page should explain the Campus Customs/Yale merchandise concept in original wording.
> 3. Build the Products page from the real `data/campus_customs.db` database rather than a hardcoded list, showing at minimum the product image, name, price, and short description from the `catalogue` table. Use the image file paths stored in the database; don't copy images into the frontend or create placeholder images. Create a product card/grid that makes browsing easy.
> 4. Clicking a product card should open a dedicated single-product page with a large image on one side and full product info on the other (name, full description, price, and available sizes and stock when that information exists), using real catalogue and inventory data. Make sure it works for products with different types of inventory, including products without traditional clothing sizes.
> 5. Add a floating chat interface in the bottom-right corner that the user can open, see a welcome message, type, and submit. Don't build the AI agent yet; it should be a frontend stub structured to call the FastAPI/PydanticAI backend later, and a temporary placeholder response is fine.
> 6. Create a minimal Python FastAPI backend at `backend/main.py` that provides what the frontend needs to retrieve products, their associated information, and product images from `data/campus_customs.db`, using the schema documented in `output/harness.md` and querying the real database. Don't build the PydanticAI agent yet; that comes in Problem 5.
> 7. Keep the architecture clean: separate frontend and backend responsibilities, don't put the database in the React code, use reusable React components (navigation, product cards, product grids, chat widget), make sure the frontend can talk to the FastAPI backend, and handle basic loading and error states so the site doesn't break if the API is unavailable.
> 8. Test everything: the frontend starts, navigation works, Home and About Us render, products load from the actual database, images load from the database paths, clicking a product opens its page, product info displays correctly, inventory/size info appears when available, the chat widget opens and accepts messages, and the frontend communicates with the backend. Fix any errors rather than leaving the app broken. Do not start Problem 4.
> Finally, update `AI_prompts.md` with a Problem 3 section (plus the most important follow-up prompt and one sentence on what was lacking, if one was needed) without overwriting Problems 1 or 2, and update `output/harness.md` with any new API/database information useful for understanding how the frontend uses the database, keeping the existing database documentation intact.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 4 — Account Creation & Login

Prompt I gave the vibe coder:

> Onto Problem 4: here we will create Account / Login for the existing Campus Customs React + Vite + TypeScript application. First, inspect the existing codebase and understand how Problem 3 was implemented. Do not rewrite or remove existing functionality; build the authentication flow into the existing application structure and reuse the existing styling/navigation/components where appropriate.
> 1. Create Account page: build a normal form with first name, last name, email, password, and confirm password. Require all fields, validate that the email is in a reasonable format, require password and confirm password to match, show clear validation/error messages, prevent submission when validation fails, and on success create a new user in the existing `users` table without storing the plaintext password.
> 2. Login page: build a normal form with email and password that checks the credentials against users in the database, displays a clear error if they are invalid, authenticates the user when they are correct, and handles the existing seeded test user (`test@campuscustoms.yale.edu` / `password`). Verify that this existing account can log in.
> 3. Secure password storage: never store plaintext passwords; use an appropriate modern password-hashing approach supported by the project/backend, store only the hash (plus any salt/parameters), and verify passwords by comparing against the stored hash. Don't expose hashes or passwords to the frontend, print them to logs, include them in API responses unnecessarily, or store them in localStorage or other client-side storage. Preserve existing records/schema unless a change is genuinely necessary.
> 4. New-account test: create a brand-new test account through the actual Create Account UI and verify that it is created, appears in the `users` table, has a hashed password, can log in, and that an incorrect password fails. Don't use a fake/mock success response; test the real database-backed flow.
> 5. Existing seeded user test: confirm the seeded account can log in on the Login page. If its password is already stored with the project's secure hashing, use it as-is; if there is a legitimate compatibility issue, diagnose and fix the authentication implementation without compromising security.
> 6. Navigation: "Log in" and "Create account" should go to their pages, there should be an indication that the user is logged in after authenticating, and Home, Products, and About Us must not break.
> 7. Update `output/harness.md` with a section documenting what is stored per user, how users are created, how login works, how passwords are protected, the hashing approach/library, what is stored instead of the plaintext password, how passwords are verified, and the tests performed for both users, without putting any actual passwords or credentials in it.
> Constraints: work with the existing Problem 3 code, follow the existing architecture and database setup, use TypeScript appropriately, keep it reasonably simple, don't hard-code successful login or the test user's password, don't store plaintext passwords anywhere, don't commit secrets, and make sure the app still runs with the existing dev command. Then run the full final verification (start the app, create an account, check the DB and hash, log in, log out, log in as the seeded user, check that a wrong password is rejected, check navigation, update the harness, fix any errors) and give me a concise summary of files changed, how authentication works, the hashing method, database changes, and tests performed.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 5 — Shop Chatbot (PydanticAI + FastAPI)

Prompt I gave the vibe coder:

> Problem 5: Shop Chatbot for the existing Campus Customs application. The project already contains the work from Problems 3 and 4. First inspect the existing codebase, database setup, authentication implementation, frontend structure, and package configuration. Do not replace or break the existing functionality; build the chatbot backend into the existing project. Goal: build a Campus Customs shop chatbot powered by a PydanticAI agent, expose it through a FastAPI backend, and connect it to the chat widget in the existing React + Vite + TypeScript frontend (React chat widget → FastAPI `/chat` → PydanticAI agent → AI model → response → frontend).
> 1. Backend structure: `backend/main.py` (FastAPI entry point exposing a chat endpoint such as `POST /chat` with Pydantic request/response models, plus only the routes genuinely needed for the existing products/auth features), `backend/agent.py`, `backend/tools.py`, `backend/models.py`, and `backend/prompts/prompt.md`.
> 2. `agent.py`: load the system prompt from `prompts/prompt.md`, configure the model, create the PydanticAI agent and its dependencies, and run it when the endpoint receives a message. Use the project's existing environment-variable approach for the API key, never hard-code secrets, and reuse the earlier homework's model/provider pattern instead of introducing a conflicting configuration.
> 3. `tools.py`: tools scoped to the assignment that let the agent access real Campus Customs product information from the existing catalogue/database (no duplicate hard-coded catalogue), structured so they can be expanded later.
> 4. `models.py`: structured types for the chat request, chat response (`reply` plus optional `products`), and product cards, without exposing sensitive information like password hashes.
> 5. `prompts/prompt.md`: the initial system prompt with the Campus Customs voice (friendly, helpful, a shop associate, concise, helps discover products, enthusiastic but not salesy, never invents product details, prices, availability, or policies) and safety basics (stay on shopping; no sensitive inferences from photos or other info; no judgments about body, appearance, race, religion, health, or other sensitive traits; don't identify people; don't request unnecessary personal info; don't expose passwords, hashes, API keys, or secrets; don't present unavailable info as fact; politely redirect off-topic requests; keep it appropriate for a broad audience). Keep it in this file, readable, because it will be expanded later.
> 6. Connect the Problem 3 chat widget to `POST /chat`, with no hard-coded frontend responses left, proper loading and error states, and CORS for local development using the specific Vite origin rather than `*`.
> 7. Use environment variables for the API key: never hard-code it, put it in frontend code, return it in responses, or commit `.env`; an `.env.example` with placeholders only is fine.
> 8. The backend must start with `cd backend` then `uvicorn main:app --reload --port 8000`, with `app = FastAPI(...)` in `main.py`.
> 9. Configure CORS for the actual Vite dev origin (e.g. `http://localhost:5173`).
> 10. Update `output/harness.md` with a Problem 5 section covering Frontend → FastAPI (component, endpoint, request, response, display), FastAPI → PydanticAI (how `main.py` invokes the agent, where it's defined, how the prompt is loaded, model/provider, how the API key is supplied, available tools), the structured types, and the run command, with no secrets.
> 11. Actually test everything: backend startup and `/chat` with a real AI response ("What products do you sell?"); the real widget with multiple messages ("What products do you sell?", "Can you help me find something from Yale?"); graceful errors when the backend is unavailable; product grounding with a real catalogue product; and regressions for Home, Products, About Us, Create Account, Login, and the database.
> 12. Final cleanup: remove sensitive debug output, confirm no keys or passwords are in source code or the frontend, confirm the required uvicorn command works and the frontend talks to the backend, confirm the harness is updated, and keep it simple. Then give me a concise summary of files changed, frontend-to-FastAPI communication, agent loading/configuration, tools, structured models, API key protection, tests and results, and any issues or assumptions.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 6 — Database-backed Product Tools

Prompt I gave the vibe coder:

> Now let's do Problem 6: Database-backed Product Tools for the existing Campus Customs application. The application already contains the work from Problems 3–5, including the React frontend, FastAPI backend, PydanticAI agent, `backend/tools.py`, `backend/models.py`, and `backend/prompts/prompt.md`. First inspect the existing codebase and database structure; do not rewrite or break the existing application, and extend the Problem 5 architecture. Goal: give the PydanticAI shop agent tools that retrieve real product information from `campus_customs.db` (product description, product price, product inventory/stock, and inventory by size when the customer asks about a particular size). If a requested size is out of stock, the agent must clearly say so, and it must never invent prices, inventory quantities, or other database-backed information.
> 1. Inspect the database, schema, product tables, product IDs/names, inventory/size fields, and existing database access code first; reuse them, don't create a second product database, and don't hard-code the catalogue, prices, or inventory in `tools.py`.
> 2. In `backend/tools.py`, add tools for product description (by product name or ID, returning the stored description), price (always called for price questions, e.g. "How much is the Yale hoodie?"), and inventory/stock with size-specific lookups (e.g. "Do you have the Yale hoodie in a medium?", "How many Large Yale hoodies do you have?"), distinguishing in stock, out of stock, and unknown product or size, with quantities only from the database.
> 3. Use the database for every factual product answer: price questions → price tool, stock questions → inventory tool, description questions → description tool; never answer from memory.
> 4. Update `backend/models.py` with structured Pydantic return types (identifier/name, description, price, quantity, size, in-stock flag, clear not-found state) without exposing unnecessary fields or any secrets.
> 5. Register the tools with the agent in `backend/agent.py` so they're actually callable, preserving Problem 5 functionality.
> 6. Expand (don't replace) `backend/prompts/prompt.md` with a database-grounding section: use the database for product info, current prices, inventory, and size inventory; never guess prices or quantities; never claim stock without checking; clearly state zero inventory as out of stock; say when a product can't be found; be transparent when info isn't in the database; explicit tool routing (price → price tool, stock → inventory tool, size → size inventory tool with the size, description → description tool); and never pretend to have checked the database without calling the tool.
> 7. Handle out-of-stock correctly (e.g. "That hoodie is currently out of stock in Medium.", never "I think we have some"), optionally mentioning other in-stock sizes from the database.
> 8. Add a Problem 6 section to `output/harness.md` listing each tool individually (name, purpose, inputs, database information retrieved, return value, when the agent calls it), using the real tool names and fields, and explaining that prices and inventory are retrieved dynamically from `campus_customs.db`, not hard-coded. No secrets.
> 9. Test the tools against the real database: description, price, general stock, size-specific stock, an out-of-stock size with zero inventory, and a nonexistent product.
> 10. Test the full frontend flow (React widget → FastAPI → PydanticAI → database tool → `campus_customs.db` → response → widget) with no hard-coded responses.
> 11. Verify Problems 3–5 still work (Home, Products, About Us, Create Account, Login, authentication, chat widget, FastAPI backend, PydanticAI agent).
> 12. Complete the final verification checklist, then give me a concise summary of files modified, database tables/fields used, each tool added, models added/updated, prompt changes, tests performed and whether each passed, and any issues or assumptions.

Follow-up prompt:

> If a product name matches several products (like "the Yale hoodie"), don't pick one; return the options and have the agent ask which one the shopper means.

What was lacking after the first prompt:

The first prompt didn't say what to do when a product name matches several products, so I had to make sure the agent asks which one instead of guessing.

## Problem 7 — Catalogue Search & Dynamic Product Cards

Prompt I gave the vibe coder:

> Let's do Problem 7 for the existing Campus Customs application. Don't rebuild this feature from scratch if it already exists: first inspect the codebase and determine whether the dynamic catalogue-search/product-card functionality is already present; if it is, test it thoroughly, fix anything missing or incorrect, and only add code where necessary. The goal is the complete flow: customer chat → PydanticAI agent → catalogue search → structured product matches → FastAPI response → React frontend → dynamic product cards → existing product detail page.
> 1. Catalogue search: when a customer asks about a type/category (e.g. "What hoodies do you have?", "Show me your shirts.", "What sweatshirts do you have?", "Do you have any hats?"), the agent should search the actual catalogue, never hard-coding lists, inventing products, returning random products, or returning products that don't match the request.
> 2. Structured API contract: the agent returns structured product matches, and `/chat` returns `{reply, products: [{product_id, name, image, price, short_description}]}` (using the project's real field names and models), so the frontend never parses products out of chatbot text.
> 3. Pydantic models: make sure `backend/models.py` has models for product matches (ID, name, image, price, short info) and chat responses with optional matches, reusing existing models rather than duplicating them.
> 4. Frontend product cards: the chat widget renders cards (image, name, price, short description) dynamically from the API response, not hard-coded, reusing the Problem 3 product-card component if there is one.
> 5. Product detail behavior: chat-generated cards must behave exactly like the Problem 3 cards: navigate to the existing product detail view with the large image, full information, the correct product, and preserved navigation/back behavior, using the existing product ID and routing, with no second detail page.
> 6. Prompt: make sure `backend/prompts/prompt.md` says to search the catalogue for find/show requests, return only products actually found, never invent info, return structured matches, say so when there are no matches, and note that matches are rendered as cards, without deleting earlier instructions.
> 7. FastAPI: verify `/chat` passes the structured `products` array through without converting it to text.
> 8. Update `output/harness.md` with the complete data flow (customer → agent → catalogue → API → frontend → product detail), including the actual API response structure and component/tool names.
> 9. End-to-end tests: A product search ("What hoodies do you have?"), B card contents match the catalogue, C clicking a chat card opens the correct existing detail page, D regular Products-page cards still open the same detail page, E a nonexistent category returns no fabricated results and no empty card section, F regression for Home, Products, About Us, Login, Create Account, chatbot, FastAPI, and the price/stock tools.
> 10. Don't over-engineer: no second database, second detail system, duplicated Products page, hard-coded results, invented products, or parsing of chatbot prose, and don't remove earlier functionality. Then report what already existed, what changed, the search tool, the API contract, how cards render, how they reuse the detail page, tests and results, and remaining issues.

Follow-up prompt:

> Test precision, not just results: "shirts" must not return sweatshirts, and "hats" must return nothing if we don't sell hats. Show me the match counts by category for each example query.

What was lacking after the first prompt:

The first prompt didn't define what counts as a correct match, so search precision (e.g. "shirts" matching "sweatshirts") had to be specified and checked by category.

## Problem 8 — Persistent, Context-Aware Chat

Prompt I gave the vibe coder:

> Let's do Problem 8 for the Campus Customs website. First inspect the existing codebase and the implementations from Problems 3–7, extend the existing architecture rather than rebuilding, and preserve all existing authentication, chat, product search, product cards, product detail pages, database functionality, and styling. Goal: make the shop chatbot context-aware and persistent for logged-in users: (1) save logged-in shoppers' chat history in the database, (2) load and display it when they return, (3) let the agent know who is chatting, including name and email, (4) give the agent page/product context so that on a product page "Do you have this in pink?" refers to the product being viewed, (5) keep guest chat working without persistence, and (6) document everything in `output/harness.md`.
> 1. Inspect the database schema, Problem 4 auth and the `users` table, the FastAPI backend (`main.py`, `agent.py`, `tools.py`, `models.py`, `prompts/prompt.md`), the chat API, the React chat component, the product detail page, frontend auth/session handling, and product-card routing; don't duplicate existing tables, routes, models, or components.
> 2. Add a chat history table if one doesn't already exist (e.g. `chat_messages` with `id`, `user_id`, `role`, `content`, `created_at`) supporting per-user messages, user vs assistant roles, order, and retrieval, with no passwords or unnecessary sensitive data, working with the existing `campus_customs.db`.
> 3. For logged-in shoppers: identify the user, save their message, send it to the agent with customer/page context, save the reply, and return it, so the conversation survives refreshes and future visits. Guests chat normally with nothing saved as a user's history.
> 4. Reload a logged-in user's history in order when they open the chat (e.g. `GET /chat/history`), only ever returning the authenticated user's own history, and make sure logging out keeps their history from being shown to the next user on the same browser.
> 5. Give the agent customer context through a clean dependency/context pattern (user_id, first_name, last_name, email, logged-in flag from the real `users` fields) instead of stuffing it into the prompt text; add a structured type in `models.py`, pass it in `agent.py`, and explain its use in `prompt.md`, never sending passwords, hashes, tokens, or secrets.
> 6. Pass structured page context from the frontend through FastAPI to the agent (page type, product ID and name on product pages, and other useful info) so "this" means the current product, without hard-coding any product.
> 7. Make the existing product detail page provide its product to the chat component, for products reached any way (Products page, dynamic cards), without breaking the detail page or card navigation.
> 8. Keep the database/product tools authoritative: "Do you have this in pink?" should use the Problem 6 tools, and if a color isn't in the data, say the data doesn't confirm it rather than inventing it.
> 9. Preserve all existing chat functionality (guest and logged-in chats, product search, cards, detail navigation, price/stock/size/description questions, tone and safety).
> 10. Frontend: guests can chat in-page without persistence; logged-in shoppers automatically see previous history, continue it, have every message persisted, and see it again when they return, seamlessly.
> 11. Security: use the existing session mechanism, never trust a browser-supplied `user_id`, never let user A see user B's history, no plaintext passwords or hashes in agent dependencies, no unnecessary secrets in the frontend, no guest writes to a user's history, and clear the chat state from the UI on logout.
> 12. Update `prompt.md` to explain logged-in customer context (name and email, used only when relevant), structured page context and "this"/"this one"/"the item I'm looking at" references on product pages, that product facts still come from the tools, and never inventing customer or product info, keeping the existing voice and safety rules.
> 13. Add a Problem 8 section to `output/harness.md` covering chat history storage (table, fields, user association, how user/assistant messages are stored and retrieved, guest vs logged-in), customer context (fields, how they reach the agent, the dependency pattern, what's excluded), page context (what's sent, how the product is identified, how "this" is resolved, React → FastAPI → agent), and the end-to-end logged-in and guest flows.
> 14. Test everything: guest chat with no history created; a test account with several stored messages; history reloading after refresh and when returning later; user isolation between two accounts; customer context (name/email); product page context with "Do you have this in pink?" using the tools; and Problems 3–7 regression, fixing any errors found. Then summarize files changed, database changes, how persistence works, how customer and page context reach the agent, tests and results, and confirm the harness was updated.

Follow-up prompt:

> When a guest logs in, start a fresh chat showing their saved history (don't merge in the guest chat). Make sure logins survive a backend restart, so "returning later" actually works.

What was lacking after the first prompt:

The first prompt didn't cover what happens to a guest's chat at login or whether logins survive a server restart, both of which matter for "returning later".

## Problem 9 — Usability Improvements

Prompt I gave the vibe coder:

> Let's do Problem 9 for the Campus Customs website. The core shop from Problems 3–8 is working; don't rebuild or replace existing functionality. First inspect the existing codebase and running application, then extend what's there. Implement exactly 2 front-end usability improvements and 2 agent/backend usability improvements in the actual running app, and create/update `output/usability.md` documenting each one and why it helps.
> 1. Inspect the frontend (Products page, product cards, detail page, navigation, auth, chatbot UI), the FastAPI backend and PydanticAI agent (`agent.py`, `tools.py`, `models.py`, `prompts/prompt.md`), `campus_customs.db`, the catalogue functionality, the Problem 8 chat history and customer/page context, and `output/harness.md`; run the app and preserve everything from Problems 3–8.
> 2. Front-end #1: product search/filtering on the Products page (search by name/keyword, a useful category/type filter, clear no-match results, easy clearing/reset) using the real catalogue and existing product cards, with clicks still opening the existing detail page, and visually obvious. Front-end #2: another genuinely useful shopping/navigation improvement, e.g. a persistent shopping cart (add from the detail page, a nav count, view items, remove/adjust quantities, persist for the browser session), without duplicating an existing cart and without real payments.
> 3. Agent #1: a structured product recommendation tool (e.g. "I'm looking for a Yale hoodie for a student.", "What would you recommend as a gift?") using real catalogue data, returning structured product info, integrating with the existing dynamic product cards, never inventing products, prices, or inventory, and reusing/extending the existing search tool where possible; update `models.py`, `tools.py`, `agent.py`, and `prompt.md`, and have recommendations appear as the existing product cards.
> 4. Agent #2: better clarification and fallback behavior: don't guess without enough information (e.g. "Do you have it in another color?" with no product context should get a clarifying question), say clearly when information isn't in the database, ask concise clarifying questions, use Problem 8 page context when available, use the database tools for facts, never fabricate catalogue facts, handle no-results gracefully, and distinguish confirmed from unverifiable info, enforced by the actual agent via `prompt.md` and any needed models/tools.
> 5. Integrate with Problems 3–8: search results use the existing product cards, cards open the existing detail route, page context still works (search "hoodie" → open a hoodie → "Do you have this in blue?"), and recommendations use the existing structured product-card contract.
> 6. Make the front-end improvements feel intentional and polished (hierarchy, controls, empty/loading/error states, responsive/mobile, consistent typography, spacing, hover states, Campus Customs design), with no purely cosmetic changes counted as improvements.
> 7. Create `output/usability.md` documenting all four improvements, each with type, what I added, why it helps a shopper or the business, files changed, how it works, and how a grader can see/use it.
> 8. Test the running app: Products search, filter, results updating, no-results, clear/reset, detail page, cart UX, navigation, and the existing chatbot; the recommendation request with real products and clickable cards; the ambiguous question with and without product context; and a question about unavailable product information.
> 9. Regression-test Problems 3–8 (Home, About Us, Products, detail pages, account creation, login/logout, guest and logged-in chat, persistent history, customer and page context, database-backed product, inventory, and size info, dynamic cards and navigation) and fix any regressions.
> 10. Final verification: confirm exactly 2 front-end and 2 agent/backend improvements, all visible in the running app, `output/usability.md` complete, and Problems 3–8 still working; then summarize the four improvements, files changed, tests performed, and issues fixed.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 10 — Creative Visual Design & UX

Prompt I gave the vibe coder:

> Onto Problem 10 for the Campus Customs website. The goal is to transform the existing functional site into a distinctive, polished, creative Campus Customs storefront that feels like a real brand rather than a default React/Vite website. First inspect the existing application and Problems 3–9; don't rebuild from scratch or remove functionality, and keep authentication, products, product pages, cart, chatbot, database functionality, chat history, product search, and agent functionality working. I want the site to feel memorable, premium, collegiate, and genuinely shoppable.
> 1. Establish a cohesive visual identity (distinctive typography and font pairing, a cohesive palette, strong hierarchy, consistent controls, spacing, card treatments, subtle borders/shadows, whitespace) inspired by Yale/college culture without copying Yale's site, with fonts that load reliably.
> 2. Redesign the Home page as a real storefront: a striking hero (headline, copy, Shop Now CTA, product imagery, subtle motion), curated featured products from real data, a brand/story section, and an imaginative merchandising section using real products.
> 3. Redesign product cards (image, name, price, concise info, clear CTA, polished hover with zoom/lift/shadow/feedback) without excessive animation.
> 4. Make product detail pages premium: large imagery, clear name, prominent price, description, availability, size/color selectors, add-to-cart, and related products, answering what it is, the cost, the options, whether I can buy it, and what else I might like.
> 5. Make the chatbot part of the brand: branded launcher and icon, distinctive header, branded bubbles, polished input, typing animation, suggested prompts that actually trigger the chat ("Help me find a hoodie", "What would you recommend as a gift?", "Show me Yale favorites", "What do you have in stock?"), smooth open/close, and product cards that match the storefront.
> 6. Add tasteful, fast, subtle motion and micro-interactions (scroll reveals, card hovers, button states, nav transitions, chat open/close, cart feedback, image transitions) and respect `prefers-reduced-motion`.
> 7. Improve the navbar (Home, Products, About Us, Log in, Create account), make the current page and logged-in state obvious, integrate the cart indicator, keep it responsive, and consider a scrolled treatment.
> 8. Make About Us a real brand story with strong typography, visual sections, imagery, short readable blocks, and clear personality.
> 9. Keep the design consistent across Home, Products, Product detail, About, Login, Create account, Cart, and Chat with reusable styles, paying attention to mobile, buttons, type, spacing, images, and empty/loading/error states.
> 10. Add at least one genuinely imaginative Campus Customs design idea (e.g. a Campus Edit, campus-inspired browsing, an editorial storefront, or "Shop the Campus" moments) using real catalogue products.
> 11. Preserve everything from Problems 3–9 (search/filtering, cards, detail pages, cart, accounts, login/logout, guest and logged-in chat, history, customer/page context, database and inventory tools, dynamic cards, recommendations, clarification).
> 12. Ensure accessibility and usability: contrast, labeled buttons, keyboard navigation, readable inputs, visible focus states, alt text, responsive layouts, and non-intrusive animation.
> 13. Create a short, concrete `output/design.md` with sections for Visual Identity, Homepage, Product Presentation, Chat Experience, Motion & Interaction, and Creative Concept (what changed and why it helps).
> 14. Verify in the running app (Home, Products, Product detail, Chat, Account pages, Cart, Mobile) and fix any visual or functional regressions.
> 15. Confirm the redesign, design system, creative concept, preserved functionality, and design.md, and summarize the major design changes, creative concept, files changed, tests performed, and issues fixed.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 11 — Live App Check (Evidence Page)

Prompt I gave the vibe coder:

> We're on Problem 11 for the Campus Customs website: test the actual running site and create a simple, easy-to-grade HTML evidence page showing that key functionality works, with no fake, mock, or placeholder screenshots; every screenshot must come from the real running app. Inspect the work from Problems 3–10 first and preserve all functionality.
> 1. Run the real frontend and backend (React/Vite, FastAPI, the PydanticAI agent, `campus_customs.db`, auth where needed) and verify they work before taking screenshots.
> 2. Create `output/app_check_images/` for the screenshots, with descriptive names.
> 3. Test #1: ask the chatbot an inventory/price question about a real product (ideally both stock and price) and screenshot the chatbot, the product, the question, and the real database values (`inventory.png`).
> 4. Test #2: ask a category question like "What hoodies do you have?" and screenshot the question, the response, and multiple real dynamic product cards with names, images, and prices (`dynamic_products.png`).
> 5. Test #3: screenshot one of the Problem 9 usability improvements working, e.g. Products search/filtering or the cart (`usability.png`).
> 6. Create a standalone `output/app_check.html` that opens by double-clicking, references the screenshots with relative paths (no absolute paths), and still works if the `output` folder is moved.
> 7. Make it extremely easy to grade: a clear heading, a large screenshot, and a short one- or two-sentence caption for each section.
> 8. Make the screenshots clear: relevant UI visible, readable text, no unrelated windows, and enough context to prove each feature.
> 9. Verify locally: all three images and the HTML exist, the page opens as a local file, all images load through relative paths, headings and captions are readable, and there are no broken images.
> 10. Use real evidence only (no fabricated screenshots, mock data, hard-coded responses, or manually created cards); if something fails, fix the app first.
> 11. Confirm the final file structure and summarize the product and database values shown, the category tested, the Problem 9 feature shown, the files created, and that `app_check.html` was opened and all screenshots load.

Follow-up prompt:

> Screenshots must be high-resolution PNGs where the chat text is easily readable. If a screenshot can't show the feature clearly (e.g. too few product cards visible), fix the UI rather than cropping around it.

What was lacking after the first prompt:

The first prompt didn't set a screenshot quality bar or say what to do when the UI couldn't show a feature clearly, which led to low-resolution and cramped first attempts.

## Problem 12 — Audit Trail, Safety Rules & Final Harness

Prompt I gave the vibe coder:

> Now let's do Problem 12 for the existing Campus Customs application. First inspect the entire codebase and Problems 3–11; don't rebuild or replace working functionality; extend the existing PydanticAI/FastAPI/frontend architecture. Three goals: (1) a persistent, append-only `output/audit_trail.json` recording agent-loop activity, (2) clear safety rules in `backend/prompts/prompt.md`, and (3) finish `output/harness.md` as documentation of the whole system.
> 1. Inspect `main.py`, `agent.py`, `tools.py`, `models.py`, `prompt.md`, the harness, the product tools, chat/history, customer/page context, the agent loop, error handling, and output files; reuse the existing agent loop and tool system rather than creating a second architecture.
> 2–6. Create `output/audit_trail.json` that is append-only across runs (load, preserve, append, write back; never reset to `[]`). Each entry has at least a timestamp, tool name, short/safe args, short/safe result, and stop reason (plus optional run ID, iteration, status, model, and safe user ID). Capture run start, tool calls and results, and the final stop reason (e.g. final_response, max_iterations, tool_error, validation_error). Summarize and truncate with a helper, never logging passwords, hashes, API keys, tokens, secrets, unnecessary personal info, full chat history, or large payloads. Make it robust: missing, empty, or malformed files, the output directory, concurrent runs, and valid JSON on disk, and never let logging break the chatbot or fail silently.
> 7. Add an audit Pydantic model to `backend/models.py` and explain its fields in the harness.
> 8. Expand (don't replace) `prompt.md` with a safety section: product information safety, customer privacy, tool safety, ambiguity (using page context), scope, and safe, respectful behavior.
> 9–14. Finish `output/harness.md` with a system overview (React → FastAPI → PydanticAI → tools/database → response → React, plus auth, history, product context, and cards), `## Models`, `## Tools and abilities`, `## Safety rules`, and `## Specs` (agent loop limits, adding one if missing; result caps; model/provider and API-key handling; frontend, backend, and database; and the audit trail), plus how to run the whole system using the real commands and the required environment variables, without exposing values.
> 15–17. Test the audit trail with several real runs ("What hoodies do you have?", "How much is this hoodie?", an inventory question), confirm the entries accumulate, that a meaningful stop reason is recorded, and that no sensitive information is logged.
> 18–20. Regression-test Problems 3–10, confirm the final file structure, and give a concise implementation summary.

Follow-up prompt:

What was lacking after the first prompt:

## Problem 13 — Prepare the Public GitHub Repository

Prompt I gave the vibe coder:

> Now onto the final Problem 13: prepare the completed Homework 4 project so it can be submitted as a public GitHub repository in a folder named `hw4/`. The most important requirement is that the public repository must not contain any private or local data.
> 1. Inspect the entire project from Problems 3–12 and don't remove or break anything; this is packaging, not rebuilding.
> 2–3. Put the project in `hw4/` with `AI_prompts.md`, `requirements.txt`, `.env.example`, `.gitignore`, `README.md`, `frontend/`, `backend/` (`main.py`, `agent.py`, `models.py`, `tools.py`, `prompts/prompt.md`), and `output/`; the local data pack (`data/campus_customs.db`, `data/products/`) must stay out of Git.
> 4–6. Create a strong `.gitignore` covering secrets, Python, Node, local database and data, product images, and OS/editor files, without ignoring required files. Make sure the real `.env` is never included (use a placeholders-only `.env.example` with the project's actual variable names), and that the real database and product images are never committed (keep them locally and explain the data pack in the README).
> 7–8. Check `git status` / `git ls-files`, untrack anything sensitive with `git rm --cached` without deleting local files, and search everything for hard-coded secrets (Python, TypeScript, Markdown, JSON, screenshots, README, `.env.example`).
> 9–11. Keep `output/audit_trail.json` if it's safe (sanitizing it otherwise, without removing the audit functionality); keep all `output/` evidence (harness, design, usability, app_check.html and images, audit trail); and make sure `app_check.html` uses only relative paths and its screenshots load.
> 12–18. Write `README.md` for someone who just cloned the repo: a project overview; the local data pack and where to put it; environment setup (venv, `pip install -r requirements.txt`, copy `.env.example` to `.env`); the backend command `cd backend` and `uvicorn main:app --reload --port 8000`; the real frontend commands from `package.json`, plus the port and how it connects to FastAPI; and a high-level agent architecture (customer/page context, product search, tools, chat history, audit trail).
> 19–22. Actually test the README commands, verify the final structure, don't create a ZIP, and run a final GitHub-readiness check that source, docs, output, `.env.example`, and `.gitignore` are safe to commit and `.env`, the database, product images, `data/`, keys, passwords, tokens, virtualenvs, and `node_modules` are not.
> 23–24. Don't create or push a GitHub repository without permission; leave `hw4/` ready to commit. Then give a final report (structure, ignore confirmations, placeholders-only `.env.example`, README coverage, the working backend command, the agent files, the output evidence, no ZIP, and the remaining steps to publish).

Follow-up prompt:

What was lacking after the first prompt:

