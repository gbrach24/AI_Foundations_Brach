import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { fetchChatHistory, sendChatMessage } from '../lib/api'
import type { AuthUser, ChatMessage, ChatProductCard } from '../lib/api'
import { useAuth } from '../lib/auth'
import { displayName } from '../lib/format'
import { onOpenChat } from '../lib/chatBus'
import { useChatPageContext } from '../lib/pageContext'
import { ChatIcon, CloseIcon, Monogram, SendIcon } from './Icons'
import ProductCard from './ProductCard'

const STARTER_PROMPTS = ['Help me find a hoodie', 'What would you recommend as a gift?', 'Show me Yale favorites', 'What do you have in stock?']
const PRODUCT_PROMPTS = ['What sizes is this in stock in?', 'Does this come in other colors?', 'How much is this?']

/** Renders **bold** spans from the model's plain-text replies (no HTML injection). */
function formatReply(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

/** Structured product matches from the /chat response, rendered with the site's ProductCard. */
function ChatProductCards({ products, onNavigate }: { products: ChatProductCard[]; onNavigate: () => void }) {
  return (
    <div className="chat-products" aria-label="Matching products">
      {products.map((product) => (
        <ProductCard key={product.product_id} product={product} variant="compact" onNavigate={onNavigate} />
      ))}
    </div>
  )
}

/**
 * Floating shop chat. Messages go to the FastAPI /chat endpoint (PydanticAI agent)
 * with the current page context. Logged-in shoppers' conversations are saved on
 * the server and reloaded here; guests' conversations live only in this page.
 */
export default function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  // Whose conversation is on screen. Keying the conversation by it means logging
  // in, logging out, or switching accounts mounts a fresh conversation, so one
  // person's history never shows for the next and late replies are discarded.
  const sessionKey = user === undefined ? 'checking' : user ? `user:${user.id}` : 'guest'

  // Other pages can open the assistant (e.g. "Ask about this item", Home prompts).
  useEffect(() => onOpenChat(() => setOpen(true)), [])

  return (
    <div className={open ? 'chat-root is-open' : 'chat-root'}>
      <ChatConversation key={sessionKey} user={user ?? null} open={open} onClose={() => setOpen(false)} />
      <button
        className="chat-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <span className="launcher-icon">{open ? <CloseIcon width={22} height={22} /> : <ChatIcon width={24} height={24} />}</span>
        <span className="launcher-label">Ask the shop</span>
      </button>
    </div>
  )
}

interface ChatConversationProps {
  user: AuthUser | null
  open: boolean
  onClose: () => void
}

/** One shopper's (or one guest's) conversation. Stays mounted while the panel is closed. */
function ChatConversation({ user, open, onClose }: ChatConversationProps) {
  const pageContext = useChatPageContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'error'>(user ? 'loading' : 'idle')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Logged in: load the saved conversation (the server picks the user from the session cookie).
  const userId = user?.id
  useEffect(() => {
    if (userId === undefined) return
    // Per-request flag: React StrictMode runs this effect twice in development,
    // and only the request from the effect that is still active may apply.
    let cancelled = false
    fetchChatHistory()
      .then((history) => {
        if (cancelled) return
        // Keep anything sent while the history was loading after the saved messages.
        setMessages((current) => [...history, ...current])
        setHistoryStatus('idle')
      })
      .catch(() => !cancelled && setHistoryStatus('error'))
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, sending, open, historyStatus])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // A prompt sent from elsewhere on the site (chat bus) is sent like a typed message.
  const sendRef = useRef<(text: string) => void>(() => {})
  useEffect(() => {
    sendRef.current = (text: string) => void send(text)
  })
  useEffect(() => onOpenChat(({ prompt }) => prompt && sendRef.current(prompt)), [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await send(draft.trim())
  }

  async function send(text: string) {
    if (!text || sending) return

    const conversation = [...messages, { role: 'user' as const, content: text }]
    setMessages(conversation)
    setDraft('')
    setSending(true)
    setError(null)
    try {
      const reply = await sendChatMessage(conversation, pageContext)
      if (mounted.current) setMessages((current) => [...current, reply])
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Sorry, the assistant is unavailable right now. Please try again.')
      }
    } finally {
      if (mounted.current) setSending(false)
    }
  }

  const welcome = user
    ? `Welcome back, ${displayName(user)}! Ask me about products, sizes, or what’s in stock. Our chat is saved to your account.`
    : 'Hi there, Bulldog! I’m the Campus Customs shop assistant. Ask me about products, sizes, or what’s in stock.'
  const showStarters = messages.length === 0 && historyStatus !== 'loading' && !sending
  const starters = pageContext.product_name ? [...PRODUCT_PROMPTS, STARTER_PROMPTS[1]] : STARTER_PROMPTS

  // The panel stays mounted (so it can animate closed) but is inert while hidden.
  return (
    <section className={open ? 'chat-panel open' : 'chat-panel'} aria-label="Campus Customs shop assistant" aria-hidden={!open} inert={!open}>
      <header className="chat-header">
        <Monogram size={38} className="chat-avatar" />
        <div className="chat-heading">
          <p className="chat-title">Shop Assistant</p>
          <p className="chat-subtitle">
            <span className="status-dot" aria-hidden="true" />
            {user ? `Signed in as ${displayName(user)} · chat saved` : 'Live stock · log in to save your chat'}
          </p>
        </div>
        <button className="chat-close" onClick={onClose} aria-label="Close chat">
          <CloseIcon />
        </button>
      </header>
      {pageContext.product_name && (
        <p className="chat-context" title="The assistant knows which product you're viewing">
          Viewing: <strong>{pageContext.product_name}</strong>
        </p>
      )}

      <div className="chat-messages" ref={listRef} aria-live="polite">
        <div className="chat-turn assistant">
          <div className="chat-bubble assistant">{welcome}</div>
        </div>
        {showStarters && (
          <div className="starter-prompts" aria-label="Suggested questions">
            {starters.map((prompt) => (
              <button key={prompt} className="quick-reply" onClick={() => send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        )}
        {historyStatus === 'loading' && <p className="chat-note">Loading your previous conversation…</p>}
        {historyStatus === 'error' && <p className="chat-error">Couldn’t load your previous conversation.</p>}
        {messages.map((message, index) => {
          const isLatest = index === messages.length - 1
          return (
            <div key={index} className={`chat-turn ${message.role}`}>
              <div className={`chat-bubble ${message.role}`}>
                {message.role === 'assistant' ? formatReply(message.content) : message.content}
              </div>
              {message.replyType === 'cannot_confirm' && (
                <p className="chat-flag">ℹ️ Not in our catalogue data. Ask the store to confirm.</p>
              )}
              {message.products && message.products.length > 0 && (
                <ChatProductCards products={message.products} onNavigate={onClose} />
              )}
              {isLatest && !sending && message.replyType === 'clarifying_question' && !!message.suggestedReplies?.length && (
                <div className="quick-replies" aria-label="Suggested replies">
                  {message.suggestedReplies.map((option) => (
                    <button key={option} className="quick-reply" onClick={() => send(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {sending && (
          <div className="chat-bubble assistant typing" aria-label="Assistant is typing">
            <span />
            <span />
            <span />
          </div>
        )}
        {error && <p className="chat-error">{error}</p>}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={pageContext.product_name ? `Ask about ${pageContext.product_name}…` : 'Ask about a product…'}
          aria-label="Message"
          maxLength={1000}
        />
        <button type="submit" disabled={!draft.trim() || sending} aria-label="Send">
          <SendIcon />
        </button>
      </form>
    </section>
  )
}
