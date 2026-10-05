# Campus Customs Design

## 1. Visual Identity
**What changed:**
- **Type:** three fonts in clear roles, bundled with the app (`@fontsource`), so they load without a CDN:
  - **Fraunces** (editorial serif, with italic accents) for headlines and prices;
  - **Instrument Sans** for body and UI text;
  - **Graduate** (varsity block letters) for small kickers like "SHOP BY STYLE".
- **Color:** a token palette (`:root` in `index.css`): Bulldog navy, Old-Campus stone background, brass accent, and **cheetah print as the house signature** on the announcement bar, chat launcher, stamps, and accents.
- **Brand mark:** a "CC" shield monogram used in the navbar, chat, footer, and favicon.
- **Shared tokens:** radius, shadow, button, and motion tokens shared by every page.

**Why it helps:** Shoppers decide in seconds whether a store is legitimate. A consistent, ownable look (rather than a default template) builds trust, and a consistent hierarchy means price, name, and CTA always appear in the same places, so less effort is spent reading and more on choosing.

## 2. Homepage
**What changed:**
- **Hero:** an editorial headline ("Wear the whole *campus.*"), a primary **Shop the collection** CTA plus **Ask the shop assistant**, and live store facts (102 designs, XS–XXL, 11 residential colleges, all computed from the catalogue). It sits beside three real products as tilted polaroids with prices, floating gently over a cheetah backdrop.
- **Marquee and categories:** a scrolling collections marquee, then **Shop by style** tiles that use real product photos and counts.
- **The Campus Edit:** a magazine-style issue ("No. 01"): one large editor's pick plus four cards.
- **Shop the Campus:** the interactive map (see §6).
- **Giftable picks:** an in-stock row of items under $60 available in 5+ sizes.
- **Brand story:** a navy band with a pull quote and real stats.
- **Personal shopper card:** one-tap chat prompts.

**Why it helps:** The first screen answers "what is this, what can I buy, where do I start" in one glance. The sections that follow give several paths in (by style, by curated look, by campus moment, by budget), so shoppers find a relevant product before they lose interest.

## 3. Product Presentation
**What changed:**
- **Cards:** one `ProductCard` everywhere, with a 4:5 photo, category, name, two-line description, Fraunces price, and color dots taken from catalogue colors. A "Few sizes left" or "Sold out" badge comes from live inventory. On hover the photo zooms, the card lifts, and a **View details →** CTA slides up.
- **Product page:**
  - a large image with a **cursor-following magnifier**;
  - a prominent price beside an "In stock · 5 of 6 sizes" pill;
  - color swatches, the stock-aware size grid, quantity, and **Add to bag**;
  - an **"Questions about this item?"** button that opens the assistant (which already knows the product);
  - a product-details panel with clickable tags;
  - **"You might also like"**: 4 in-stock items from the same category, ranked by shared tags;
  - a shimmer skeleton while loading.
- **Other pages:** About is an editorial brand story (oversized headline, a strip of real product photos, numbered values on navy, audience cards). Log in and Create account use a split layout with a brand panel. The Bag and Products pages share the same tokens.

**Why it helps:** The product page answers what it is, what it costs, which options are available, whether you can buy it, and what else to consider, top to bottom. That removes the main reasons shoppers hesitate, and related items keep them browsing instead of bouncing.

## 4. Chat Experience
**What changed:**
- **Launcher:** a branded "Ask the shop" pill with a cheetah-print ring.
- **Panel:** a navy "Shop Assistant" header with the monogram, a live-status dot, and a signed-in or guest status line. The panel springs open from the corner and fades closed (and is inert while hidden).
- **Messages:** branded bubbles and a navy/brass typing indicator.
- **Starter prompts:** on a fresh chat, "Help me find a hoodie", "What would you recommend as a gift?", "Show me Yale favorites", and "What do you have in stock?". On a product page they become "What sizes is this in stock in?" and "Does this come in other colors?".
- **Product cards:** results use the same `ProductCard` as the store.
- **Open from anywhere:** any page can open the chat with a prompt (Home chips, the product page button, the footer link) through a small chat bus.

**Why it helps:** Most shoppers don't know what to type. One-tap prompts turn the assistant from a blank box into a guided shopping path, and storefront-matching cards make chat results feel like part of the shop, so they're clicked and bought rather than ignored.

## 5. Motion & Interaction
**What changed:**
- **Scrolling:** sections reveal gently on scroll (`Reveal`, IntersectionObserver), and each page fades in on navigation.
- **Header:** it condenses after scrolling (the announcement bar tucks away and a shadow appears), and nav links get a brass underline that grows on hover or when active.
- **Feedback:** buttons lift on hover and press in on click. The bag badge **bumps** when an item is added, filter pills pop in, and the map postcard flips in when a pin changes.
- **Restraint:** animations stay at 160–600 ms, and everything (including the marquee and floating polaroids) is disabled under `prefers-reduced-motion`.

**Why it helps:** Motion confirms actions ("it's in your bag") and directs attention to what changed, which reduces uncertainty without slowing anyone down.

## 6. Creative Concept: "Shop the Campus"
**What changed:** An illustrated campus map (SVG: the Bowl, the stacks, college courtyards, Old Campus, Chapel Street) with five numbered pins for **campus moments**:
1. Game Day at the Bowl;
2. Study Session in the stacks;
3. College Pride in the courtyards;
4. Family Weekend on Old Campus;
5. Weekend Wander on Chapel Street.

Choosing a pin or tab opens a **postcard**, with a cheetah stamp, the place and time, and a blurb, showing four **real, in-stock products** for that moment. They're picked live from the catalogue by keyword rules, with variety across categories and best size availability first, plus a link to the full filtered list. The pins are keyboard-accessible buttons, mirrored by labeled tabs on mobile.

**Why it helps:** People buy Yale gear for a *moment* (The Game, Family Weekend, finals week), not by SKU category. Organizing products around those moments matches how shoppers think and creates a memorable, Campus-Customs-only way to browse that pulls people deeper into the catalogue.
