/* Storefront API client for House of Mimansa.
 * Depends on window.HOM_SHOPIFY (js/shopify-config.js).
 * Exposes window.HomShopify with product + cart operations.
 */
(function () {
  "use strict";

  var config = window.HOM_SHOPIFY || {};

  function isConfigured() {
    return Boolean(config.storeDomain && config.storefrontAccessToken);
  }

  function apiUrl() {
    return "https://" + config.storeDomain + "/api/" + config.apiVersion + "/graphql.json";
  }

  function shopifyFetch(query, variables) {
    return fetch(apiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (res) {
      if (!res.ok) throw new Error("Shopify request failed (" + res.status + ")");
      return res.json();
    }).then(function (json) {
      if (json.errors && json.errors.length) {
        throw new Error(json.errors[0].message || "Shopify GraphQL error");
      }
      return json.data;
    });
  }

  /* ---------------- Products ---------------- */

  var PRODUCT_CARD_FRAGMENT =
    "fragment CardProduct on Product {" +
    "  id handle title" +
    "  featuredImage { url altText }" +
    "  priceRange { minVariantPrice { amount currencyCode } }" +
    "  variants(first: 100) { edges { node { availableForSale } } }" +
    "}";

  function getProducts(first, after) {
    var query =
      PRODUCT_CARD_FRAGMENT +
      "query Products($first: Int!, $after: String) {" +
      "  products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {" +
      "    edges { node { ...CardProduct } }" +
      "    pageInfo { hasNextPage endCursor }" +
      "  }" +
      "}";
    return shopifyFetch(query, { first: first || 24, after: after || null })
      .then(function (data) { return data.products; });
  }

  var PRODUCT_DETAIL_QUERY =
    "query ProductByHandle($handle: String!) {" +
    "  product(handle: $handle) {" +
    "    id handle title description descriptionHtml" +
    "    images(first: 10) { edges { node { url altText } } }" +
    "    options { id name optionValues { name } }" +
    "    variants(first: 100) {" +
    "      edges {" +
    "        node {" +
    "          id title availableForSale" +
    "          price { amount currencyCode }" +
    "          compareAtPrice { amount currencyCode }" +
    "          image { url altText }" +
    "          selectedOptions { name value }" +
    "        }" +
    "      }" +
    "    }" +
    "    priceRange { minVariantPrice { amount currencyCode } }" +
    "  }" +
    "}";

  function getProductByHandle(handle) {
    return shopifyFetch(PRODUCT_DETAIL_QUERY, { handle: handle })
      .then(function (data) { return data.product; });
  }

  /* ---------------- Cart ---------------- */

  var CART_FRAGMENT =
    "fragment CartFields on Cart {" +
    "  id checkoutUrl totalQuantity" +
    "  cost { subtotalAmount { amount currencyCode } totalTaxAmount { amount currencyCode } }" +
    "  lines(first: 100) {" +
    "    edges {" +
    "      node {" +
    "        id quantity" +
    "        merchandise {" +
    "          ... on ProductVariant {" +
    "            id title availableForSale" +
    "            price { amount currencyCode }" +
    "            image { url altText }" +
    "            selectedOptions { name value }" +
    "            product { title handle }" +
    "          }" +
    "        }" +
    "      }" +
    "    }" +
    "  }" +
    "}";

  function createCart() {
    return shopifyFetch(CART_FRAGMENT + "mutation CartCreate { cartCreate { cart { ...CartFields } cartUserErrors { message field } } }")
      .then(function (data) {
        var payload = data.cartCreate;
        if (payload.cartUserErrors && payload.cartUserErrors.length) {
          throw new Error(payload.cartUserErrors[0].message);
        }
        return payload.cart;
      });
  }

  function fetchCart(cartId) {
    return shopifyFetch(
      CART_FRAGMENT + "query GetCart($cartId: ID!) { cart(id: $cartId) { ...CartFields } }",
      { cartId: cartId }
    ).then(function (data) { return data.cart; });
  }

  function cartLinesAdd(cartId, lines) {
    return shopifyFetch(
      CART_FRAGMENT + "mutation AddLines($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message field } } }",
      { cartId: cartId, lines: lines }
    ).then(function (data) {
      var payload = data.cartLinesAdd;
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return payload.cart;
    });
  }

  function cartLinesUpdate(cartId, lines) {
    return shopifyFetch(
      CART_FRAGMENT + "mutation UpdateLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message field } } }",
      { cartId: cartId, lines: lines }
    ).then(function (data) {
      var payload = data.cartLinesUpdate;
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return payload.cart;
    });
  }

  function cartLinesRemove(cartId, lineIds) {
    return shopifyFetch(
      CART_FRAGMENT + "mutation RemoveLines($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ...CartFields } userErrors { message field } } }",
      { cartId: cartId, lineIds: lineIds }
    ).then(function (data) {
      var payload = data.cartLinesRemove;
      if (payload.userErrors && payload.userErrors.length) {
        throw new Error(payload.userErrors[0].message);
      }
      return payload.cart;
    });
  }

  /* ---------------- Helpers ---------------- */

  function formatMoney(money) {
    if (!money) return "";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: money.currencyCode
      }).format(Number(money.amount));
    } catch (e) {
      return money.currencyCode + " " + money.amount;
    }
  }

  window.HomShopify = {
    isConfigured: isConfigured,
    getProducts: getProducts,
    getProductByHandle: getProductByHandle,
    createCart: createCart,
    fetchCart: fetchCart,
    cartLinesAdd: cartLinesAdd,
    cartLinesUpdate: cartLinesUpdate,
    cartLinesRemove: cartLinesRemove,
    formatMoney: formatMoney
  };
})();
