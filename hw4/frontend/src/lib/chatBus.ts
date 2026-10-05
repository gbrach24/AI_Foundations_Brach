// Lets any page open the shop assistant, optionally sending a prompt
// (e.g. "Ask about this hoodie" on a product page or the Home page CTA).
const EVENT = 'cc:open-chat'

export interface OpenChatDetail {
  prompt?: string
}

export function openChat(prompt?: string) {
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(EVENT, { detail: { prompt } }))
}

export function onOpenChat(handler: (detail: OpenChatDetail) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<OpenChatDetail>).detail ?? {})
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
