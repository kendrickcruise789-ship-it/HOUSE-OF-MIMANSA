/* Shopify Storefront configuration.
 *
 * The Storefront access token is a PUBLIC token — Shopify designed it for
 * browser-side use (unauthenticated scopes only: read products, write carts).
 * It is not a secret like an Admin API token. Still, never put an Admin token here.
 *
 * How to obtain the two values (store admin, ~2 minutes):
 *   Shopify Admin → Settings → Apps and sales channels → Develop apps
 *   → Create app → Configure Storefront API scopes
 *   → enable "unauthenticated_read_product_listings" and "unauthenticated_write_checkouts"
 *   → Install app → API credentials → copy the Storefront API access token.
 */
window.HOM_SHOPIFY = {
  // e.g. "house-of-mimansa.myshopify.com" (Admin → Settings → Domains)
  storeDomain: "",

  // Public Storefront API access token (see note above)
  storefrontAccessToken: "",

  // Pinned Storefront API version. Supported by Shopify until ~April 2027.
  // Check https://shopify.dev/docs/api/storefront before changing.
  apiVersion: "2026-04"
};
