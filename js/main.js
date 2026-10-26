(function () {
  "use strict";

  var nav = document.getElementById("mobileNav");
  var toggle = document.getElementById("navToggle");
  var close = document.getElementById("navClose");
  var scrim = document.getElementById("navScrim");

  function openNav() {
    nav.classList.add("open");
    nav.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    scrim.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeNav() {
    nav.classList.remove("open");
    nav.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    scrim.hidden = true;
    document.body.style.overflow = "";
  }

  if (toggle) toggle.addEventListener("click", openNav);
  if (close) close.addEventListener("click", closeNav);
  if (scrim) scrim.addEventListener("click", closeNav);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && nav.classList.contains("open")) closeNav();
  });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
