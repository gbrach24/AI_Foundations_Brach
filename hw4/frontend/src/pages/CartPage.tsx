import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QuantityStepper from '../components/QuantityStepper'
import { fetchProduct } from '../lib/api'
import { MAX_PER_LINE, useCart } from '../lib/cart'
import type { CartItem } from '../lib/cart'
import { formatPrice } from '../lib/format'

type LiveStock = Record<string, number | null> // `${product_id}|${size}` -> current quantity (null = unknown)
const keyOf = (i: Pick<CartItem, 'product_id' | 'size'>) => `${i.product_id}|${i.size}`

export default function CartPage() {
  const { items, count, subtotal, setQuantity, updateItem, remove, clear } = useCart()
  const [stock, setStock] = useState<LiveStock>({})
  const [notices, setNotices] = useState<Record<string, string>>({})
  const [checking, setChecking] = useState(items.length > 0)

  // Re-check every line against the live catalogue: current price and stock for that size.
  const lineKeys = items.map(keyOf).join(',')
  useEffect(() => {
    let cancelled = false
    const ids = [...new Set(items.map((i) => i.product_id))]
    Promise.all(ids.map((id) => fetchProduct(id).catch(() => null))).then((products) => {
      if (cancelled) return
      const nextStock: LiveStock = {}
      const nextNotices: Record<string, string> = {}
      for (const item of items) {
        const product = products.find((p) => p?.product_id === item.product_id)
        const k = keyOf(item)
        if (!product) {
          nextStock[k] = null
          continue
        }
        const qty = product.inventory.find((s) => s.size === item.size)?.quantity ?? 0
        nextStock[k] = qty
        if (product.price !== item.price) {
          updateItem(item.product_id, item.size, { price: product.price })
          nextNotices[k] = `Price updated to ${formatPrice(product.price)}.`
        }
        if (qty === 0) nextNotices[k] = `Size ${item.size} is now sold out.`
        else if (item.quantity > qty) {
          updateItem(item.product_id, item.size, { quantity: qty })
          nextNotices[k] = `Only ${qty} left in ${item.size}, so we adjusted your quantity.`
        }
      }
      setStock(nextStock)
      setNotices(nextNotices)
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
    // Re-check when lines are added or removed, not on every quantity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKeys])

  if (items.length === 0) {
    return (
      <div className="page cart-page">
        <h1>Your bag</h1>
        <div className="empty-results">
          <p className="empty-title">Your bag is empty.</p>
          <p className="muted">Pick a size on any product page and tap “Add to bag”.</p>
          <div className="empty-actions">
            <Link to="/products" className="btn btn-primary">
              Shop products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const soldOutLines = items.filter((i) => stock[keyOf(i)] === 0)
  const payable = subtotal - soldOutLines.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="page cart-page">
      <div className="cart-head">
        <h1>Your bag</h1>
        <span className="muted">
          {count} item{count === 1 ? '' : 's'}
        </span>
      </div>

      <div className="cart-layout">
        <ul className="cart-lines">
          {items.map((item) => {
            const k = keyOf(item)
            const live = stock[k]
            const soldOut = live === 0
            const max = Math.min(MAX_PER_LINE, live ?? MAX_PER_LINE)
            return (
              <li key={k} className={soldOut ? 'cart-line sold-out' : 'cart-line'}>
                <Link to={`/products/${item.product_id}`} className="cart-thumb">
                  <img src={item.image_url} alt={item.name} />
                </Link>
                <div className="cart-info">
                  <Link to={`/products/${item.product_id}`} className="cart-name">
                    {item.name}
                  </Link>
                  <p className="muted">Size {item.size} · {formatPrice(item.price)} each</p>
                  {notices[k] && <p className={soldOut ? 'cart-notice error' : 'cart-notice'}>{notices[k]}</p>}
                  {!soldOut && live != null && live <= 5 && !notices[k] && <p className="cart-notice">Only {live} left</p>}
                </div>
                <div className="cart-controls">
                  {soldOut ? (
                    <span className="badge-inline">Sold out</span>
                  ) : (
                    <QuantityStepper
                      value={item.quantity}
                      max={max}
                      allowZero
                      label={`Quantity of ${item.name}, size ${item.size}`}
                      onChange={(q) => setQuantity(item.product_id, item.size, q)}
                    />
                  )}
                  <p className="cart-line-total">{formatPrice(item.price * item.quantity)}</p>
                  <button className="link-button" onClick={() => remove(item.product_id, item.size)}>
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="cart-summary">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatPrice(payable)}</strong>
          </div>
          {soldOutLines.length > 0 && <p className="cart-notice error">Sold-out items aren’t included.</p>}
          <p className="muted small">Shipping and taxes are calculated at checkout.</p>
          <button className="btn btn-primary full" disabled title="Online checkout isn't available yet">
            Checkout coming soon
          </button>
          <p className="muted small center">{checking ? 'Checking current prices and stock…' : 'Prices and stock checked just now.'}</p>
          <Link to="/products" className="btn btn-outline full">
            Continue shopping
          </Link>
          <button className="link-button center" onClick={clear}>
            Empty bag
          </button>
        </aside>
      </div>
    </div>
  )
}
