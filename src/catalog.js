import { products } from "./data.js";
import { mountReveal, mountShell, productCard } from "./shell.js";

mountShell();

const grid = document.querySelector("#catalog-grid");
const categoryFilters = document.querySelector("#category-filters");
const title = document.querySelector("#catalog-title");
const count = document.querySelector("#catalog-count");
const saleButton = document.querySelector("[data-filter-sale]");
const resetButton = document.querySelector("[data-filter-reset]");

const params = new URLSearchParams(window.location.search);
let activeCategory = params.get("category");
let saleOnly = params.get("featured") === "sale";

const categoryMap = [...new Map(products.map((item) => [item.category, item.categoryLabel])).entries()];

function renderFilters() {
  if (!categoryFilters) {
    return;
  }

  categoryFilters.innerHTML = categoryMap
    .map(
      ([value, label]) =>
        `<button class="chip ${activeCategory === value ? "is-active" : ""}" data-category="${value}" type="button">${label}</button>`
    )
    .join("");

  categoryFilters.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = activeCategory === button.dataset.category ? null : button.dataset.category;
      render();
    });
  });

  saleButton?.classList.toggle("is-active", saleOnly);
}

function getFilteredProducts() {
  return products.filter((product) => {
    if (activeCategory && product.category !== activeCategory) {
      return false;
    }
    if (saleOnly && !product.originalPrice) {
      return false;
    }
    return true;
  });
}

function render() {
  const filtered = getFilteredProducts();
  if (grid) {
    grid.innerHTML = filtered.map(productCard).join("");
  }
  if (title) {
    title.textContent = activeCategory
      ? categoryMap.find(([value]) => value === activeCategory)?.[1] ?? "Sélection"
      : "Toutes les références";
  }
  if (count) {
    count.textContent = `${filtered.length} produit${filtered.length > 1 ? "s" : ""}`;
  }
  renderFilters();
  mountReveal();
}

saleButton?.addEventListener("click", () => {
  saleOnly = !saleOnly;
  render();
});

resetButton?.addEventListener("click", () => {
  activeCategory = null;
  saleOnly = false;
  render();
});

render();
