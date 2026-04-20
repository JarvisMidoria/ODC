import {
  ADMIN_ASSET_OPTIONS,
  DEFAULT_SITE_CONTENT,
  loadSiteContent,
  resetSiteContent,
  saveSiteContent
} from "./site-content.js";
import { apiFetch } from "./api-client.js";

const state = {
  content: loadSiteContent(),
  professionals: [],
  professionalsLoaded: false,
  professionalsError: ""
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });
}

function shortcutCardEditor(card, index) {
  return `
    <article class="admin-editor-card">
      <div class="admin-editor-card__media">
        <img src="${card.image}" alt="${escapeHtml(card.title.replace(/<br\s*\/?>/gi, " "))}" />
      </div>
      <div class="admin-editor-card__fields">
        <label>Titre
          <textarea rows="2" data-admin-shortcut-title="${index}">${card.title.replace(/<br\s*\/?>/gi, "\n")}</textarea>
        </label>
        <label>Lien
          <input type="text" value="${card.href}" data-admin-shortcut-href="${index}" />
        </label>
        <label>Visuel
          <select data-admin-shortcut-image="${index}">
            ${ADMIN_ASSET_OPTIONS.map((asset) => `<option value="${asset.src}" ${asset.src === card.image ? "selected" : ""}>${asset.label}</option>`).join("")}
          </select>
        </label>
      </div>
    </article>
  `;
}

function renderProductQueue() {
  const items = state.content.products.importLinks;
  return items.length
    ? items.map((item, index) => `
        <li class="admin-link-list__item">
          <span>${escapeHtml(item)}</span>
          <button type="button" data-admin-remove-link="${index}">Retirer</button>
        </li>
      `).join("")
    : `<li class="admin-link-list__empty">Aucun lien ajouté pour l’instant.</li>`;
}

function renderProfessionalsTable() {
  if (state.professionalsError) {
    return `<div class="admin-table__empty">${escapeHtml(state.professionalsError)}</div>`;
  }

  if (!state.professionalsLoaded) {
    return `<div class="admin-table__empty">Chargement des formulaires professionnels...</div>`;
  }

  if (!state.professionals.length) {
    return `<div class="admin-table__empty">Aucun formulaire professionnel enregistré pour l’instant.</div>`;
  }

  return `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Téléphone</th>
            <th>Email</th>
            <th>Profession</th>
            <th>Échantillons</th>
            <th>Créé le</th>
          </tr>
        </thead>
        <tbody>
          ${state.professionals.map((professional) => `
            <tr>
              <td>${escapeHtml(professional.lastName)}</td>
              <td>${escapeHtml(professional.firstName)}</td>
              <td>${escapeHtml(professional.phone)}</td>
              <td><a href="mailto:${escapeHtml(professional.email)}">${escapeHtml(professional.email)}</a></td>
              <td>${escapeHtml(professional.profession)}</td>
              <td>${escapeHtml(String(professional.sampleCount))}</td>
              <td>${escapeHtml(professional.createdAt)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadProfessionals() {
  try {
    const response = await apiFetch("/api/admin/professionals");
    if (!response.ok) {
      throw new Error("Impossible de charger les formulaires professionnels.");
    }
    const payload = await response.json();
    state.professionals = Array.isArray(payload.professionals) ? payload.professionals : [];
    state.professionalsError = "";
  } catch (error) {
    state.professionals = [];
    state.professionalsError = error.message || "Impossible de charger les formulaires professionnels.";
  }

  state.professionalsLoaded = true;
  render();
}

function render() {
  const app = document.querySelector("#admin-app");
  if (!app) return;

  const { home, contract, showrooms, products } = state.content;

  app.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div>
          <p class="admin-kicker">Back office</p>
          <h1>ODC Admin</h1>
          <p class="admin-sidebar__copy">Une vue claire des contenus du site, avec visuels et zones d’édition séparées.</p>
        </div>
        <nav class="admin-sidebar__nav" aria-label="Navigation admin">
          <a href="#admin-products">Produits</a>
          <a href="#admin-professionals">Professionnels</a>
          <a href="#admin-home">Home</a>
          <a href="#admin-contract">Contract</a>
          <a href="#admin-showrooms">Showrooms</a>
          <a href="#admin-assets">Visuels</a>
        </nav>
        <div class="admin-sidebar__actions">
          <button type="button" class="admin-button admin-button--primary" data-admin-save>Toujours enregistrer</button>
          <button type="button" class="admin-button" data-admin-reset>Revenir aux valeurs actuelles</button>
        </div>
      </aside>

      <main class="admin-main">
        <section class="admin-hero">
          <div class="admin-hero__copy">
            <p class="admin-kicker">Vue d’ensemble</p>
            <h2>Le contenu est organisé par zone réelle du site.</h2>
            <p>Chaque bloc montre d’abord le visuel ou le texte publié, puis les champs d’édition associés. L’objectif est d’éviter un back office abstrait.</p>
          </div>
          <div class="admin-hero__stats">
            <article><strong>${products.importLinks.length}</strong><span>liens produit en file</span></article>
            <article><strong>${home.shortcuts.length}</strong><span>cartes home</span></article>
            <article><strong>${ADMIN_ASSET_OPTIONS.length}</strong><span>visuels disponibles</span></article>
          </div>
        </section>

        <section id="admin-products" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Produits</p><h2>Ajouter des liens à importer</h2></div>
            <p>Cette file sert de point d’entrée pour les imports produits. Les liens sont stockés localement pour l’instant.</p>
          </div>
          <div class="admin-grid admin-grid--two">
            <div class="admin-panel">
              <label class="admin-panel__label">Coller une liste de liens
                <textarea rows="8" id="admin-product-links-input" placeholder="https://www.odyssee.ma/produits/p/...\nhttps://www.odyssee.ma/produits/p/..."></textarea>
              </label>
              <div class="admin-panel__actions">
                <button type="button" class="admin-button admin-button--primary" data-admin-add-links>Ajouter à la file</button>
              </div>
            </div>
            <div class="admin-panel">
              <h3>File d’import</h3>
              <ul class="admin-link-list">${renderProductQueue()}</ul>
            </div>
          </div>
        </section>

        <section id="admin-professionals" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Professionnels</p><h2>Formulaires enregistrés</h2></div>
            <p>Les inscriptions créées depuis la modale professionnelle sont stockées en base et visibles ici.</p>
          </div>
          <div class="admin-panel">
            ${renderProfessionalsTable()}
          </div>
        </section>

        <section id="admin-home" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Home</p><h2>Cartes de navigation</h2></div>
            <p>Ces cartes apparaissent sous la bande de logos. Chaque carte reste visuelle et éditable individuellement.</p>
          </div>
          <div class="admin-card-grid">${home.shortcuts.map((card, index) => shortcutCardEditor(card, index)).join("")}</div>
        </section>

        <section id="admin-contract" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Contract</p><h2>Hero et contenu éditorial</h2></div>
            <p>Le hero plein écran et le bloc texte utilisent cette configuration.</p>
          </div>
          <div class="admin-grid admin-grid--two">
            <div class="admin-panel">
              <div class="admin-preview admin-preview--hero">
                <img src="${contract.heroImage}" alt="Hero contract" />
                <div class="admin-preview__overlay">
                  <strong>${escapeHtml(contract.heroTitle)}</strong>
                  <span>${escapeHtml(contract.heroButtonLabel)}</span>
                </div>
              </div>
              <label>Image hero
                <select id="admin-contract-hero-image">${ADMIN_ASSET_OPTIONS.map((asset) => `<option value="${asset.src}" ${asset.src === contract.heroImage ? "selected" : ""}>${asset.label}</option>`).join("")}</select>
              </label>
              <label>Titre hero<input id="admin-contract-hero-title" type="text" value="${escapeHtml(contract.heroTitle)}" /></label>
              <label>Bouton hero<input id="admin-contract-hero-button" type="text" value="${escapeHtml(contract.heroButtonLabel)}" /></label>
            </div>
            <div class="admin-panel">
              <div class="admin-inline-layout">
                <div class="admin-inline-layout__copy">
                  <h3>${escapeHtml(contract.copyTitle)}</h3>
                  ${contract.copyParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                </div>
                <div class="admin-inline-layout__media">
                  <img src="${contract.sideImage}" alt="Visuel contract" />
                </div>
              </div>
              <label>Titre bloc texte<input id="admin-contract-copy-title" type="text" value="${escapeHtml(contract.copyTitle)}" /></label>
              <label>Texte principal<textarea id="admin-contract-copy-body" rows="9">${contract.copyParagraphs.join("\n\n")}</textarea></label>
              <label>Image bloc texte
                <select id="admin-contract-side-image">${ADMIN_ASSET_OPTIONS.map((asset) => `<option value="${asset.src}" ${asset.src === contract.sideImage ? "selected" : ""}>${asset.label}</option>`).join("")}</select>
              </label>
            </div>
          </div>
        </section>

        <section id="admin-showrooms" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Showrooms</p><h2>Visuel et villes</h2></div>
            <p>Le hero showroom et la liste des villes sont regroupés ici pour éviter les allers-retours.</p>
          </div>
          <div class="admin-grid admin-grid--two">
            <div class="admin-panel">
              <div class="admin-preview admin-preview--showrooms"><img src="${showrooms.heroImage}" alt="Showrooms" /></div>
              <label>Image showrooms
                <select id="admin-showrooms-image">${ADMIN_ASSET_OPTIONS.map((asset) => `<option value="${asset.src}" ${asset.src === showrooms.heroImage ? "selected" : ""}>${asset.label}</option>`).join("")}</select>
              </label>
            </div>
            <div class="admin-panel">
              <h3>Villes affichées</h3>
              <div class="admin-city-list">
                ${showrooms.cities.map((city, index) => `<label>Ville ${index + 1}<input type="text" value="${escapeHtml(city)}" data-admin-showroom-city="${index}" /></label>`).join("")}
              </div>
            </div>
          </div>
        </section>

        <section id="admin-assets" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Visuels</p><h2>Bibliothèque locale</h2></div>
            <p>Les visuels déjà disponibles dans le projet pour éviter de chercher les chemins à la main.</p>
          </div>
          <div class="admin-assets-grid">
            ${ADMIN_ASSET_OPTIONS.map((asset) => `
              <article class="admin-asset-card">
                <img src="${asset.src}" alt="${escapeHtml(asset.label)}" />
                <div>
                  <strong>${escapeHtml(asset.label)}</strong>
                  <span>${escapeHtml(asset.src)}</span>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      </main>
    </div>
  `;
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    if (target.matches("[data-admin-add-links]")) {
      const input = document.querySelector("#admin-product-links-input");
      if (!(input instanceof HTMLTextAreaElement)) return;
      const nextLinks = input.value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
      if (!nextLinks.length) return;
      state.content.products.importLinks = [...new Set([...state.content.products.importLinks, ...nextLinks])];
      input.value = "";
      saveSiteContent(state.content);
      render();
      return;
    }

    if (target.matches("[data-admin-remove-link]")) {
      const index = Number(target.getAttribute("data-admin-remove-link"));
      state.content.products.importLinks.splice(index, 1);
      saveSiteContent(state.content);
      render();
      return;
    }

    if (target.matches("[data-admin-save]")) {
      saveSiteContent(state.content);
      target.textContent = "Enregistré";
      window.setTimeout(() => { target.textContent = "Toujours enregistrer"; }, 1200);
      return;
    }

    if (target.matches("[data-admin-reset]")) {
      state.content = structuredClone(DEFAULT_SITE_CONTENT);
      resetSiteContent();
      saveSiteContent(state.content);
      render();
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const shortcutTitle = target.getAttribute("data-admin-shortcut-title");
    const shortcutHref = target.getAttribute("data-admin-shortcut-href");
    const showroomCity = target.getAttribute("data-admin-showroom-city");

    if (shortcutTitle !== null && target instanceof HTMLTextAreaElement) {
      state.content.home.shortcuts[Number(shortcutTitle)].title = target.value.trim().replace(/\n+/g, "<br />");
    }
    if (shortcutHref !== null && target instanceof HTMLInputElement) {
      state.content.home.shortcuts[Number(shortcutHref)].href = target.value.trim() || "/";
    }
    if (showroomCity !== null && target instanceof HTMLInputElement) {
      state.content.showrooms.cities[Number(showroomCity)] = target.value.trim();
    }
    if (target.id === "admin-contract-hero-title" && target instanceof HTMLInputElement) {
      state.content.contract.heroTitle = target.value;
    }
    if (target.id === "admin-contract-hero-button" && target instanceof HTMLInputElement) {
      state.content.contract.heroButtonLabel = target.value;
    }
    if (target.id === "admin-contract-copy-title" && target instanceof HTMLInputElement) {
      state.content.contract.copyTitle = target.value;
    }
    if (target.id === "admin-contract-copy-body" && target instanceof HTMLTextAreaElement) {
      state.content.contract.copyParagraphs = target.value.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    }

    saveSiteContent(state.content);
  });

  document.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const shortcutImage = target.getAttribute("data-admin-shortcut-image");
    if (shortcutImage !== null && target instanceof HTMLSelectElement) {
      state.content.home.shortcuts[Number(shortcutImage)].image = target.value;
    }
    if (target.id === "admin-contract-hero-image" && target instanceof HTMLSelectElement) {
      state.content.contract.heroImage = target.value;
    }
    if (target.id === "admin-contract-side-image" && target instanceof HTMLSelectElement) {
      state.content.contract.sideImage = target.value;
    }
    if (target.id === "admin-showrooms-image" && target instanceof HTMLSelectElement) {
      state.content.showrooms.heroImage = target.value;
    }

    saveSiteContent(state.content);
    render();
  });
}

render();
bindEvents();
loadProfessionals();
