/* New Arrivals grid — renders real Shopify products. */
(function () {
  "use strict";

  var grid = document.getElementById("productGrid");
  var statusEl = document.getElementById("shopStatus");
  var loadMoreBtn = document.getElementById("loadMore");
  var cursor = null;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function productCard(product) {
    var img = product.featuredImage;
    var price = product.priceRange && product.priceRange.minVariantPrice;
    var anyAvailable = product.variants.edges.some(function (e) {
      return e.node.availableForSale;
    });
    return (
      '<a class="product-card" href="product.html?handle=' + encodeURIComponent(product.handle) + '">' +
      '  <div class="product-card-img">' +
      (img ? '<img src="' + img.url + '" alt="' + escapeHtml(img.altText || product.title) + '" loading="lazy">' : "") +
      (anyAvailable ? "" : '<span class="product-badge">Sold Out</span>') +
      "  </div>" +
      '  <div class="product-card-info">' +
      '    <p class="product-card-title">' + escapeHtml(product.title) + "</p>" +
      '    <p class="product-card-price">' + window.HomShopify.formatMoney(price) + "</p>" +
      "  </div>" +
      "</a>"
    );
  }

  function loadProducts() {
    statusEl.textContent = "Loading pieces…";
    loadMoreBtn.hidden = true;
    window.HomShopify.getProducts(24, cursor)
      .then(function (products) {
        statusEl.textContent = "";
        if (!products.edges.length && !grid.children.length) {
          statusEl.textContent = "New pieces are on the loom — check back soon.";
          return;
        }
        var html = products.edges.map(function (e) { return productCard(e.node); }).join("");
        grid.insertAdjacentHTML("beforeend", html);
        cursor = products.pageInfo.hasNextPage ? products.pageInfo.endCursor : null;
        loadMoreBtn.hidden = !cursor;
      })
      .catch(function (err) {
        statusEl.textContent = "Could not load products: " + err.message;
      });
  }

  if (!window.HomShopify.isConfigured()) {
    statusEl.textContent = "The store is not connected yet — add the Shopify store domain and Storefront access token in js/shopify-config.js.";
  } else {
    loadMoreBtn.addEventListener("click", loadProducts);
    loadProducts();
  }
})();
