import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowIcon, ChatIcon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import StatusMessage from '../components/StatusMessage'
import { fetchProduct, fetchProducts } from '../lib/api'
import type { ProductDetail, ProductSummary } from '../lib/api'
import { openChat } from '../lib/chatBus'
import { COLOR_FAMILIES, categoryOf, formatPrice, stockLabel } from '../lib/format'
import { useRegisterCurrentProduct } from '../lib/pageContext'
import { useAsync } from '../lib/useAsync'
import QuantityStepper from '../components/QuantityStepper'
import { MAX_PER_LINE, useCart } from '../lib/cart'

export default function ProductPage() {
  const { productId = '' } = useParams()
  const { state, retry } = useAsync(() => fetchProduct(productId), [productId])
  const catalogue = useAsync(fetchProducts, [])
  // Tell the chat widget which product is on screen, so "this" means this product.
  useRegisterCurrentProduct(
    state.status === 'success' ? { product_id: state.data.product_id, product_name: state.data.name } : null,
  )

  if (state.status === 'loading') {
    return (
      <div className="page">
        <div className="product-skeleton" aria-hidden="true">
          <div className="skeleton-block tall" />
          <div>
            <div className="skeleton-block line" />
            <div className="skeleton-block line short" />
            <div className="skeleton-block line" />
          </div>
        </div>
        <StatusMessage kind="loading" message="Loading product…" />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="page">
        <StatusMessage kind="error" message={state.error} onRetry={retry} />
        <p className="center">
          <Link to="/products" className="text-link">
            ← Back to all products
          </Link>
        </p>
      </div>
    )
  }

  const product = state.data
  const category = categoryOf(product.garment_type)
  const inStockSizes = product.inventory.filter((i) => i.quantity > 0).length
  const related = catalogue.state.status === 'success' ? relatedProducts(product, catalogue.state.data) : []

  return (
    <div className="page product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link>
        <span>/</span>
        <Link to={`/products?category=${encodeURIComponent(category)}`}>{category}</Link>
        <span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-detail">
        <ZoomImage src={product.image_url} alt={product.name} />

        <div className="product-detail-info">
          <p className="eyebrow">{product.garment_type}</p>
          <h1>{product.name}</h1>
          <div className="price-row">
            <p className="detail-price">{formatPrice(product.price)}</p>
            <span className={product.total_stock > 0 ? 'stock-pill ok' : 'stock-pill out'}>
              {product.inventory.length === 0
                ? 'Stock unavailable'
                : product.total_stock > 0
                  ? `In stock · ${inStockSizes} of ${product.inventory.length} sizes`
                  : 'Sold out'}
            </span>
          </div>
          <p className="detail-desc">{product.description}</p>

          {product.colors.length > 0 && (
            <div className="detail-block">
              <p className="detail-label">Colors</p>
              <div className="tag-list">
                {product.colors.map((color) => {
                  const family = COLOR_FAMILIES.find((f) => f.matches(color.toLowerCase()))
                  return (
                    <span key={color} className="tag color-tag">
                      {family && <span className="color-dot" style={{ background: family.swatch }} aria-hidden="true" />}
                      {color}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <SizeAndBag key={product.product_id} product={product} />

          <button className="detail-help" onClick={() => openChat()}>
            <ChatIcon width={20} height={20} />
            <span>
              <strong>Questions about this item?</strong> Our shop assistant knows you’re looking at the {product.name}.
              Ask about colors, sizes, or stock.
            </span>
            <ArrowIcon width={16} height={16} />
          </button>

          <details className="detail-more">
            <summary>Product details</summary>
            <dl>
              <dt>Style</dt>
              <dd>{product.garment_type}</dd>
              <dt>Category</dt>
              <dd>{category}</dd>
              <dt>Colors</dt>
              <dd>{product.colors.join(', ') || 'Not listed'}</dd>
              <dt>Sizes</dt>
              <dd>{product.inventory.map((i) => i.size).join(', ') || 'Not listed'}</dd>
            </dl>
            {product.search_tags.length > 0 && (
              <div className="tag-list">
                {product.search_tags.slice(0, 8).map((tag) => (
                  <Link key={tag} to={`/products?q=${encodeURIComponent(tag)}`} className="tag tag-link">
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </details>
        </div>
      </div>

      {related.length > 0 && (
        <Reveal as="section" className="related">
          <div className="section-head">
            <div>
              <p className="kicker">You might also like</p>
              <h2>More {category.toLowerCase()} in stock</h2>
            </div>
            <Link to={`/products?category=${encodeURIComponent(category)}`} className="text-link">
              See all {category} <ArrowIcon width={16} height={16} />
            </Link>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}

/** In-stock products from the same category, ranked by shared search tags. */
function relatedProducts(product: ProductDetail, catalogue: ProductSummary[]): ProductSummary[] {
  const tags = new Set(product.search_tags.map((t) => t.toLowerCase()))
  const category = categoryOf(product.garment_type)
  return catalogue
    .filter((p) => p.product_id !== product.product_id && p.total_stock > 0 && categoryOf(p.garment_type) === category)
    .map((p) => ({ p, shared: p.search_tags.filter((t) => tags.has(t.toLowerCase())).length }))
    .sort((a, b) => b.shared - a.shared || b.p.in_stock_sizes.length - a.p.in_stock_sizes.length || a.p.name.localeCompare(b.p.name))
    .slice(0, 4)
    .map(({ p }) => p)
}

/** Large product image with a magnifier that follows the cursor (pointer devices only). */
function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [origin, setOrigin] = useState<string | null>(null)
  function move(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setOrigin(`${x}% ${y}%`)
  }
  return (
    <div
      className={origin ? 'product-detail-image zooming' : 'product-detail-image'}
      onMouseMove={move}
      onMouseLeave={() => setOrigin(null)}
    >
      <img src={src} alt={alt} style={origin ? { transformOrigin: origin } : undefined} />
      <span className="zoom-hint" aria-hidden="true">
        Hover to zoom
      </span>
    </div>
  )
}

/** Size availability (Problem 3) plus choosing a quantity and adding it to the bag (Problem 9). */
function SizeAndBag({ product }: { product: ProductDetail }) {
  const { inventory, total_stock: totalStock } = product
  const { items, add } = useCart()
  // A single-size product (e.g. "One Size") is pre-selected when it's in stock.
  const [selected, setSelected] = useState<string | null>(
    inventory.length === 1 && inventory[0].quantity > 0 ? inventory[0].size : null,
  )
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  if (inventory.length === 0) {
    return (
      <div className="detail-block">
        <p className="detail-label">Availability</p>
        <p className="muted">Stock details aren’t available for this item yet.</p>
      </div>
    )
  }

  const selectedItem = inventory.find((item) => item.size === selected)
  const selectedLabel = selectedItem ? stockLabel(selectedItem.quantity) : null
  const inBag = items.find((i) => i.product_id === product.product_id && i.size === selected)?.quantity ?? 0
  const canAddMore = selectedItem ? Math.min(selectedItem.quantity, MAX_PER_LINE) - inBag : 0

  function choose(size: string) {
    setSelected(size)
    setQuantity(1)
    setAdded(null)
  }

  function addToBag() {
    setAttempted(true)
    if (!selectedItem || canAddMore <= 0) return
    const qty = Math.min(quantity, canAddMore)
    add({ product_id: product.product_id, name: product.name, image_url: product.image_url, size: selectedItem.size, price: product.price }, qty)
    setAdded(`Added ${qty} × ${product.name} (${selectedItem.size}) to your bag.`)
    setQuantity(1)
  }

  return (
    <div className="detail-block">
      {inventory.length === 1 ? (
        <>
          <p className="detail-label">Availability · {inventory[0].size}</p>
          <p className={`stock-text ${stockLabel(inventory[0].quantity).tone}`}>{stockLabel(inventory[0].quantity).text}</p>
        </>
      ) : (
        <>
          <p className="detail-label">
            Sizes <span className="muted">· {totalStock > 0 ? `${totalStock} total in stock` : 'currently sold out'}</span>
          </p>
          <div className="size-grid">
            {inventory.map((item) => {
              const label = stockLabel(item.quantity)
              return (
                <button
                  key={item.size}
                  className={`size-option ${label.tone}${selected === item.size ? ' selected' : ''}`}
                  onClick={() => choose(item.size)}
                  aria-pressed={selected === item.size}
                  disabled={item.quantity <= 0}
                  aria-label={`Size ${item.size}, ${label.text}`}
                >
                  <strong>{item.size}</strong>
                  <small>{label.text}</small>
                </button>
              )
            })}
          </div>
          {selectedItem && selectedLabel && (
            <p className={`stock-text ${selectedLabel.tone}`}>
              Size {selectedItem.size}: {selectedLabel.text}
            </p>
          )}
        </>
      )}

      {totalStock > 0 && (
        <div className="add-to-bag">
          <QuantityStepper
            value={quantity}
            max={Math.max(1, canAddMore)}
            onChange={setQuantity}
            label="Quantity"
          />
          <button className="btn btn-primary add-button" onClick={addToBag} disabled={!!selectedItem && canAddMore <= 0}>
            {selectedItem && canAddMore <= 0 ? 'Max in bag' : 'Add to bag'}
          </button>
        </div>
      )}
      {attempted && !selectedItem && <p className="field-error">Please choose a size first.</p>}
      {selectedItem && inBag > 0 && canAddMore <= 0 && (
        <p className="muted small">You already have all available {selectedItem.size} stock in your bag.</p>
      )}
      {added && (
        <p className="success-note" role="status">
          ✓ {added} <Link to="/cart">View bag →</Link>
        </p>
      )}
    </div>
  )
}
