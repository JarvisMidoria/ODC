import { site } from "./data.js";

const pageMap = {
  home: "/",
  catalog: "/produits.html",
  product: "/produits.html",
  marques: "/marques.html",
  ambiances: "/ambiances.html",
  contract: "/contract.html",
  histoire: "/histoire.html",
  showrooms: "/showrooms.html",
  contact: "/?contact=1"
};

function renderHeader(page) {
  const activePath = pageMap[page];
  const nav = site.navigation
    .map(
      (item) =>
        `<a class="${activePath === item.href ? "is-active" : ""}" href="${item.href}">${item.label}</a>`
    )
    .join("");

  return `
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="site-brand" href="/">
          <img src="${site.logo}" alt="Logo Odyssée" />
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav">
          Menu
        </button>
        <nav class="site-nav" aria-label="Navigation principale">
          ${nav}
        </nav>
        <a class="site-cta" href="/?contact=1">Prendre contact</a>
      </div>
      <div id="mobile-nav" class="mobile-nav">
        <nav aria-label="Navigation mobile">
          ${nav}
          <a class="site-cta site-cta--mobile" href="/?contact=1">Prendre contact</a>
        </nav>
      </div>
    </header>
  `;
}

function renderFooter() {
  const addresses = site.addresses
    .map(
      (item) =>
        `<li><strong>${item.city}</strong><a href="${item.href}" target="_blank" rel="noreferrer">${item.address}</a></li>`
    )
    .join("");

  return `
    <footer class="site-footer">
      <div class="container site-footer__grid">
        <div>
          <span class="eyebrow">Odyssée</span>
          <p class="footer-copy">
            Maison marocaine de tissus d'ameublement, marques internationales et accompagnement
            projet depuis 1998.
          </p>
        </div>
        <div>
          <span class="eyebrow">Navigation</span>
          <div class="footer-links">
            ${site.navigation.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
          </div>
        </div>
        <div>
          <span class="eyebrow">Coordonnées</span>
          <ul class="footer-list">
            <li><a href="mailto:${site.email}">${site.email}</a></li>
            <li><a href="tel:${site.phone.replace(/\s+/g, "")}">${site.phone}</a></li>
            ${addresses}
          </ul>
        </div>
      </div>
    </footer>
  `;
}

export function mountShell() {
  const root = document.querySelector("[data-site-shell]");
  const page = document.body.dataset.page;
  if (!root) {
    return;
  }

  root.insertAdjacentHTML("afterbegin", renderHeader(page));
  root.insertAdjacentHTML("beforeend", renderFooter());

  const toggle = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector(".mobile-nav");

  toggle?.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    mobileNav?.classList.toggle("is-open", !expanded);
  });
}

export function mountReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
}

export function formatPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

export function productCard(product) {
  const saleMarkup = product.originalPrice
    ? `<div class="product-card__price"><strong>${formatPrice(product.price)}</strong><span>${formatPrice(product.originalPrice)}</span></div>`
    : `<div class="product-card__price"><strong>${formatPrice(product.price)}</strong></div>`;

  return `
    <article class="product-card reveal">
      <a href="/product.html?slug=${product.slug}" aria-label="Voir ${product.name}">
        <div class="product-card__media">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
        </div>
        <div class="product-card__body">
          <div class="product-card__chips">
            ${product.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          ${saleMarkup}
        </div>
      </a>
    </article>
  `;
}
