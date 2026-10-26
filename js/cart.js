/* Cart drawer backed by a real Shopify cart.
 * Injects its own markup into <body>, wires every .bag-btn on the page,
 * keeps the Shopify cart id in localStorage, and redirects to the
 * checkoutUrl returned by Shopify (never a constructed URL).
 */
(function () {
  "use strict";

  var CART_ID_KEY = "hom_shopify_cart_id";
  var cart = null;
  var busy = false;

  /* ---------- drawer DOM ---------- */

  var drawer = document.createElement("aside");
  drawer.className = "cart-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML =
    '<div class="cart-head">' +
    '  <p class="cart-title">Your Bag</p>' +
    '  <button class="cart-close" type="button" aria-label="Close bag">' +
    '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
    "  </button>" +
    "</div>" +
    '<p class="cart-status" role="status"></p>' +
    '<div class="cart-body"></div>' +
    '<div class="cart-foot" hidden>' +
    '  <div class="cart-subtotal"><span>Subtotal</span><strong class="cart-subtotal-value"></strong></div>' +
    '  <p class="cart-note">Shipping, taxes and discounts are calculated at checkout.</p>' +
    '  <button class="btn btn-primary cart-checkout" type="button">Checkout</button>' +
    "</div>";
  document.body.appendChild(drawer);

  var scrim = document.createElement("div");
  scrim.className = "cart-scrim";
  scrim.hidden = true;
  document.body.appendChild(scrim);

  var bodyEl = drawer.querySelector(".cart-body");
  var statusEl = drawer.querySelector(".cart-status");
  var footEl = drawer.querySelector(".cart-foot");
  var subtotalEl = drawer.querySelector(".cart-subtotal-value");
  var checkoutBtn = drawer.querySelector(".cart-checkout");

  /* ---------- open / close ---------- */

  function openCart() {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    document.body.style.overflow = "hidden";
    refresh();
  }

  function closeCart() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.hidden = true;
    document.body.style.overflow = "";
  }

  Array.prototype.forEach.call(document.querySelectorAll(".bag-btn"), function (btn) {
    btn.addEventListener("click", openCart);
  });
  drawer.querySelector(".cart-close").addEventListener("click", closeCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && drawer.classList.contains("open")) closeCart();
  });

  /* ---------- Shopify cart lifecycle ---------- */

  function getCartId() {
    try { return localStorage.getItem(CART_ID_KEY); } catch (e) { return null; }
  }

  function saveCartId(id) {
    try { localStorage.setItem(CART_ID_KEY, id); } catch (e) { /* private mode */ }
  }

  function clearCartId() {
    try { localStorage.removeItem(CART_ID_KEY); } catch (e) { /* ignore */ }
  }

  function getOrCreateCart() {
    var id = getCartId();
    if (id) {
      return window.HomShopify.fetchCart(id).then(function (existing) {
        if (existing) return existing;
        clearCartId();
        return window.HomShopify.createCart();
      }).catch(function () {
        clearCartId();
        return window.HomShopify.createCart();
      });
    }
    return window.HomShopify.createCart();
  }

  function refresh() {
    if (!window.HomShopify.isConfigured()) {
      statusEl.textContent = "Store is not connected yet.";
      bodyEl.innerHTML = "";
      footEl.hidden = true;
      return Promise.resolve(null);
    }
    return getOrCreateCart().then(function (current) {
      cart = current;
      saveCartId(cart.id);
      render();
      return cart;
    }).catch(function (err) {
      statusEl.textContent = "Could not load your bag: " + err.message;
      return null;
    });
  }

  /* ---------- rendering ---------- */

  function variantSummary(variant) {
    return (variant.selectedOptions || [])
      .map(function (opt) { return opt.value; })
      .join(" / ");
  }

  function updateBagButtons() {
    var count = cart ? cart.totalQuantity : 0;
    Array.prototype.forEach.call(document.querySelectorAll(".bag-btn"), function (btn) {
      var label = btn.querySelector("span");
      if (label) label.innerHTML = "Bag&nbsp;(" + count + ")";
      btn.setAttribute("aria-label", "Shopping bag, " + count + " items");
    });
  }

  function render() {
    updateBagButtons();
    statusEl.textContent = "";

    var lines = cart && cart.lines ? cart.lines.edges : [];

    if (!lines.length) {
      bodyEl.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
      footEl.hidden = true;
      return;
    }

    var html = "";
    lines.forEach(function (edge) {
      var line = edge.node;
      var v = line.merchandise || {};
      var img = v.image;
      var optSummary = variantSummary(v);
      html +=
        '<div class="cart-line" data-line-id="' + line.id + '">' +
        '  <a class="cart-line-img" href="product.html?handle=' + encodeURIComponent((v.product && v.product.handle) || "") + '">' +
        (img ? '<img src="' + img.url + '" alt="' + (img.altText || "") + '">' : "") +
        "  </a>" +
        '  <div class="cart-line-info">' +
        '    <a class="cart-line-title" href="product.html?handle=' + encodeURIComponent((v.product && v.product.handle) || "") + '">' + ((v.product && v.product.title) || "") + "</a>" +
        (optSummary ? '<p class="cart-line-variant">' + optSummary + "</p>" : "") +
        '    <p class="cart-line-price">' + window.HomShopify.formatMoney(v.price) + "</p>" +
        '    <div class="cart-line-actions">' +
        '      <div class="qty-stepper">' +
        '        <button type="button" data-qty="-1" aria-label="Decrease quantity">&minus;</button>' +
        '        <span>' + line.quantity + "</span>" +
        '        <button type="button" data-qty="1" aria-label="Increase quantity">+</button>' +
        "      </div>" +
        '      <button class="cart-line-remove" type="button">Remove</button>' +
        "    </div>" +
        "  </div>" +
        "</div>";
    });
    bodyEl.innerHTML = html;

    subtotalEl.textContent = window.HomShopify.formatMoney(cart.cost.subtotalAmount);
    footEl.hidden = false;
  }

  bodyEl.addEventListener("click", function (event) {
    if (!cart) return;
    var lineEl = event.target.closest(".cart-line");
    if (!lineEl) return;
    var lineId = lineEl.getAttribute("data-line-id");
    var line = cart.lines.edges
      .map(function (e) { return e.node; })
      .filter(function (n) { return n.id === lineId; })[0];
    if (!line) return;

    var qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn && !busy) {
      busy = true;
      var nextQty = line.quantity + parseInt(qtyBtn.getAttribute("data-qty"), 10);
      var op = nextQty <= 0
        ? window.HomShopify.cartLinesRemove(cart.id, [lineId])
        : window.HomShopify.cartLinesUpdate(cart.id, [{ id: lineId, quantity: nextQty }]);
      op.then(function (updated) { cart = updated; render(); })
        .catch(function (err) { statusEl.textContent = err.message; })
        .finally(function () { busy = false; });
      return;
    }

    if (event.target.closest(".cart-line-remove") && !busy) {
      busy = true;
      window.HomShopify.cartLinesRemove(cart.id, [lineId])
        .then(function (updated) { cart = updated; render(); })
        .catch(function (err) { statusEl.textContent = err.message; })
        .finally(function () { busy = false; });
    }
  });

  /* ---------- checkout ---------- */

  function isSafeCheckoutUrl(url) {
    try {
      var host = new URL(url).hostname;
      return host === configDomain() ||
        host === "checkout.shopify.com" ||
        host === "shop.app" ||
        host.slice(-".myshopify.com".length) === ".myshopify.com" ||
        host.slice(-".shopify.com".length) === ".shopify.com";
    } catch (e) {
      return false;
    }
  }

  function configDomain() {
    return (window.HOM_SHOPIFY && window.HOM_SHOPIFY.storeDomain || "").toLowerCase();
  }

  checkoutBtn.addEventListener("click", function () {
    if (!cart || !cart.checkoutUrl) return;
    if (!isSafeCheckoutUrl(cart.checkoutUrl)) {
      statusEl.textContent = "Checkout link is invalid. Please refresh and try again.";
      return;
    }
    window.location.href = cart.checkoutUrl;
  });

  /* ---------- public API for product pages ---------- */

  window.HomCart = {
    open: openCart,
    close: closeCart,
    refresh: refresh,
    addVariant: function (variantId, quantity) {
      if (!window.HomShopify.isConfigured()) {
        statusEl.textContent = "Store is not connected yet.";
        openCart();
        return Promise.reject(new Error("not configured"));
      }
      return getOrCreateCart()
        .then(function (current) {
          return window.HomShopify.cartLinesAdd(current.id, [{
            merchandiseId: variantId,
            quantity: quantity || 1
          }]);
        })
        .then(function (updated) {
          cart = updated;
          saveCartId(cart.id);
          render();
          openCart();
          return cart;
        });
    }
  };

  updateBagButtons();
})();
