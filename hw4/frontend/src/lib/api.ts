// Typed client for the FastAPI backend (backend/main.py).
// Field names mirror the database columns documented in output/harness.md.

export interface InventoryItem {
  size: string
  quantity: number
}

export interface ProductSummary {
  product_id: string
  name: string
  garment_type: string
  description: string
  colors: string[]
  search_tags: string[]
  price: number
  image_file_path: string
  /** Browser URL for the image, e.g. /media/products/<id>.jpg */
  image_url: string
  total_stock: number
  /** Sizes with quantity > 0 (Problem 9: powers the "in stock in my size" filter). */
  in_stock_sizes: string[]
}

export interface ProductDetail extends ProductSummary {
  inventory: InventoryItem[]
}

/** Structured product match attached to a chatbot reply (backend/models.py ProductCard). */
export interface ChatProductCard {
  product_id: string
  name: string
  garment_type: string
  price: number
  image_url: string
  short_description: string
  colors: string[]
  total_stock: number
}

export type ReplyType = 'answer' | 'clarifying_question' | 'cannot_confirm'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  products?: ChatProductCard[]
  /** Problem 9: how the agent classified its reply, plus tap-to-send options for clarifying questions. */
  replyType?: ReplyType
  suggestedReplies?: string[]
}

export type PageType = 'home' | 'products' | 'product' | 'about' | 'login' | 'create_account' | 'other'

/** What the shopper is looking at (backend/models.py PageContext). */
export interface ChatPageContext {
  page_type: PageType
  path: string
  product_id?: string
  product_name?: string
}

const UNREACHABLE = 'We couldn’t reach the Campus Customs server. Please try again in a moment.'

async function getJson<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error(UNREACHABLE)
  }
  // The Vite dev proxy answers 502-504 when the backend isn't running.
  if (response.status >= 502 && response.status <= 504) {
    throw new Error(UNREACHABLE)
  }
  if (response.status === 404) {
    throw new Error('We couldn’t find what you were looking for.')
  }
  if (!response.ok) {
    throw new Error(`The server returned an error (${response.status}). Please try again.`)
  }
  return (await response.json()) as T
}

export function fetchProducts(): Promise<ProductSummary[]> {
  return getJson<ProductSummary[]>('/api/products')
}

export function fetchProduct(productId: string): Promise<ProductDetail> {
  return getJson<ProductDetail>(`/api/products/${encodeURIComponent(productId)}`)
}

export function fetchHealth(): Promise<{ status: string; products: number }> {
  return getJson('/api/health')
}

// ---------- Accounts (Problem 4) ----------
// The session lives in an HttpOnly cookie set by the backend; passwords are
// only ever sent in these POST bodies and never stored in the browser.

export interface AuthUser {
  id: number
  first_name: string | null
  last_name: string | null
  name: string
  email: string
}

export interface RegisterInput {
  first_name: string
  last_name: string
  email: string
  password: string
}

/** Error from an auth call, with optional per-field messages from the server. */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(UNREACHABLE, 0)
  }
  if (response.status >= 502 && response.status <= 504) {
    throw new ApiError(UNREACHABLE, response.status)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data?.detail
    const message = typeof detail === 'string' ? detail : detail?.message ?? 'Something went wrong. Please try again.'
    throw new ApiError(message, response.status, detail?.fields ?? {})
  }
  return data as T
}

export async function registerAccount(input: RegisterInput): Promise<AuthUser> {
  return (await postJson<{ user: AuthUser }>('/api/auth/register', input)).user
}

export async function logIn(email: string, password: string): Promise<AuthUser> {
  return (await postJson<{ user: AuthUser }>('/api/auth/login', { email, password })).user
}

export async function logOut(): Promise<void> {
  await postJson('/api/auth/logout')
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  return (await getJson<{ user: AuthUser | null }>('/api/auth/me')).user
}

const CHAT_TIMEOUT_MS = 60_000
const CHAT_HISTORY_TURNS = 10

/**
 * Send the shopper's latest message (plus recent turns for context) to the
 * FastAPI chat endpoint (backend/main.py POST /chat), which runs the
 * PydanticAI agent. Returns the assistant's reply and any product cards.
 */
export async function sendChatMessage(conversation: ChatMessage[], pageContext?: ChatPageContext): Promise<ChatMessage> {
  const latest = conversation[conversation.length - 1]
  const history = conversation
    .slice(0, -1)
    .slice(-CHAT_HISTORY_TURNS)
    .map(({ role, content }) => ({ role, content }))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // history is only used for guests; the backend loads a logged-in shopper's
      // history from the database and identifies them from the session cookie.
      body: JSON.stringify({ message: latest.content, history, page_context: pageContext }),
      signal: controller.signal,
    })
  } catch (err) {
    throw new Error(
      err instanceof DOMException && err.name === 'AbortError'
        ? 'The assistant took too long to answer. Please try again.'
        : UNREACHABLE,
    )
  } finally {
    clearTimeout(timer)
  }

  if (response.status >= 502 && response.status <= 504 && !response.headers.get('content-type')?.includes('json')) {
    throw new Error(UNREACHABLE)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'The assistant couldn’t answer just now. Please try again.')
  }
  return {
    role: 'assistant',
    content: data.reply,
    products: data.products ?? [],
    replyType: data.reply_type ?? 'answer',
    suggestedReplies: data.suggested_replies ?? [],
  }
}

/**
 * The logged-in shopper's saved conversation (GET /chat/history). The backend
 * decides whose history to return from the session cookie; guests get [].
 */
export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const data = await getJson<{ logged_in: boolean; messages: (ChatMessage & { id: number })[] }>('/chat/history')
  return data.messages.map(({ role, content, products }) => ({ role, content, products }))
}
