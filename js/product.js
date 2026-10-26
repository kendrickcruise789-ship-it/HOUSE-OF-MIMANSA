/* Product detail page — variant selection driven by actual Shopify options. */
(function () {
  "use strict";

  var statusEl = document.getElementById("productStatus");
  var root = document.getElementById("productRoot");
  var state = {
    product: null,
    variants: [],
    options: [],
    selected: {},
    quantity: 1
  };

  var els = {
    mainImage: document.getElementById("mainImage"),
    thumbs: document.getElementById("thumbs"),
    title: document.getElementById("productTitle"),
    price: document.getElementById("productPrice"),
    desc: document.getElementById("productDesc"),
    options: document.getElementById("options"),
    availability: document.getElementById("availability"),
    qtyValue: document.getElementById("qtyValue"),
    addToBag: document.getElementById("addToBag")
  };

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function getHandle() {
    return new URLSearchParams(window.location.search).get("handle");
  }

  /* ---------- variant matching ---------- */

  function findVariant() {
    var names = state.options.map(function (o) { return o.name; });
    var chosenCount = names.filter(function (n) { return state.selected[n]; }).length;
    if (chosenCount < names.length) return null;
    return state.variants.filter(function (v) {
      return names.every(function (name) {
        var opt = v.selectedOptions.filter(function (so) { return so.name === name; })[0];
        return opt && opt.value === state.selected[name];
      });
    })[0] || null;
  }

  function currentPrice(variant) {
    if (variant) return variant.price;
    return state.product.priceRange.minVariantPrice;
  }

  function renderPrice() {
    var variant = findVariant();
    var price = currentPrice(variant);
    var compare = variant && variant.compareAtPrice;
    var html = '<span class="price-now">' + window.HomShopify.formatMoney(price) + "</span>";
    if (compare && Number(compare.amount) > Number(price.amount)) {
      html += ' <span class="price-compare">' + window.HomShopify.formatMoney(compare) + "</span>";
    }
    els.price.innerHTML = html;
  }

  function renderAvailability() {
    var variant = findVariant();
    if (!variant) {
      els.availability.textContent = "";
      els.addToBag.disabled = true;
      return;
    }
    if (!variant.availableForSale) {
      els.availability.textContent = "This combination is currently unavailable.";
      els.addToBag.disabled = true;
      return;
    }
    els.availability.textContent = "";
    els.addToBag.disabled = false;
  }

  function setMainImage(url, alt) {
    if (!url) return;
    els.mainImage.src = url;
    els.mainImage.alt = alt || "";
  }

  /* ---------- option rendering ---------- */

  function renderOptions() {
    var html = "";
    state.options.forEach(function (option) {
      html += '<div class="option-group">';
      html += '<p class="option-label">' + escapeHtml(option.name) + "</p>";
      html += '<div class="option-values" role="radiogroup" aria-label="' + escapeHtml(option.name) + '">';
      option.optionValues.forEach(function (ov) {
        var value = ov.name;
        var active = state.selected[option.name] === value;
        html +=
          '<button type="button" class="option-value' + (active ? " active" : "") + '"' +
          ' role="radio" aria-checked="' + active + '"' +
          ' data-option="' + escapeHtml(option.name) + '"' +
          ' data-value="' + escapeHtml(value) + '">' +
          escapeHtml(value) +
          "</button>";
      });
      html += "</div></div>";
    });
    els.options.innerHTML = html;
  }

  els.options.addEventListener("click", function (event) {
    var btn = event.target.closest(".option-value");
    if (!btn) return;
    state.selected[btn.getAttribute("data-option")] = btn.getAttribute("data-value");

    var variant = findVariant();
    if (variant && variant.image) setMainImage(variant.image.url, variant.image.altText);

    renderOptions();
    renderPrice();
    renderAvailability();
  });

  /* ---------- quantity ---------- */

  document.getElementById("qtyMinus").addEventListener("click", function () {
    state.quantity = Math.max(1, state.quantity - 1);
    els.qtyValue.textContent = state.quantity;
  });
  document.getElementById("qtyPlus").addEventListener("click", function () {
    state.quantity = Math.min(99, state.quantity + 1);
    els.qtyValue.textContent = state.quantity;
  });

  /* ---------- add to bag ---------- */

  els.addToBag.addEventListener("click", function () {
    var variant = findVariant();
    if (!variant || !variant.availableForSale) return;
    els.addToBag.disabled = true;
    window.HomCart.addVariant(variant.id, state.quantity)
      .catch(function (err) { statusEl.textContent = err.message; })
      .finally(function () { renderAvailability(); });
  });

  /* ---------- init ---------- */

  function init() {
    if (!window.HomShopify.isConfigured()) {
      statusEl.textContent = "The store is not connected yet — add the Shopify store domain and Storefront access token in js/shopify-config.js.";
      return;
    }
    var handle = getHandle();
    if (!handle) {
      statusEl.textContent = "No product selected.";
      return;
    }
    window.HomShopify.getProductByHandle(handle)
      .then(function (product) {
        if (!product) {
          statusEl.textContent = "This piece is no longer available.";
          return;
        }
        state.product = product;
        state.variants = product.variants.edges.map(function (e) { return e.node; });
        state.options = product.options;

        document.title = product.title + " — House of Mimansa";
        els.title.textContent = product.title;
        els.desc.innerHTML = product.descriptionHtml || escapeHtml(product.description || "");

        var images = product.images.edges.map(function (e) { return e.node; });
        if (images.length) setMainImage(images[0].url, images[0].altText || product.title);
        if (images.length > 1) {
          els.thumbs.innerHTML = images.map(function (img, i) {
            return '<button type="button" class="thumb' + (i === 0 ? " active" : "") + '"' +
              ' data-url="' + img.url + '" data-alt="' + escapeHtml(img.altText || product.title) + '">' +
              '<img src="' + img.url + '" alt="">' + "</button>";
          }).join("");
        }

        renderOptions();
        renderPrice();
        renderAvailability();

        statusEl.textContent = "";
        root.hidden = false;
      })
      .catch(function (err) {
        statusEl.textContent = "Could not load this piece: " + err.message;
      });
  }

  els.thumbs.addEventListener("click", function (event) {
    var btn = event.target.closest(".thumb");
    if (!btn) return;
    setMainImage(btn.getAttribute("data-url"), btn.getAttribute("data-alt"));
    Array.prototype.forEach.call(els.thumbs.querySelectorAll(".thumb"), function (t) {
      t.classList.toggle("active", t === btn);
    });
  });

  init();
})();
