# Ram Rang

A storefront for a hand-block-printed apparel and home-textiles brand: 80 products across dresses,
co-ords, kurtas, kaftans, bedsheets, home and gifts, with cart, wishlist, coupons, four currencies
and a multi-step checkout — plus a shop-owner panel that edits the live catalogue.

Built with React 19, Vite, TypeScript and Tailwind CSS v4. Catalogue data and the owner's edits live
in a Qoder Sites Edge Function (`functions/`) backed by platform Storage; the browser talks to it
through one same-origin endpoint.

> **Demo flows.** Customer sign-in accepts any email and password, card / UPI / 1-tap / cash-on-delivery
> payments are simulated, and parcel tracking shows invented shipment stages. No money moves and no
> email or SMS is sent; each of those screens says so in the UI. The **owner panel is not a demo** — it
> writes real data, and only the signed-in Qoder account that claimed the shop can write it.

## Quick start

**No commands.** Install [Node.js](https://nodejs.org) once, then double-click **`Open Ram Rang.bat`**.
It serves the built site in `dist/` at http://localhost:8080, opens the browser, and runs the shop
handler in the same window so prices, stock and picture edits work locally. Those local edits live in
memory and reset when the window closes — the published site keeps its own data.

**Or from the command line:**

```bash
npm install
npm run dev        # http://localhost:3000 (proxies the shop service from `npm run shop:local`)
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | `tsc --noEmit` type check |
| `npm run shop:local` | Runs `functions/handler.mjs` on 127.0.0.1:8000 against an in-memory bucket |
| `npm run shop:check` | Direct request-level checks of the handler (authorisation, CAS, uploads) |

## Project layout

```
src/
  App.tsx                 central state: page, catalogue, cart, wishlist, currency, filters, session
  shop/                   the shop contract: API client, image-reference rules, product parsing
  components/             storefront screens and overlays (drawers, checkout, modals)
    home/                 the Home page, including the animated exhibition board
    owner/                the shop-owner panel: editor form, image picker, validation
  data/products.ts        the starter catalogue, currencies, filter vocabularies, shipping rules
  hooks/useParallax.ts    scroll drift used by the two large photographs
  utils/                  price formatting, overlay behaviour, image fallbacks
functions/                the deployed Edge Function: index.ts entry, handler.mjs routes, auth.mjs
dev/                      local-only shop host, in-memory Storage fake and handler checks
public/                   favicon and social preview image
dist/                     committed production build
```

## The three surfaces

- **Home (`#home`)** — the house: how the cloth is made, the fabrics, care, promises. Its exhibition
  board reads the live catalogue and auto-advances through up to five featured pieces (bestsellers,
  new in, reduced, then top-rated), skipping anything sold out. It pauses on hover, focus or when the
  tab is hidden, answers arrow keys, and falls back to plain switching under "show fewer animations".
- **Clothing (`#clothing`)** — the shop: category shelves, filters, sort, the product grid and checkout.
- **Owner panel (`#owner`, also "Shop Owner Panel" in the footer)** — sign in with your Qoder account,
  claim the shop on first use, then edit price and sale price, replace a picture (studio photo or your
  own upload), change stock per size, add a piece, or retire one. Every save is shown as saved,
  in-progress or failed — never silently ignored.

The home-textile category is stored as `Home` but displayed as **Home & Living** (`categoryLabel` in
`src/data/products.ts`) so it cannot be confused with the Home page.

## Where the shop data lives

The Function exposes one endpoint, `/functions/v1/app`, with an `action` per operation: reads are
`catalogue`, `image` and `session`; writes are `owner.claim`, `product.save`, `product.create`,
`product.retire`, `image.upload` and `catalogue.seed`. Products carry an image *reference*, not a
public bucket path: `bundled:<key>` for the ten studio photos, `shop:<uuid>.<ext>` for owner uploads
(served through the Function so the storage path is never public), or an https link.

Writes compare a revision number first, so two open tabs cannot silently overwrite each other, and the
client reads the saved document back before it reports success. A write whose answer was lost is
re-read, never replayed.

If the shop service is unreachable, the storefront falls back to the catalogue baked into the build and
the owner panel says so plainly instead of pretending to save.

## How the storefront behaves

- **Persistence** — the bag stores product ids, size, colour and quantity only, never prices; on every
  load it is rebuilt from the live catalogue and clamped to current stock. Wishlist, chosen currency,
  coupon and gift wrap survive a reload under `clotex_state_v1`. Stored state is shape-checked: unknown
  currencies, coupons, image links and extra personal fields are dropped.
- **Stock** — each size carries its own stock count; quantity steppers clamp to it and disable when
  reached. Out-of-stock sizes are unclickable.
- **Money** — totals are computed from server-side catalogue prices (`CURRENCY_CONFIGS`: USD, INR, EUR,
  GBP). Free express shipping starts at a USD 120 subtotal (`FREE_SHIPPING_THRESHOLD_USD`), otherwise a
  flat courier fee applies; both the banner and the checkout copy derive from those constants.
- **Coupons** — `RAMRASS10` and `WELCOME15`, checked against that list rather than trusted from storage.
- **Accessibility** — overlays respond to Escape, close on backdrop click, lock background scroll,
  expose `role="dialog"` / `aria-modal`, and move focus into the panel. Product actions are visible on
  touch devices rather than hover-only. The owner panel is keyboard-operable and announces save results.

## Security notes

What the current build enforces, and what was fixed during the audit:

- Owner writes are authorised by the platform-injected account context, not by a cookie or a browser
  flag; the deployed entry point has no way for a caller to name itself as the owner. A signed-in
  account that is not the claiming owner gets a refusal, not an editor.
- The bucket is never public. Uploads go through the Function, are checked by size, declared type and
  actual bytes, are stored under a generated uuid name, and are only served while a published product
  still references them.
- Prices, discounts, stock and coupon validity are read from the shop document at checkout; anything
  previously copied into the browser's storage is discarded.
- Image references go through an allowlist (`bundled:` / `shop:` / https), so no `javascript:` or
  attacker-chosen URL reaches an `<img>`.
- Concurrent edits are rejected by revision check instead of silently clobbering the shop document.
- Personal details typed at checkout are not written to long-lived browser storage.
- The demo sign-in, payment and tracking screens no longer claim security they do not provide (no
  "SSL secured", "PCI compliant" or "verified payment gateway" wording).

Still open by design: the fake customer login is fake (it is labelled, and it is not how the owner
panel authorises anything), and the storefront has no real payment provider.

## Deploying

This project publishes as a Qoder Sites capability site: `dist/` for the static files and `functions/`
for the `app` Edge Function, prepared and published through the Qoder Sites tooling. The live shop is
at `https://clotex-shop-hqvgicd48zq.qoder.website` and is publicly readable. The owner panel at
`/#owner` is reachable by any visitor too, but it is unclaimed until an account presses "Claim this
shop" — the first one becomes the owner and every other account is refused by the Function afterwards,
so claim it before promoting the address.

For a plain static host (GitHub Pages, Netlify, Vercel) `dist/` works from any path because
`vite.config.ts` sets `base: './'` — but without the Function the owner panel can only report that the
shop service is missing, and the storefront reads the baked catalogue. The repo tracks `dist/`; rebuild
it (`npm run build`) whenever `src/` changes.

## Known limitations

- Roughly 80 products share 10 studio photographs, so similar items look alike.
- Small 10–12px text in `#7A6B5D` / `#A89C8F` on the cream background falls below WCAG AA contrast.
- Reviews are hard-coded, and there is no order history persistence: an order is confirmed on screen
  and not stored anywhere.
