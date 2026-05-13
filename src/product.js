import { products } from "./data.js";
import { formatPrice, mountReveal, mountShell, productCard } from "./shell.js";

mountShell();

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug") || "1830-col-01";
const product = products.find((item) => item.slug === slug) || products[0];
const related = products.filter((item) => item.slug !== product.slug).slice(0, 3);
const root = document.querySelector("#product-page");

if (root) {
  const gallery = product.gallery
    .map(
      (image, index) =>
        `<article class="product-gallery__item ${index === 0 ? "product-gallery__item--large" : ""}">
          <img src="${image}" alt="${product.name} visuel ${index + 1}" />
        </article>`
    )
    .join("");

  root.innerHTML = `
    <section class="section">
      <div class="container product-layout">
        <div class="product-gallery reveal">${gallery}</div>
        <div class="product-summary reveal">
          <span class="eyebrow">Mock data produit</span>
          <h1>${product.name}</h1>
          <p class="product-summary__description">${product.description}</p>
          <div class="product-summary__price">
            <strong>${formatPrice(product.price)}</strong>
            ${product.originalPrice ? `<span>${formatPrice(product.originalPrice)}</span>` : ""}
          </div>
          <div class="product-summary__chips">
            ${product.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <div class="product-summary__specs">
            <article><span>Catégorie</span><strong>${product.categoryLabel}</strong></article>
            <article><span>Composition</span><strong>${product.composition}</strong></article>
            <article><span>Martindale</span><strong>${product.martindale}</strong></article>
            <article><span>Résistance lumière</span><strong>${product.lightfastness}</strong></article>
          </div>
          <div class="hero__actions">
            <a class="button button--primary" href="/?contact=1">Demander un devis</a>
            <a class="button button--ghost" href="/produits.html">Retour au catalogue</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--warm">
      <div class="container">
        <div class="section-heading reveal">
          <span class="eyebrow">Produits liés</span>
          <h2>Références proches dans la même logique de sélection.</h2>
        </div>
        <div class="product-grid">${related.map(productCard).join("")}</div>
      </div>
    </section>
  `;
}

mountReveal();
