import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/** One line in the shopping bag: a product in a specific size. */
export interface CartItem {
  product_id: string
  name: string
  image_url: string
  size: string
  /** Price when added; the Bag page re-checks it against /api/products. */
  price: number
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  add: (item: Omit<CartItem, 'quantity'>, quantity: number) => void
  setQuantity: (productId: string, size: string, quantity: number) => void
  updateItem: (productId: string, size: string, changes: Partial<Pick<CartItem, 'price' | 'quantity'>>) => void
  remove: (productId: string, size: string) => void
  clear: () => void
}

// sessionStorage: the bag survives page reloads and navigation for the rest of
// this browser session, without needing an account or a server cart.
const STORAGE_KEY = 'campus-customs-bag-v1'
export const MAX_PER_LINE = 10

function load(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.product_id === 'string' && i.quantity > 0) : []
  } catch {
    return []
  }
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage can be unavailable (private mode); the bag still works for this page.
    }
  }, [items])

  const same = (i: CartItem, productId: string, size: string) => i.product_id === productId && i.size === size

  const add = useCallback((item: Omit<CartItem, 'quantity'>, quantity: number) => {
    setItems((current) => {
      const existing = current.find((i) => same(i, item.product_id, item.size))
      if (existing) {
        return current.map((i) =>
          same(i, item.product_id, item.size) ? { ...i, price: item.price, quantity: Math.min(MAX_PER_LINE, i.quantity + quantity) } : i,
        )
      }
      return [...current, { ...item, quantity: Math.min(MAX_PER_LINE, quantity) }]
    })
  }, [])

  const updateItem = useCallback((productId: string, size: string, changes: Partial<Pick<CartItem, 'price' | 'quantity'>>) => {
    setItems((current) => current.map((i) => (same(i, productId, size) ? { ...i, ...changes } : i)))
  }, [])

  const setQuantity = useCallback((productId: string, size: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => !same(i, productId, size))
        : current.map((i) => (same(i, productId, size) ? { ...i, quantity: Math.min(MAX_PER_LINE, quantity) } : i)),
    )
  }, [])

  const remove = useCallback((productId: string, size: string) => {
    setItems((current) => current.filter((i) => !same(i, productId, size)))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      add,
      setQuantity,
      updateItem,
      remove,
      clear,
    }),
    [items, add, setQuantity, updateItem, remove, clear],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
