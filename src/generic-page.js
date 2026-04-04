import { ambiances, brands, site } from "./data.js";
import { mountReveal, mountShell } from "./shell.js";

mountShell();

const brandGrid = document.querySelector("#brand-grid");
if (brandGrid) {
  brandGrid.innerHTML = brands
    .map(
      (brand) => `
        <article class="brand-card reveal">
          <img src="${brand.image}" alt="${brand.name}" loading="lazy" />
          <h2>${brand.name}</h2>
          <p>${brand.copy}</p>
        </article>
      `
    )
    .join("");
}

const ambianceGrid = document.querySelector("#ambiance-grid");
if (ambianceGrid) {
  ambianceGrid.innerHTML = ambiances
    .map(
      (item) => `
        <article class="ambiance-card reveal">
          <img src="${item.image}" alt="${item.title}" loading="lazy" />
          <div class="ambiance-card__meta">
            <span>${item.tag}</span>
            <h2>${item.title}</h2>
          </div>
        </article>
      `
    )
    .join("");
}

const showroomGrid = document.querySelector("#showroom-grid");
if (showroomGrid) {
  showroomGrid.innerHTML = site.addresses
    .map(
      (item) => `
        <article class="showroom-card reveal">
          <span class="eyebrow">${item.city}</span>
          <h2>${item.address}</h2>
          <p>${item.note}</p>
          <div class="showroom-card__actions">
            <a class="button button--primary" href="${item.href}" target="_blank" rel="noreferrer">Voir sur la carte</a>
            <a class="button button--ghost" href="tel:${site.phone.replace(/\s+/g, "")}">Appeler</a>
          </div>
        </article>
      `
    )
    .join("");
}

const form = document.querySelector("#contact-form");
const feedback = document.querySelector("#contact-feedback");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  form.reset();
  if (feedback) {
    feedback.textContent =
      "Merci. Votre message a bien été envoyé.";
  }
});

mountReveal();
