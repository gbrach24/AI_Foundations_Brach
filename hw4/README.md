# Campus Customs — Homework 4

A full-stack storefront for **Campus Customs**, a Yale apparel shop, with an AI shop assistant.

- **React + Vite + TypeScript frontend**: Home, Products (search + filters), product pages, About, Log in / Create account, and a Bag, styled as a branded storefront.
- **FastAPI backend**: product catalogue API, authentication (PBKDF2-hashed passwords, signed HttpOnly session cookie), and the chat endpoint.
- **PydanticAI shop agent**: answers from the real catalogue using database tools (search, recommendations, description, price, inventory, size inventory) and never invents prices or stock.
- **Chat features**:
  - dynamic product cards in chat;
  - **persistent chat history** for logged-in shoppers;
  - customer context (name/email) and page context ("Do you have **this** in pink?" on a product page);
  - clarifying questions when a request is ambiguous.
- **Audit trail**: every agent run is appended to `output/audit_trail.json` (tool calls, short args/results, stop reason).

Deeper technical documentation (models, tools, safety rules, limits) is in [`output/harness.md`](output/harness.md).

---

## Architecture

```
React frontend (frontend/, :5173)
   │  /api, /media, /chat  (Vite dev proxy)
   ▼
FastAPI (backend/main.py, :8000) ── auth, products, chat history
   │  POST /chat  (+ customer context from the session, page context from the UI)
   ▼
PydanticAI agent (backend/agent.py + backend/prompts/prompt.md)
   │  tools
   ▼
backend/tools.py ──► backend/database.py ──► data/campus_customs.db (catalogue, inventory, users, chat_messages)
   │
   ▼
Structured reply {reply, product cards} ──► React chat widget (cards link to product pages)
```

The agent is four files: `backend/prompts/prompt.md` (system prompt and safety rules), `backend/agent.py` (model, agent, validators, run loop and audit), `backend/tools.py` (database tools), and `backend/models.py` (Pydantic models). `backend/main.py` is the FastAPI entry point.

## Repository layout

```
hw4/
├── README.md
├── AI_prompts.md          # prompts used to build each problem
├── requirements.txt       # Python dependencies (backend)
├── .env.example           # environment variable template (placeholders only)
├── .gitignore
├── backend/
│   ├── main.py            # FastAPI app
│   ├── agent.py           # PydanticAI agent
│   ├── tools.py           # agent tools (database-backed)
│   ├── models.py          # Pydantic models
│   ├── prompts/prompt.md  # system prompt
│   ├── database.py        # SQLite access
│   ├── security.py        # password hashing
│   └── audit.py           # append-only audit trail
├── frontend/              # React + Vite + TypeScript app
└── output/
    ├── harness.md         # technical specification
    ├── design.md          # Problem 10 design write-up
    ├── usability.md       # Problem 9 usability improvements
    ├── app_check.html     # Problem 11 evidence page (open directly in a browser)
    ├── app_check_images/  # screenshots used by app_check.html
    └── audit_trail.json   # append-only agent audit trail
```

## 1. Add the local data pack (required)

The real database and product images are **not in this repository**. They are local assignment data and are excluded by `.gitignore`. Before running the app, place the provided data pack inside `hw4/` like this:

```
hw4/
└── data/
    ├── campus_customs.db
    └── products/          # product images, e.g. yale-grandpa-hoodie.jpg
```

The backend reads `data/campus_customs.db` and serves images from `data/products/`. If they're missing, it stops at startup with a message telling you to add them.

## 2. Set up the environment

Requires **Python 3** and **Node.js** (built and tested with Python 3.14 and Node 24).

```bash
cd hw4
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then edit .env and fill in your own values
```

| Variable in `.env` | Required? | What it is |
|---|---|---|
| `PORTKEY_API_KEY` | Yes, for the chat | Your Portkey gateway key (the model is `gpt-5.6-luna` via Portkey). Without it the site works but `/chat` returns 503. |
| `SESSION_SECRET` | Recommended | Any long random string; signs the login cookie so users stay logged in across restarts. |
| `PORTKEY_BASE_URL`, `OPENAI_MODEL` | Optional | Defaults: `https://api.portkey.ai/v1`, `gpt-5.6-luna`. |

`.env` is gitignored. Never commit real keys.

## 3. Run the backend

In one terminal (with the virtualenv activated):

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API runs at http://127.0.0.1:8000 (health check: http://127.0.0.1:8000/api/health).

## 4. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api`, `/media`, and `/chat` to the backend on port 8000, so both must be running. Other scripts: `npm run build` (type-check and production build) and `npm run lint`.

## Try it

- **Browse:** Products → search "hoodie", filter by color, price, or "in stock in size", then open a product and add it to the bag.
- **Chat** (the "Ask the shop" button):
  - "What hoodies do you have?" returns product cards.
  - On a product page: "How much is this?" or "Do you have this in medium?"
  - "I'm looking for a Yale hoodie for a student."
  - "Do you have it in another color?" with no product open makes the assistant ask which product you mean.
- **Accounts:** create an account, or log in with the seeded test account from the data pack (`test@campuscustoms.yale.edu` / `password`). Logged-in chats are saved and reload on your next visit.
- **Evidence:** open `output/app_check.html` directly in a browser.

## Privacy and security notes

- Not committed: `.env`, `data/` (database and product images), virtualenvs, `node_modules`, and build output (see `.gitignore`).
- Passwords are stored only as salted PBKDF2-SHA256 hashes. The browser holds only an HttpOnly session cookie.
- The agent never receives passwords, hashes, or keys. The audit trail stores short, redacted summaries (no message text, emails, or secrets).
