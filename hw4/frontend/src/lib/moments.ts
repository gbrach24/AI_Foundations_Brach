// "Shop the Campus": products grouped by campus moments. Products are picked from
// the live catalogue by keyword rules (like collections.ts), never hard-coded.
import type { ProductSummary } from './api'
import { COLLECTIONS, inCollection } from './collections'
import { categoryOf } from './format'

export interface CampusMoment {
  id: string
  place: string
  title: string
  when: string
  blurb: string
  /** Pin position on the map, in % of the map's width/height. */
  pin: { x: number; y: number }
  shopLink: string
  matches: (p: ProductSummary) => boolean
}

const collection = (slug: string) => COLLECTIONS.find((c) => c.slug === slug)!
const nameHas = (p: ProductSummary, words: string[]) => words.some((w) => p.name.toLowerCase().includes(w))

export const MOMENTS: CampusMoment[] = [
  {
    id: 'game-day',
    place: 'The Bowl',
    title: 'Game Day',
    when: 'Saturday · Kickoff at noon',
    blurb: 'Loud, proud, and layered for a cold kickoff, from The Game tee to team hoodies.',
    pin: { x: 17, y: 74 },
    shopLink: '/products?collection=sports',
    matches: (p) => nameHas(p, ['yale vs harvard', 'yale bowl', 'gameday', 'football', 'sports hoodie']),
  },
  {
    id: 'study',
    place: 'The Stacks',
    title: 'Study Session',
    when: 'Tuesday · 10:30 PM',
    blurb: 'Quarter-zips and fleece warm enough for the long nights before finals.',
    pin: { x: 47, y: 22 },
    shopLink: '/products?category=Quarter-Zips',
    matches: (p) => ['Quarter-Zips', 'Jackets & Fleece'].includes(categoryOf(p.garment_type)),
  },
  {
    id: 'college',
    place: 'College Courtyards',
    title: 'College Pride',
    when: 'Every day, all year',
    blurb: 'Crests, shields, and logos for the residential college you call home.',
    pin: { x: 78, y: 30 },
    shopLink: '/products?collection=residential-colleges',
    matches: (p) => inCollection(p.name, collection('residential-colleges')),
  },
  {
    id: 'family',
    place: 'Old Campus',
    title: 'Family Weekend',
    when: 'October · All weekend',
    blurb: 'Gifts for the proud moms, dads, and grandparents cheering from the quad.',
    pin: { x: 50, y: 58 },
    shopLink: '/products?collection=family',
    matches: (p) => inCollection(p.name, collection('family')),
  },
  {
    id: 'weekend',
    place: 'Chapel Street',
    title: 'Weekend Wander',
    when: 'Sunday · Brunch o’clock',
    blurb: 'Vintage bulldogs and soft tri-blends for slow Sundays around town.',
    pin: { x: 82, y: 78 },
    shopLink: '/products?q=vintage',
    matches: (p) => nameHas(p, ['vintage', 'tri blend t shirt', 'boola', 'big yale', 'offside']),
  },
]

/** Up to `limit` in-stock picks for a moment: widest size availability first, varied categories. */
export function picksFor(moment: CampusMoment, products: ProductSummary[], limit = 4): ProductSummary[] {
  const candidates = products
    .filter((p) => p.total_stock > 0 && moment.matches(p))
    .sort((a, b) => b.in_stock_sizes.length - a.in_stock_sizes.length || b.total_stock - a.total_stock || a.name.localeCompare(b.name))
  const picked: ProductSummary[] = []
  const seen = new Set<string>()
  for (const p of candidates) {
    const cat = categoryOf(p.garment_type)
    if (!seen.has(cat)) {
      picked.push(p)
      seen.add(cat)
    }
    if (picked.length === limit) return picked
  }
  for (const p of candidates) {
    if (picked.length === limit) break
    if (!picked.includes(p)) picked.push(p)
  }
  return picked
}
