import { products } from "./data.js";
import { mountReveal, mountShell, productCard } from "./shell.js";

mountShell();

const featured = products.slice(0, 4);
const featuredRoot = document.querySelector("#featured-products");

if (featuredRoot) {
  featuredRoot.innerHTML = featured.map(productCard).join("");
}

mountReveal();
