import { Link } from 'react-router-dom'
import type { ChatProductCard, ProductSummary } from '../lib/api'
import { COLOR_FAMILIES, categoryOf, formatPrice, shortDescription } from '../lib/format'

/** A catalogue product from /api/products, or a structured match from /chat. */
export type CardProduct = ProductSummary | ChatProductCard

interface ProductCardProps {
  product: CardProduct
  /** 'grid' for the Products/Home pages, 'compact' for chat results and tight rows. */
  variant?: 'grid' | 'compact'
  onNavigate?: () => void
}

/** Up to 4 distinct swatches for the product's catalogue colors. */
function swatchesFor(colors: string[]): { label: string; swatch: string }[] {
  const seen = new Map<string, string>()
  for (const color of colors) {
    const family = COLOR_FAMILIES.find((f) => f.matches(color.toLowerCase()))
    if (family && !seen.has(family.label)) seen.set(family.label, family.swatch)
  }
  return [...seen].slice(0, 4).map(([label, swatch]) => ({ label, swatch }))
}

/**
 * The one product card used across the site (grid, Home rows, chat). Every
 * variant links to the same product detail route (/products/:productId).
 */
export default function ProductCard({ product, variant = 'grid', onNavigate }: ProductCardProps) {
  const soldOut = product.total_stock <= 0
  const fewSizes = 'in_stock_sizes' in product && !soldOut && product.in_stock_sizes.length <= 2
  const summary = 'short_description' in product ? product.short_description : shortDescription(product.description)
  const swatches = swatchesFor(product.colors)

  return (
    <Link to={`/products/${product.product_id}`} className={`product-card ${variant}`} onClick={onNavigate}>
      <div className="product-card-image">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        {soldOut && <span className="badge badge-out">Sold out</span>}
        {fewSizes && <span className="badge badge-low">Few sizes left</span>}
        {variant === 'grid' && (
          <span className="card-cta" aria-hidden="true">
            View details <span className="arrow">→</span>
          </span>
        )}
      </div>
      <div className="product-card-body">
        <p className="eyebrow">{categoryOf(product.garment_type)}</p>
        <h3>{product.name}</h3>
        <p className="product-card-desc">{summary}</p>
        <div className="card-foot">
          <p className="price">{formatPrice(product.price)}</p>
          {swatches.length > 0 && (
            <span className="color-dots" aria-label={`Colors: ${product.colors.join(', ')}`}>
              {swatches.map((s) => (
                <span key={s.label} className="color-dot" style={{ background: s.swatch }} title={s.label} />
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
