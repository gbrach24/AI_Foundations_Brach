import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProductSummary } from '../lib/api'
import { MOMENTS, picksFor } from '../lib/moments'
import { ArrowIcon } from './Icons'
import ProductCard from './ProductCard'

/** Stylized, illustrated campus. Decorative only; the pins are real buttons layered on top. */
function MapArt() {
  return (
    <svg className="map-art" viewBox="0 0 600 420" role="img" aria-label="Illustrated map of campus">
      <defs>
        <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0v24" fill="none" stroke="var(--map-grid)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="600" height="420" fill="var(--map-paper)" />
      <rect width="600" height="420" fill="url(#map-grid)" />
      {/* streets */}
      <g stroke="var(--map-street)" strokeWidth="14" strokeLinecap="round" fill="none">
        <path d="M-10 120 H610" />
        <path d="M-10 300 H610" />
        <path d="M160 -10 V430" />
        <path d="M410 -10 V430" />
        <path d="M410 300 L610 395" />
      </g>
      <g fill="var(--map-street-label)" fontFamily="var(--sans)" fontSize="10" letterSpacing="2.5" fontWeight="600">
        <text x="20" y="116">ELM STREET</text>
        <text x="430" y="296">CHAPEL STREET</text>
        <text x="152" y="200" transform="rotate(-90 152 200)">COLLEGE ST</text>
      </g>
      {/* Bowl */}
      <ellipse cx="88" cy="345" rx="70" ry="44" fill="var(--map-green)" stroke="var(--map-ink)" strokeWidth="2" />
      <ellipse cx="88" cy="345" rx="46" ry="24" fill="var(--map-field)" stroke="var(--map-ink)" strokeWidth="1.5" />
      <path d="M58 345h60M88 325v40" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
      {/* Library with tower */}
      <rect x="222" y="34" width="120" height="66" rx="4" fill="var(--map-building)" stroke="var(--map-ink)" strokeWidth="2" />
      <path d="M270 34 L282 10 L294 34Z" fill="var(--map-ink)" />
      <rect x="276" y="18" width="12" height="16" fill="var(--map-ink)" />
      {/* Residential college courtyards */}
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={440 + i * 78} y="28" width="64" height="70" rx="4" fill="var(--map-building)" stroke="var(--map-ink)" strokeWidth="2" />
          <rect x={452 + i * 78} y="42" width="40" height="42" rx="3" fill="var(--map-green)" />
        </g>
      ))}
      <rect x="440" y="150" width="142" height="110" rx="4" fill="var(--map-building)" stroke="var(--map-ink)" strokeWidth="2" />
      <rect x="456" y="166" width="110" height="78" rx="3" fill="var(--map-green)" />
      {/* Old Campus quad */}
      <rect x="192" y="150" width="196" height="122" rx="6" fill="var(--map-green)" stroke="var(--map-ink)" strokeWidth="2" />
      <path d="M192 150 L388 272 M388 150 L192 272" stroke="var(--map-path)" strokeWidth="5" />
      <circle cx="290" cy="211" r="12" fill="var(--map-paper)" stroke="var(--map-ink)" strokeWidth="1.5" />
      {/* trees */}
      <g fill="var(--map-tree)">
        {[
          [205, 165], [372, 165], [205, 258], [372, 258], [36, 40], [70, 60], [40, 200], [100, 230], [520, 330], [560, 360],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="9" />
        ))}
      </g>
      {/* shops on Chapel */}
      {[440, 478, 516, 554].map((x, i) => (
        <rect key={x} x={x} y={324 + i * 8} width="30" height="34" rx="3" fill="var(--map-shop)" stroke="var(--map-ink)" strokeWidth="1.5" />
      ))}
      {/* compass */}
      <g transform="translate(556 52)" fill="none" stroke="var(--map-ink)" strokeWidth="1.5">
        <circle r="18" />
        <path d="M0 -14 L5 0 L0 14 L-5 0Z" fill="var(--map-ink)" />
        <text y="-22" textAnchor="middle" fontSize="10" fill="var(--map-ink)" stroke="none" fontWeight="700">N</text>
      </g>
    </svg>
  )
}

/** "Shop the Campus": pick a campus moment on the map to see real, in-stock products for it. */
export default function CampusMap({ products }: { products: ProductSummary[] }) {
  const [activeId, setActiveId] = useState(MOMENTS[0].id)
  const active = MOMENTS.find((m) => m.id === activeId) ?? MOMENTS[0]
  const picks = picksFor(active, products)
  const index = MOMENTS.indexOf(active)

  return (
    <div className="campus-map">
      <div className="map-frame">
        <MapArt />
        {MOMENTS.map((m, i) => (
          <button
            key={m.id}
            className={m.id === active.id ? 'map-pin active' : 'map-pin'}
            style={{ left: `${m.pin.x}%`, top: `${m.pin.y}%` }}
            onClick={() => setActiveId(m.id)}
            aria-pressed={m.id === active.id}
            aria-label={`${m.title} at ${m.place}`}
          >
            <span className="pin-number">
              <span>{i + 1}</span>
            </span>
            <span className="pin-label">{m.place}</span>
          </button>
        ))}
      </div>

      <div className="moment-tabs" role="group" aria-label="Campus moments">
        {MOMENTS.map((m, i) => (
          <button
            key={m.id}
            className={m.id === active.id ? 'moment-tab active' : 'moment-tab'}
            onClick={() => setActiveId(m.id)}
            aria-pressed={m.id === active.id}
          >
            <span className="tab-num">{String(i + 1).padStart(2, '0')}</span> {m.title}
          </button>
        ))}
      </div>

      {/* Keyed by moment so the postcard replays its entrance when the pin changes. */}
      <article key={active.id} className="postcard" aria-live="polite">
        <div className="postcard-stamp" aria-hidden="true">
          <span>No. {String(index + 1).padStart(2, '0')}</span>
        </div>
        <p className="eyebrow">
          {active.place} · {active.when}
        </p>
        <h3>{active.title}</h3>
        <p className="postcard-blurb">{active.blurb}</p>
        {picks.length > 0 ? (
          <div className="postcard-products">
            {picks.map((p) => (
              <ProductCard key={p.product_id} product={p} variant="compact" />
            ))}
          </div>
        ) : (
          <p className="muted">These picks are restocking. Check back soon.</p>
        )}
        <Link to={active.shopLink} className="text-link">
          Shop more for {active.title} <ArrowIcon width={16} height={16} />
        </Link>
      </article>
    </div>
  )
}
