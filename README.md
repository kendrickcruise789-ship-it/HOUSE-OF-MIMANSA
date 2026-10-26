# HOUSE-OF-MIMANSA

Clothing brand for a Jaipur based company — handcrafted hand-block printed apparel.

Custom static storefront (HTML/CSS/vanilla JS) wired to Shopify via the **Storefront API**:
Shopify manages products, inventory, cart, checkout, payments and orders; this repo is the design layer.

## Run locally

```bash
python -m http.server 8080
# then visit http://localhost:8080
```

## Pages

- `index.html` — homepage (announcement bar, header, split hero, footer, mobile nav drawer)
- `shop.html` — New Arrivals grid, rendered live from Shopify products
- `product.html?handle=<product-handle>` — product detail with variant selection (sizes/colours come from Shopify)

## Shopify connection (required for products/cart/checkout)

Everything is controlled by **`js/shopify-config.js`** (two values, no other setup):

```js
window.HOM_SHOPIFY = {
  storeDomain: "your-store.myshopify.com",   // Admin → Settings → Domains
  storefrontAccessToken: "xxxxxxxx",          // see below
  apiVersion: "2026-04"
};
```

### Getting the Storefront access token (store admin, ~2 minutes)

1. Shopify Admin → **Settings → Apps and sales channels → Develop apps**
2. **Create app** (name it e.g. "House of Mimansa Storefront")
3. **Configure Storefront API scopes** → enable:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_write_checkouts`
4. **Install the app**, then open **API credentials**
5. Copy the **Storefront API access token** into `js/shopify-config.js`

### Public vs. secret

- The **Storefront access token is public by design** — Shopify issues it for browser-side use with the unauthenticated scopes above. It can only read the published catalog and write carts/checkouts.
- **Never** put an Admin API token, password, or payment credential anywhere in this repo. There is no backend and none is needed.
- Products must be **published to the Storefront API channel** in Shopify Admin (Products → product → Publishing) or they will not appear.

### How checkout works

The bag drawer is a real Shopify cart (`cartCreate` / `cartLinesAdd` / `cartLinesUpdate` / `cartLinesRemove`).
The Checkout button redirects to the `checkoutUrl` **returned by Shopify** — customers pay on Shopify's hosted checkout with the store's configured payment methods. No payment data ever touches this site.

## Deploying

Static hosting only (GitHub Pages, Netlify, Vercel, any web server) — no server runtime required.

- **GitHub Pages**: repo Settings → Pages → deploy from branch `main` / root.
- **GoDaddy domain**: point the domain (or `www` CNAME) at your host (GitHub Pages: the `*.github.io` target shown in Pages settings; Netlify/Vercel: their DNS records), then add the custom domain in the host's settings. HTTPS is provisioned automatically by the host.

## Structure

- `index.html`, `shop.html`, `product.html` — pages
- `css/style.css` — theme (Warm Ivory `#F8F5EF`, Charcoal `#33302E`, Soft Beige `#E9DED4`, Muted Rose `#885365`) + all layout
- `js/shopify-config.js` — **the only file you edit to connect the store** (placeholders only, no secrets in git)
- `js/shopify-api.js` — Storefront API client (products, cart, checkout URL)
- `js/cart.js` — bag drawer, cart persistence, checkout redirect
- `js/shop.js`, `js/product.js` — page logic
- `js/main.js` — navigation drawer
- `assets/` — imagery

Fonts: Cormorant Garamond (serif) + Jost (sans) via Google Fonts.
