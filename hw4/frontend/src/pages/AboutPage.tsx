import { Link } from 'react-router-dom'
import { ArrowIcon, ChatIcon, PinIcon } from '../components/Icons'
import Reveal from '../components/Reveal'
import { fetchProducts } from '../lib/api'
import { openChat } from '../lib/chatBus'
import { useAsync } from '../lib/useAsync'

const VALUES = [
  {
    title: 'Made for the whole Yale family',
    text: 'Students, alumni, parents, grandparents, and fans all have a place here, from residential-college crewnecks to “Yale Dad” hoodies.',
  },
  {
    title: 'Every corner of campus',
    text: 'We carry gear for the residential colleges, the graduate and professional schools, and the varsity teams that make Saturdays loud.',
  },
  {
    title: 'Quality you’ll keep',
    text: 'Heavyweight fleece, soft tri-blends, and partner brands chosen to outlast a semester, then become the favorite you wear to reunion.',
  },
]

const AUDIENCES = [
  { title: 'For students', text: 'Your college crest, your team, your late-night library layer.', link: '/products?collection=residential-colleges', cta: 'Residential colleges' },
  { title: 'For families', text: 'Proud-parent pieces for move-in day, Family Weekend, and every care package.', link: '/products?collection=family', cta: 'For the family' },
  { title: 'For fans & alumni', text: 'Game Day gear and vintage bulldogs for the Bowl, the bar, and the reunion.', link: '/products?collection=sports', cta: 'Game Day & sports' },
]

// Real catalogue photos for the strip.
const STRIP_IDS = [
  'davenport-college-crewneck',
  'yale-mom-hoodie',
  'district-vit-hoodie-vintage-sailor-bulldog',
  'school-of-art-1-4-zip',
  'tri-blend-sports-hockey-t-shirt',
  'grace-hopper-college-crewneck',
]

export default function AboutPage() {
  const { state } = useAsync(fetchProducts, [])
  const strip =
    state.status === 'success'
      ? STRIP_IDS.map((id) => state.data.find((p) => p.product_id === id)).filter((p) => p !== undefined)
      : []

  return (
    <div className="about">
      <section className="about-hero">
        <p className="kicker">About Campus Customs</p>
        <h1>
          Outfitting Yale, <em>one Bulldog at a time.</em>
        </h1>
        <p className="lede">
          Campus Customs is a New Haven shop dedicated to Yale apparel. Whether you’re moving into Old Campus, cheering at
          the Bowl, or sending a care package from across the country, we make it easy to show where your heart is.
        </p>
      </section>

      {strip.length > 0 && (
        <div className="photo-strip" aria-label="A few pieces from the collection">
          {strip.map((p) => (
            <Link key={p.product_id} to={`/products/${p.product_id}`} className="strip-photo">
              <img src={p.image_url} alt={p.name} loading="lazy" />
            </Link>
          ))}
        </div>
      )}

      <Reveal as="section" className="about-split section">
        <div className="about-story">
          <p className="kicker">What we’re about</p>
          <h2>Yale gear should feel personal.</h2>
          <p>
            A generic logo tee is fine, but the shirt that names your college, your sport, your school, or your role as a
            proud parent tells a better story.
          </p>
          <p>
            That’s why our collection is organized around the communities that make up Yale: college crests and shields,
            team designs for everything from fencing to sailing, graduate school quarter-zips, vintage-inspired bulldogs,
            and pieces made for The Game.
          </p>
        </div>
        <aside className="about-card">
          <div className="cheetah-swatch" aria-hidden="true" />
          <p className="kicker">Visit the shop</p>
          <h3>
            <PinIcon width={20} height={20} /> 57 Broadway
          </h3>
          <p>New Haven, CT 06511 · just steps from campus.</p>
          <Link to="/products" className="btn btn-primary full">
            Shop online <ArrowIcon width={18} height={18} />
          </Link>
          <button className="btn btn-outline full" onClick={() => openChat()}>
            <ChatIcon width={18} height={18} /> Ask the shop assistant
          </button>
        </aside>
      </Reveal>

      <Reveal as="section" className="section-band values-band">
        <div className="section">
          <p className="kicker">What we care about</p>
          <div className="values">
            {VALUES.map((value, i) => (
              <article key={value.title} className="value-card">
                <span className="value-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="section">
        <div className="section-head">
          <div>
            <p className="kicker">Why it matters</p>
            <h2>Something for every corner of campus</h2>
          </div>
        </div>
        <div className="audience-grid">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.title} delay={i * 80}>
              <Link to={a.link} className="audience-card">
                <h3>{a.title}</h3>
                <p>{a.text}</p>
                <span className="text-link">
                  {a.cta} <ArrowIcon width={16} height={16} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </div>
  )
}
