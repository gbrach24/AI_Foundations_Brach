import { Link } from 'react-router-dom'
import CampusMap from '../components/CampusMap'
import { ArrowIcon, ChatIcon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import StatusMessage from '../components/StatusMessage'
import { fetchProducts } from '../lib/api'
import type { ProductSummary } from '../lib/api'
import { openChat } from '../lib/chatBus'
import { COLLECTIONS } from '../lib/collections'
import { CATEGORIES, categoryOf, formatPrice, shortDescription } from '../lib/format'
import { useAsync } from '../lib/useAsync'

// Editorial picks: real product_ids from the catalogue table.
const HERO_IDS = ['basic-hoodie-big-yale', '2025-yale-vs-harvard-t-shirt', 'district-vit-crewneck-vintage-bulldog']
const EDIT_IDS = [
  'brooks-brothers-double-knit-full-zip-hoodie-yale',
  'boola-boola-t-shirt',
  'super-heavyweight-crewneck-arched-yale-crest',
  'saybrook-sweater-fleece-jacket',
  'yale-law-school-1-4-zip',
]
const PROMPTS = ['Help me find a hoodie', 'What would you recommend as a gift?', 'Show me Yale favorites', 'What do you have in stock?']
const SPORTS = ['baseball', 'basketball', 'football', 'hockey', 'soccer', 'tennis', 'track', 'golf', 'diving', 'swimming', 'volleyball', 'lacrosse', 'fencing', 'sailing', 'squash']

const byIds = (products: ProductSummary[], ids: string[]) =>
  ids.map((id) => products.find((p) => p.product_id === id)).filter((p): p is ProductSummary => !!p)

/** The best-stocked product in a category, used as that category's cover photo. */
function coverFor(products: ProductSummary[], category: string) {
  return products
    .filter((p) => categoryOf(p.garment_type) === category)
    .sort((a, b) => b.in_stock_sizes.length - a.in_stock_sizes.length || b.total_stock - a.total_stock)[0]
}

function giftPicks(products: ProductSummary[]) {
  const picks: ProductSummary[] = []
  const used = new Set<string>()
  const pool = products
    .filter((p) => p.price <= 60 && p.in_stock_sizes.length >= 5)
    .sort((a, b) => b.in_stock_sizes.length - a.in_stock_sizes.length || a.price - b.price || a.name.localeCompare(b.name))
  for (const p of pool) {
    const cat = categoryOf(p.garment_type)
    if (used.has(cat) && picks.length < 4) continue
    picks.push(p)
    used.add(cat)
    if (picks.length === 6) break
  }
  return picks
}

export default function HomePage() {
  const { state, retry } = useAsync(fetchProducts, [])
  const products = state.status === 'success' ? state.data : []
  const hero = byIds(products, HERO_IDS)
  const edit = byIds(products, EDIT_IDS)
  const residential = COLLECTIONS.find((c) => c.slug === 'residential-colleges')!
  const collegesRepresented = residential.nameKeywords.filter((k) => products.some((p) => p.name.toLowerCase().includes(k))).length
  const sportsRepresented = SPORTS.filter((s) => products.some((p) => p.name.toLowerCase().includes(s))).length

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero-v2">
        <div className="hero-v2-copy">
          <p className="kicker">Est. on Broadway · New Haven, CT</p>
          <h1>
            Wear the whole <em>campus.</em>
          </h1>
          <p className="hero-lede">
            Hoodies, crewnecks, and tees for every corner of Yale: your college, your team, your school, and the
            family cheering you on.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary btn-lg">
              Shop the collection <ArrowIcon width={18} height={18} />
            </Link>
            <button className="btn btn-quiet btn-lg" onClick={() => openChat()}>
              <ChatIcon width={18} height={18} /> Ask the shop assistant
            </button>
          </div>
          {products.length > 0 && (
            <ul className="hero-facts" aria-label="Store facts">
              <li>
                <strong>{products.length}</strong> designs
              </li>
              <li>
                <strong>XS–XXL</strong> live stock
              </li>
              <li>
                <strong>{collegesRepresented}</strong> residential colleges
              </li>
            </ul>
          )}
        </div>

        <div className="hero-v2-art" aria-label="Featured products">
          <div className="hero-cheetah" aria-hidden="true" />
          {hero.map((p, i) => (
            <Link key={p.product_id} to={`/products/${p.product_id}`} className={`polaroid polaroid-${i + 1}`}>
              <img src={p.image_url} alt={p.name} />
              <span className="polaroid-caption">
                <span>{p.name}</span>
                <strong>{formatPrice(p.price)}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Marquee ---------- */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              Residential Colleges <i>✦</i> Game Day <i>✦</i> Graduate Schools <i>✦</i> Proud Families <i>✦</i> Vintage
              Bulldogs <i>✦</i> The Game <i>✦</i> Boola Boola <i>✦</i>{' '}
            </span>
          ))}
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="section">
          <StatusMessage kind="loading" message="Unpacking the new arrivals…" />
        </div>
      )}
      {state.status === 'error' && (
        <div className="section">
          <StatusMessage kind="error" message={state.error} onRetry={retry} />
        </div>
      )}

      {state.status === 'success' && (
        <>
          {/* ---------- Categories ---------- */}
          <Reveal as="section" className="section">
            <div className="section-head">
              <div>
                <p className="kicker">Shop by style</p>
                <h2>Find your fit</h2>
              </div>
              <Link to="/products" className="text-link">
                All {products.length} products <ArrowIcon width={16} height={16} />
              </Link>
            </div>
            <div className="category-row">
              {CATEGORIES.map((category, i) => {
                const cover = coverFor(products, category)
                const count = products.filter((p) => categoryOf(p.garment_type) === category).length
                return (
                  <Reveal key={category} delay={i * 60}>
                    <Link to={`/products?category=${encodeURIComponent(category)}`} className="category-tile">
                      {cover && <img src={cover.image_url} alt="" loading="lazy" />}
                      <span className="category-label">
                        {category}
                        <small>{count} styles</small>
                      </span>
                    </Link>
                  </Reveal>
                )
              })}
            </div>
          </Reveal>

          {/* ---------- The Campus Edit (editorial) ---------- */}
          {edit.length > 0 && (
            <Reveal as="section" className="section campus-edit">
              <div className="edit-head">
                <span className="edit-issue">No. 01</span>
                <div>
                  <p className="kicker">The Campus Edit</p>
                  <h2>
                    Five pieces we’d wear <em>from first class to last call.</em>
                  </h2>
                </div>
              </div>
              <div className="edit-grid">
                <Link to={`/products/${edit[0].product_id}`} className="edit-feature">
                  <img src={edit[0].image_url} alt={edit[0].name} loading="lazy" />
                  <span className="edit-caption">
                    <span className="kicker">Editor’s pick</span>
                    <strong>{edit[0].name}</strong>
                    <span>{shortDescription(edit[0].description, 90)}</span>
                    <span className="edit-price">{formatPrice(edit[0].price)}</span>
                  </span>
                </Link>
                <div className="edit-list">
                  {edit.slice(1).map((p) => (
                    <ProductCard key={p.product_id} product={p} />
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* ---------- Shop the Campus (creative concept) ---------- */}
          <Reveal as="section" className="section-band map-band" id="shop-the-campus">
            <div className="section">
              <div className="section-head">
                <div>
                  <p className="kicker">Shop the Campus</p>
                  <h2>Pick a spot. We’ll dress you for it.</h2>
                  <p className="muted">
                    Tap a pin on the map to see what everyone’s wearing there, pulled live from our in-stock catalogue.
                  </p>
                </div>
              </div>
              <CampusMap products={products} />
            </div>
          </Reveal>

          {/* ---------- Giftable picks ---------- */}
          <Reveal as="section" className="section">
            <div className="section-head">
              <div>
                <p className="kicker">Giftable picks</p>
                <h2>Under $60, and in almost every size</h2>
              </div>
              <Link to="/products?price=40-60" className="text-link">
                Shop $40–$60 <ArrowIcon width={16} height={16} />
              </Link>
            </div>
            <div className="scroll-row">
              {giftPicks(products).map((p) => (
                <ProductCard key={p.product_id} product={p} />
              ))}
            </div>
          </Reveal>

          {/* ---------- Brand story ---------- */}
          <Reveal as="section" className="section-band story-band">
            <div className="section story-grid">
              <blockquote className="story-quote">
                “Campus pride is personal. It’s <em>your</em> college, <em>your</em> team, <em>your</em> kid’s name on
                the move-in list.”
              </blockquote>
              <div className="story-side">
                <p>
                  Campus Customs is a New Haven shop built around the communities that make up Yale. Instead of one logo
                  on everything, we make the shirt that tells your story.
                </p>
                <ul className="stat-row">
                  <li>
                    <strong>{collegesRepresented}</strong>
                    <span>residential colleges</span>
                  </li>
                  <li>
                    <strong>{sportsRepresented}</strong>
                    <span>varsity sports</span>
                  </li>
                  <li>
                    <strong>{products.length}</strong>
                    <span>designs in stock</span>
                  </li>
                </ul>
                <Link to="/about" className="btn btn-light">
                  Read our story <ArrowIcon width={18} height={18} />
                </Link>
              </div>
            </div>
          </Reveal>
        </>
      )}

      {/* ---------- Assistant CTA ---------- */}
      <Reveal as="section" className="section assistant-cta">
        <div className="assistant-card">
          <div>
            <p className="kicker">Personal shopper</p>
            <h2>Not sure where to start?</h2>
            <p className="muted">
              Our shop assistant knows every product, price, and size in stock. Ask it anything, or try one of these.
            </p>
          </div>
          <div className="prompt-chips">
            {PROMPTS.map((prompt) => (
              <button key={prompt} className="prompt-chip" onClick={() => openChat(prompt)}>
                {prompt} <ArrowIcon width={14} height={14} />
              </button>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
