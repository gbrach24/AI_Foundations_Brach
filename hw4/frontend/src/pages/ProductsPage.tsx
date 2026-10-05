import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import StatusMessage from '../components/StatusMessage'
import { fetchProducts } from '../lib/api'
import type { ProductSummary } from '../lib/api'
import { COLLECTIONS, findCollection, inCollection } from '../lib/collections'
import { CATEGORIES, COLOR_FAMILIES, PRICE_RANGES, SIZE_OPTIONS, categoryOf, hasColorFamily } from '../lib/format'
import { useAsync } from '../lib/useAsync'

type SortKey = 'name' | 'price-asc' | 'price-desc'

// Every filter lives in the URL (?q=&category=&color=&price=&size=&collection=&sort=)
// so results can be bookmarked, shared, and restored with the Back button.
const FILTER_KEYS = ['q', 'category', 'collection', 'color', 'price', 'size'] as const

function matchesQuery(product: ProductSummary, query: string): boolean {
  if (!query) return true
  const haystack = [product.name, product.garment_type, product.description, ...product.search_tags, ...product.colors]
    .join(' ')
    .toLowerCase()
  // Every word must match somewhere ("navy hoodie" = navy AND hoodie).
  return query.split(/\s+/).every((word) => haystack.includes(word))
}

export default function ProductsPage() {
  const { state, retry } = useAsync(fetchProducts, [])
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const rawQuery = params.get('q') ?? ''
  const query = rawQuery.trim().toLowerCase()
  const category = params.get('category') ?? ''
  const color = params.get('color') ?? ''
  const price = PRICE_RANGES.find((r) => r.key === params.get('price'))
  const size = params.get('size') ?? ''
  const sort = (params.get('sort') as SortKey) || 'name'
  const collection = findCollection(params.get('collection'))

  // Build each change from the live URL rather than this render's params, so quick
  // successive changes (typing, then tapping a chip right away) never drop a filter.
  // (React Router's functional setSearchParams also receives this render's params.)
  function update(key: string, value: string) {
    const next = new URLSearchParams(window.location.search)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function clearAll() {
    const next = new URLSearchParams(window.location.search)
    FILTER_KEYS.forEach((k) => next.delete(k))
    setParams(next, { replace: true })
  }

  // 102 products: filtering on every render is instant, so no memoization is needed.
  const products = state.status === 'success' ? state.data : []
  const visible = products
    .filter(
      (p) =>
        (!category || categoryOf(p.garment_type) === category) &&
        (!collection || inCollection(p.name, collection)) &&
        (!color || hasColorFamily(p.colors, color)) &&
        (!price || (p.price >= price.min && p.price <= price.max)) &&
        (!size || p.in_stock_sizes.includes(size)) &&
        matchesQuery(p, query),
    )
    .sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price || a.name.localeCompare(b.name)
      if (sort === 'price-desc') return b.price - a.price || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name)
    })

  // Only offer colors that exist in the catalogue.
  const colorOptions = COLOR_FAMILIES.filter((f) => products.some((p) => hasColorFamily(p.colors, f.label)))

  const active: { key: string; label: string }[] = [
    ...(rawQuery.trim() ? [{ key: 'q', label: `“${rawQuery.trim()}”` }] : []),
    ...(category ? [{ key: 'category', label: category }] : []),
    ...(collection ? [{ key: 'collection', label: collection.title }] : []),
    ...(color ? [{ key: 'color', label: color }] : []),
    ...(price ? [{ key: 'price', label: price.label }] : []),
    ...(size ? [{ key: 'size', label: `In stock in ${size}` }] : []),
  ]

  return (
    <div className="page">
      <div className="page-head">
        <p className="eyebrow">The full lineup</p>
        <h1>{collection ? collection.title : 'Shop all products'}</h1>
        <p className="muted">{collection ? collection.blurb : 'Every piece below comes straight from our live catalogue.'}</p>
      </div>

      <div className="filters">
        <div className="search-field">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search by name, college, sport, color…"
            value={rawQuery}
            onChange={(e) => update('q', e.target.value)}
            aria-label="Search products"
          />
        </div>
        <select value={sort} onChange={(e) => update('sort', e.target.value === 'name' ? '' : e.target.value)} aria-label="Sort">
          <option value="name">Sort: A–Z</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
        <button
          className="btn btn-outline filters-toggle"
          aria-expanded={filtersOpen}
          aria-controls="filter-panel"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filters{active.length > 0 ? ` (${active.length})` : ''}
        </button>
      </div>

      <div className="chips" role="group" aria-label="Filter by category">
        <button className={!category ? 'chip active' : 'chip'} onClick={() => update('category', '')}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className={category === c ? 'chip active' : 'chip'} onClick={() => update('category', c)}>
            {c}
          </button>
        ))}
      </div>

      <div id="filter-panel" className={filtersOpen ? 'filter-panel open' : 'filter-panel'}>
        <fieldset>
          <legend>Color</legend>
          <div className="swatches">
            {colorOptions.map((f) => (
              <button
                key={f.label}
                className={color === f.label ? 'swatch active' : 'swatch'}
                aria-pressed={color === f.label}
                onClick={() => update('color', color === f.label ? '' : f.label)}
              >
                <span className="swatch-dot" style={{ background: f.swatch }} aria-hidden="true" />
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Price</legend>
          <div className="chips compact">
            {PRICE_RANGES.map((r) => (
              <button
                key={r.key}
                className={price?.key === r.key ? 'chip active' : 'chip'}
                aria-pressed={price?.key === r.key}
                onClick={() => update('price', price?.key === r.key ? '' : r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>In stock in size</legend>
          <div className="chips compact">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                className={size === s ? 'chip active' : 'chip'}
                aria-pressed={size === s}
                onClick={() => update('size', size === s ? '' : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Collection</legend>
          <select
            className="chip-select"
            value={collection?.slug ?? ''}
            onChange={(e) => update('collection', e.target.value)}
            aria-label="Filter by collection"
          >
            <option value="">All collections</option>
            {COLLECTIONS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </fieldset>
      </div>

      {state.status === 'loading' && <StatusMessage kind="loading" message="Loading the catalogue…" />}
      {state.status === 'error' && <StatusMessage kind="error" message={state.error} onRetry={retry} />}
      {state.status === 'success' && (
        <>
          <div className="results-bar">
            <p className="result-count" aria-live="polite">
              Showing <strong>{visible.length}</strong> of {products.length} products
            </p>
            {active.length > 0 && (
              <div className="active-filters" aria-label="Active filters">
                {active.map((f) => (
                  <button key={f.key} className="active-pill" onClick={() => update(f.key, '')} aria-label={`Remove filter ${f.label}`}>
                    {f.label} <span aria-hidden="true">✕</span>
                  </button>
                ))}
                <button className="clear-filters" onClick={clearAll}>
                  Clear all
                </button>
              </div>
            )}
          </div>
          {visible.length > 0 ? (
            <ProductGrid products={visible} />
          ) : (
            <div className="empty-results" role="status">
              <p className="empty-title">No products match {active.length === 1 ? 'this filter' : 'these filters'}.</p>
              <p className="muted">
                Try removing a filter{rawQuery.trim() ? ' or checking the spelling' : ''}, or ask our chat assistant for help.
              </p>
              <div className="empty-actions">
                {active.map((f) => (
                  <button key={f.key} className="btn btn-outline" onClick={() => update(f.key, '')}>
                    Remove {f.key === 'q' ? f.label : `“${f.label}”`}
                  </button>
                ))}
                <button className="btn btn-primary" onClick={clearAll}>
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
