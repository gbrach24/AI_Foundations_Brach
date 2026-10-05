import type { AuthUser } from './api'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatPrice(price: number): string {
  return currency.format(price)
}

/** First sentence of a description, for compact product cards. */
export function shortDescription(text: string, maxLength = 110): string {
  const firstSentence = text.split(/(?<=\.)\s/)[0]
  if (firstSentence.length <= maxLength) return firstSentence
  return firstSentence.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}

// catalogue.garment_type has 22 inconsistent spellings (see output/harness.md),
// so shopper-facing categories are derived by keyword.
export const CATEGORIES = ['Hoodies', 'Crewnecks', 'Quarter-Zips', 'Tees & Tops', 'Jackets & Fleece'] as const
export type Category = (typeof CATEGORIES)[number]

export function categoryOf(garmentType: string): Category {
  const t = garmentType.toLowerCase()
  if (t.includes('hood')) return 'Hoodies'
  if (t.includes('quarter-zip')) return 'Quarter-Zips'
  if (t.includes('jacket') || t.includes('fleece')) return 'Jackets & Fleece'
  if (t.includes('shirt') && !t.includes('sweatshirt')) return 'Tees & Tops'
  return 'Crewnecks'
}

export function stockLabel(quantity: number): { text: string; tone: 'out' | 'low' | 'ok' } {
  if (quantity <= 0) return { text: 'Sold out', tone: 'out' }
  if (quantity <= 5) return { text: `Only ${quantity} left`, tone: 'low' }
  return { text: `${quantity} in stock`, tone: 'ok' }
}

/** Friendly first name for greetings, falling back to the full name or email. */
export function displayName(user: AuthUser): string {
  return user.first_name || user.name.split(' ')[0] || user.email
}

// ---------- Products page filters (Problem 9) ----------

/** Color families shoppers think in, mapped from the catalogue's color names. */
export const COLOR_FAMILIES: { label: string; swatch: string; matches: (c: string) => boolean }[] = [
  { label: 'Navy', swatch: '#1b2a4a', matches: (c) => c.includes('navy') },
  { label: 'Blue', swatch: '#3b73c4', matches: (c) => c.includes('blue') && !c.includes('navy') },
  { label: 'Gray', swatch: '#9aa0a6', matches: (c) => c.includes('gray') || c.includes('grey') || c.includes('charcoal') },
  { label: 'White & Cream', swatch: '#f7f3ea', matches: (c) => ['white', 'cream', 'ivory'].some((w) => c.includes(w)) },
  { label: 'Black', swatch: '#111', matches: (c) => c.includes('black') },
  { label: 'Red', swatch: '#b4232f', matches: (c) => c.includes('red') || c.includes('crimson') },
  { label: 'Yellow & Gold', swatch: '#e2b33a', matches: (c) => c.includes('yellow') || c.includes('gold') },
  { label: 'Green', swatch: '#2f7d4f', matches: (c) => c.includes('green') },
  { label: 'Coral & Pink', swatch: '#e9877a', matches: (c) => c.includes('coral') || c.includes('pink') },
]

export function hasColorFamily(colors: string[], family: string): boolean {
  const f = COLOR_FAMILIES.find((cf) => cf.label === family)
  return !!f && colors.some((c) => f.matches(c.toLowerCase()))
}

export const PRICE_RANGES: { key: string; label: string; min: number; max: number }[] = [
  { key: 'under-40', label: 'Under $40', min: 0, max: 39.99 },
  { key: '40-60', label: '$40–$60', min: 40, max: 60 },
  { key: '60-80', label: '$60–$80', min: 60.01, max: 80 },
  { key: '80-plus', label: '$80+', min: 80.01, max: Infinity },
]

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

