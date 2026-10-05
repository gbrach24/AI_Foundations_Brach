// Storefront collections, matched against catalogue.name. Search tags are too
// broad for this (e.g. "college apparel" appears on 48 of 102 products).

export interface Collection {
  slug: string
  title: string
  blurb: string
  nameKeywords: string[]
}

export const COLLECTIONS: Collection[] = [
  {
    slug: 'residential-colleges',
    title: 'Residential Colleges',
    blurb: 'Rep Davenport, Saybrook, Grace Hopper, and more.',
    nameKeywords: [
      'benjamin franklin', 'berkeley', 'branford', 'davenport', 'ezra stiles', 'grace hopper',
      'jonathan edwards', 'morse', 'pauli murray', 'pierson', 'saybrook', 'silliman',
      'timothy dwight', 'trumbull',
    ],
  },
  {
    slug: 'sports',
    title: 'Game Day & Sports',
    blurb: 'From the Bowl to the boathouse.',
    nameKeywords: [
      'sports', 'baseball', 'basketball', 'football', 'hockey', 'soccer', 'tennis', 'track',
      'golf', 'diving', 'swimming', 'volleyball', 'lacrosse', 'fencing', 'sailing', 'squash',
      'crew left chest', 'yale vs harvard', 'yale bowl', 'gameday',
    ],
  },
  {
    slug: 'family',
    title: 'For the Family',
    blurb: 'Gear for proud moms, dads, and grandparents.',
    nameKeywords: ['yale mom', 'yale dad', 'yale grandma', 'yale grandpa', 'yale aunt', 'yale uncle', 'yale brother', 'yale cousin'],
  },
  {
    slug: 'graduate-schools',
    title: 'Graduate Schools',
    blurb: 'Law, Art, Music, Medicine, and beyond.',
    nameKeywords: ['school of', 'law school', 'divinity school', 'forest school'],
  },
]

export function findCollection(slug: string | null): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug)
}

export function inCollection(productName: string, collection: Collection): boolean {
  const name = productName.toLowerCase()
  return collection.nameKeywords.some((keyword) => name.includes(keyword))
}
