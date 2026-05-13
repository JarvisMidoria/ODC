import { apiFetch } from "./api-client.js";
import { productCatalogItems } from "./product-catalog-data.js";

const app = document.querySelector("#admin-app");

const state = {
  accessLoaded: false,
  accessAllowed: false,
  accessError: "",
  loginUsername: "Admin",
  loginPassword: "",
  loginBusy: false,
  activeView: getActiveViewFromHash(),
  productsLoaded: false,
  productStatuses: new Map(),
  colorwayStatuses: new Map(),
  expandedProducts: new Set(),
  productUpdating: new Set(),
  colorwayUpdating: new Set(),
  productSearch: "",
  accountsLoaded: false,
  accounts: [],
  accountsSearch: "",
  accountsDeleting: new Set(),
  contactMessagesLoaded: false,
  contactMessages: [],
  importJobsLoaded: false,
  importJobs: [],
  importUrl: "",
  importBusy: false,
  adminUsersLoaded: false,
  adminUsers: [],
  newAdminUsername: "",
  newAdminPassword: "",
  createAdminBusy: false,
  notice: ""
};

const views = [
  { id: "products", label: "Produits" },
  { id: "accounts", label: "Comptes client" },
  { id: "import", label: "Import" },
  { id: "users", label: "Utilisateurs" }
];

function getActiveViewFromHash() {
  const value = window.location.hash.replace(/^#/, "");
  return ["products", "accounts", "import", "users"].includes(value) ? value : "products";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getProductType(product) {
  const tags = (product?.tags || []).map((tag) => String(tag).toLowerCase());
  if (tags.some((tag) => tag.includes("wallpaper") || tag.includes("papier"))) {
    return "Papier peint";
  }
  return "Tissu";
}

function getProductStatus(productId) {
  return state.productStatuses.get(productId) || "available";
}

function getColorwayStatus(productId, colorwayId) {
  return state.colorwayStatuses.get(`${productId}::${colorwayId}`) || getProductStatus(productId);
}

function getProductStatusLabel(status) {
  return status === "unavailable" ? "Indisponible" : "Disponible";
}

function getAccountStatusLabel(status) {
  if (status === "blocked") return "Bloqué";
  if (status === "pending_email") return "Email non confirmé";
  return "Actif";
}

function getAccountStatusClass(status) {
  if (status === "blocked") return "blocked";
  if (status === "pending_email") return "pending";
  return "active";
}

function getUnreadContactMessageCount() {
  return state.contactMessages.filter((message) => message.status === "unread").length;
}

function getColorwayPreviewUrl(colorway) {
  return colorway?.mainImage?.assetUrl || colorway?.images?.[0]?.assetUrl || "";
}

function getProductColorwayCount(product) {
  return Array.isArray(product?.colorways) && product.colorways.length ? product.colorways.length : 1;
}

function getTotalProductCount() {
  return productCatalogItems.reduce((total, product) => total + getProductColorwayCount(product), 0);
}

function getUnavailableProductCount() {
  return productCatalogItems.reduce((total, product) => {
    if (getProductStatus(product.id) === "unavailable") {
      return total + getProductColorwayCount(product);
    }

    const unavailableColorways = (product.colorways || []).filter(
      (colorway) => getColorwayStatus(product.id, colorway.id) === "unavailable"
    ).length;

    return total + unavailableColorways;
  }, 0);
}

function getFilteredProducts() {
  const search = normalizeSearch(state.productSearch);
  if (!search) return productCatalogItems;

  return productCatalogItems.filter((product) => {
    const haystack = normalizeSearch([
      product.title,
      product.id,
      product.brand,
      getProductType(product),
      `${product.colorways?.length || 0} coloris`
    ].join(" "));
    return haystack.includes(search);
  });
}

function getFilteredAccounts() {
  const search = normalizeSearch(state.accountsSearch);
  if (!search) return state.accounts;

  return state.accounts.filter((account) => {
    const haystack = normalizeSearch([
      account.firstName,
      account.lastName,
      account.email,
      account.phone,
      account.profession,
      account.status
    ].join(" "));
    return haystack.includes(search);
  });
}

function renderAccessLoading() {
  app.innerHTML = `
    <main class="admin-access-shell">
      <section class="admin-access-card">
        <p class="admin-access-card__eyebrow">Back office</p>
        <h1>Chargement</h1>
        <p>Vérification de votre session administrateur.</p>
      </section>
    </main>
  `;
}

function renderAccessDenied() {
  app.innerHTML = `
    <main class="admin-access-shell">
      <form class="admin-access-card" data-admin-login-form>
        <div class="admin-access-card__header">
          <p class="admin-access-card__eyebrow">Accès réservé</p>
          <div class="admin-access-card__logo" aria-label="Odyssée">
            <img src="/custom-assets/logo-odv-black.png" alt="Odyssée">
          </div>
        </div>
        <p>${escapeHtml(state.accessError || "Connectez-vous avec votre identifiant pour accéder au back office.")}</p>
        <label>
          Identifiant
          <input type="text" value="${escapeHtml(state.loginUsername)}" autocomplete="username" data-admin-login-username required>
        </label>
        <label>
          Mot de passe
          <input type="password" value="${escapeHtml(state.loginPassword)}" autocomplete="current-password" data-admin-login-password required>
        </label>
        <button class="admin-button admin-button--primary" type="submit" ${state.loginBusy ? "disabled" : ""}>
          ${state.loginBusy ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </main>
  `;
}

function renderSidebar() {
  return `
    <aside class="admin-sidebar">
      <div class="admin-sidebar__brand">
        <div class="admin-wordmark">ODYSSEE</div>
        <div class="admin-sidebar__brand-meta">
          <span>Back office</span>
          <strong>Gestion minimale</strong>
        </div>
      </div>
      <nav class="admin-sidebar__nav" aria-label="Navigation admin">
        ${views.map((view) => `
          <a href="#${view.id}" class="${state.activeView === view.id ? "is-active" : ""}">
            ${escapeHtml(view.label)}
            ${view.id === "products" ? `<span class="admin-nav-badge">${getTotalProductCount()}</span>` : ""}
            ${view.id === "accounts" && state.accountsLoaded ? `<span class="admin-nav-badge">${state.accounts.length}</span>` : ""}
            ${view.id === "users" && state.adminUsersLoaded ? `<span class="admin-nav-badge">${state.adminUsers.length}</span>` : ""}
          </a>
        `).join("")}
        <a href="/admin-inbox.html">
          Inbox
          ${state.contactMessagesLoaded ? `<span class="admin-nav-badge">${getUnreadContactMessageCount()}</span>` : ""}
        </a>
      </nav>
      <div class="admin-sidebar__actions">
        <button class="admin-button" type="button" data-admin-logout>Déconnexion</button>
        <a class="admin-button" href="/" target="_blank" rel="noopener noreferrer">Voir le site</a>
      </div>
    </aside>
  `;
}

function renderTopbar() {
  return `
    <header class="admin-topbar">
      <div class="admin-topbar__copy">
        <p class="admin-kicker">Odyssee admin</p>
        <h1>${state.activeView === "products" ? "Disponibilité produits" : state.activeView === "accounts" ? "Comptes clients" : state.activeView === "users" ? "Utilisateurs admin" : "Ajouter par lien"}</h1>
        <p class="admin-topbar__lede">
          ${state.activeView === "products"
            ? "Passez un produit de Disponible à Indisponible sans modifier le catalogue."
            : state.activeView === "accounts"
              ? "Liste propre des comptes créés, exportable en CSV."
              : state.activeView === "users"
                ? "Créez des accès supplémentaires pour les personnes qui doivent gérer le back office."
                : "Déposez un lien Froca, York ou Symphony pour préparer un import produit."}
        </p>
      </div>
      <div class="admin-topbar__actions">
        <button class="admin-button" type="button" data-admin-refresh>Rafraîchir</button>
      </div>
    </header>
  `;
}

function renderOverview() {
  const unavailableCount = getUnavailableProductCount();
  const unreadContactMessageCount = getUnreadContactMessageCount();
  return `
    <section class="admin-overview-grid">
      <div class="admin-overview-lead">
        <span>Back office simplifié</span>
        <strong>Les actions utiles, au même endroit.</strong>
      </div>
      <div class="admin-stat"><span>Produits</span><strong>${getTotalProductCount()}</strong></div>
      <div class="admin-stat"><span>Indisponibles</span><strong>${unavailableCount}</strong></div>
      <div class="admin-stat"><span>Comptes client</span><strong>${state.accountsLoaded ? state.accounts.length : "—"}</strong></div>
      <div class="admin-stat"><span>Comptes Odyssée</span><strong>${state.adminUsersLoaded ? state.adminUsers.length : "—"}</strong></div>
      <a class="admin-stat admin-stat--link" href="/admin-inbox.html"><span>Messages non lus</span><strong>${state.contactMessagesLoaded ? unreadContactMessageCount : "—"}</strong></a>
    </section>
  `;
}

function renderProductsView() {
  const products = getFilteredProducts();
  return `
    <section class="admin-section" data-admin-view="products">
      <div class="admin-section__heading">
        <div>
          <p class="admin-kicker">Catalogue</p>
          <h2>Disponibilité</h2>
        </div>
        <div class="admin-section__aside">
          <span>${products.length} produit${products.length > 1 ? "s" : ""}</span>
        </div>
      </div>
      <div class="admin-toolbar">
        <label class="admin-toolbar__field">
          <span>Rechercher</span>
          <input type="search" value="${escapeHtml(state.productSearch)}" placeholder="Nom, id, type..." data-admin-product-search>
        </label>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Type</th>
              <th>Coloris</th>
              <th>État</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${products.length ? products.flatMap((product) => {
              const status = getProductStatus(product.id);
              const nextStatus = status === "unavailable" ? "available" : "unavailable";
              const busy = state.productUpdating.has(product.id);
              const colorways = product.colorways?.length ? product.colorways : [];
              const expanded = state.expandedProducts.has(product.id);
              const productRow = `
                  <tr class="admin-product-row">
                    <td>
                      <button class="admin-product-toggle" type="button" data-admin-toggle-colorways="${escapeHtml(product.id)}" aria-expanded="${expanded ? "true" : "false"}">
                        <span>${expanded ? "−" : "+"}</span>
                        <strong>${escapeHtml(product.title)}</strong>
                      </button>
                      <div class="admin-table__muted">${escapeHtml(product.id)}</div>
                    </td>
                    <td>${escapeHtml(getProductType(product))}</td>
                    <td>${colorways.length || 1}</td>
                    <td>
                      <span class="admin-status-pill admin-status-pill--${status === "unavailable" ? "blocked" : "active"}">
                        ${getProductStatusLabel(status)}
                      </span>
                    </td>
                    <td>
                      <button
                        class="admin-button ${nextStatus === "unavailable" ? "" : "admin-button--primary"}"
                        type="button"
                        data-admin-product-status="${escapeHtml(product.id)}"
                        data-status="${nextStatus}"
                        ${busy ? "disabled" : ""}
                      >
                        ${busy ? "Mise à jour..." : `Tout passer ${getProductStatusLabel(nextStatus).toLowerCase()}`}
                      </button>
                    </td>
                  </tr>
                `;

              if (!expanded || !colorways.length) {
                return [productRow];
              }

              const colorwayRows = colorways.map((colorway) => {
                const colorwayStatus = getColorwayStatus(product.id, colorway.id);
                const nextColorwayStatus = colorwayStatus === "unavailable" ? "available" : "unavailable";
                const colorwayKey = `${product.id}::${colorway.id}`;
                const colorwayBusy = state.colorwayUpdating.has(colorwayKey);
                const preview = getColorwayPreviewUrl(colorway);

                return `
                  <tr class="admin-colorway-row">
                    <td>
                      <div class="admin-colorway-cell">
                        <span class="admin-colorway-thumb">
                          ${preview ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(colorway.label || colorway.sku || "Coloris")}">` : ""}
                        </span>
                        <span>
                          <strong>${escapeHtml(colorway.label || colorway.sku || colorway.id)}</strong>
                          <span class="admin-table__muted">${escapeHtml(colorway.sku || colorway.id)}</span>
                        </span>
                      </div>
                    </td>
                    <td colspan="2">Coloris</td>
                    <td>
                      <span class="admin-status-pill admin-status-pill--${colorwayStatus === "unavailable" ? "blocked" : "active"}">
                        ${getProductStatusLabel(colorwayStatus)}
                      </span>
                    </td>
                    <td>
                      <button
                        class="admin-button ${nextColorwayStatus === "unavailable" ? "" : "admin-button--primary"}"
                        type="button"
                        data-admin-colorway-status="${escapeHtml(product.id)}"
                        data-colorway-id="${escapeHtml(colorway.id)}"
                        data-status="${nextColorwayStatus}"
                        ${colorwayBusy ? "disabled" : ""}
                      >
                        ${colorwayBusy ? "Mise à jour..." : `Passer ${getProductStatusLabel(nextColorwayStatus).toLowerCase()}`}
                      </button>
                    </td>
                  </tr>
                `;
              });

              return [productRow, ...colorwayRows];
            }).join("") : `<tr><td class="admin-table__empty" colspan="5">Aucun produit trouvé.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAccountsView() {
  const accounts = getFilteredAccounts();
  return `
    <section class="admin-section" data-admin-view="accounts">
      <div class="admin-section__heading">
        <div>
          <p class="admin-kicker">Comptes client</p>
          <h2>Clients inscrits</h2>
        </div>
        <div class="admin-section__aside">
          <button class="admin-button admin-button--primary" type="button" data-admin-export-accounts ${state.accounts.length ? "" : "disabled"}>Exporter CSV</button>
        </div>
      </div>
      <div class="admin-toolbar">
        <label class="admin-toolbar__field">
          <span>Rechercher</span>
          <input type="search" value="${escapeHtml(state.accountsSearch)}" placeholder="Nom, email, téléphone..." data-admin-account-search>
        </label>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Profession</th>
              <th>Créé le</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${accounts.length ? accounts.map((account) => {
              const deleting = state.accountsDeleting.has(account.id);
              return `
                <tr>
                  <td><strong>${escapeHtml(`${account.firstName || ""} ${account.lastName || ""}`.trim() || "—")}</strong></td>
                  <td><a href="mailto:${escapeHtml(account.email)}">${escapeHtml(account.email)}</a></td>
                  <td><a href="tel:${escapeHtml(account.phone)}">${escapeHtml(account.phone || "—")}</a></td>
                  <td>${escapeHtml(account.profession || "—")}</td>
                  <td>${escapeHtml(formatDate(account.createdAt))}</td>
                  <td>
                    <span class="admin-status-pill admin-status-pill--${getAccountStatusClass(account.status)}">
                      ${escapeHtml(getAccountStatusLabel(account.status))}
                    </span>
                  </td>
                  <td>
                    <button
                      class="admin-button admin-button--danger"
                      type="button"
                      data-admin-delete-account="${account.id}"
                      data-account-label="${escapeHtml(`${account.firstName || ""} ${account.lastName || ""}`.trim() || account.email)}"
                      ${deleting ? "disabled" : ""}
                    >
                      ${deleting ? "Suppression..." : "Supprimer"}
                    </button>
                  </td>
                </tr>
              `;
            }).join("") : `<tr><td class="admin-table__empty" colspan="8">Aucun compte trouvé.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderImportView() {
  return `
    <section class="admin-section" data-admin-view="import">
      <div class="admin-section__heading">
        <div>
          <p class="admin-kicker">Import</p>
          <h2>Ajouter un produit par lien</h2>
        </div>
      </div>
      <div class="admin-grid admin-grid--two">
        <form class="admin-surface admin-panel" data-admin-import-form>
          <div class="admin-surface__intro">
            <h3>Lien produit</h3>
            <p>Sources acceptées pour la file d’import : Froca, York Wallcoverings, Symphony Mills.</p>
          </div>
          <label>
            Lien
            <input type="url" value="${escapeHtml(state.importUrl)}" placeholder="https://..." data-admin-import-url required>
          </label>
          <div class="admin-panel__actions">
            <button class="admin-button admin-button--primary" type="submit" ${state.importBusy ? "disabled" : ""}>
              ${state.importBusy ? "Enregistrement..." : "Ajouter à la file"}
            </button>
          </div>
          ${state.notice ? `<p class="admin-table__muted">${escapeHtml(state.notice)}</p>` : ""}
        </form>
        <div class="admin-surface">
          <div class="admin-surface__intro">
            <h3>File récente</h3>
            <p>Ces liens sont enregistrés côté back office. L’import automatique live reste à finaliser dans le pipeline catalogue.</p>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Lien</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${state.importJobs.length ? state.importJobs.map((job) => `
                  <tr>
                    <td>
                      <a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.url)}</a>
                      <div class="admin-table__muted">${escapeHtml(job.message || "")}</div>
                    </td>
                    <td><span class="admin-status-pill">${escapeHtml(job.status)}</span></td>
                    <td>${escapeHtml(formatDate(job.createdAt))}</td>
                  </tr>
                `).join("") : `<tr><td class="admin-table__empty" colspan="3">Aucun lien enregistré.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderUsersView() {
  return `
    <section class="admin-section" data-admin-view="users">
      <div class="admin-section__heading">
        <div>
          <p class="admin-kicker">Back office</p>
          <h2>Utilisateurs admin</h2>
        </div>
        <div class="admin-section__aside">
          <span>${state.adminUsers.length} utilisateur${state.adminUsers.length > 1 ? "s" : ""}</span>
        </div>
      </div>
      <div class="admin-grid admin-grid--two">
        <form class="admin-surface admin-panel" data-admin-create-user-form>
          <div class="admin-surface__intro">
            <h3>Créer un accès</h3>
            <p>Ce compte servira uniquement à accéder au back office, pas au parcours client.</p>
          </div>
          <label>
            Identifiant
            <input type="text" value="${escapeHtml(state.newAdminUsername)}" placeholder="ex: Sarah" autocomplete="off" data-admin-new-username required>
          </label>
          <label>
            Mot de passe
            <input type="password" value="${escapeHtml(state.newAdminPassword)}" placeholder="Minimum 10 caractères" autocomplete="new-password" data-admin-new-password required>
          </label>
          <div class="admin-panel__actions">
            <button class="admin-button admin-button--primary" type="submit" ${state.createAdminBusy ? "disabled" : ""}>
              ${state.createAdminBusy ? "Création..." : "Créer le compte"}
            </button>
          </div>
          ${state.notice ? `<p class="admin-table__muted">${escapeHtml(state.notice)}</p>` : ""}
        </form>
        <div class="admin-surface">
          <div class="admin-surface__intro">
            <h3>Accès existants</h3>
            <p>L’identifiant par défaut est Admin.</p>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th>Dernière connexion</th>
                </tr>
              </thead>
              <tbody>
                ${state.adminUsers.length ? state.adminUsers.map((user) => `
                  <tr>
                    <td><strong>${escapeHtml(user.username)}</strong></td>
                    <td>
                      <span class="admin-status-pill admin-status-pill--${user.status === "active" ? "active" : "blocked"}">
                        ${user.status === "active" ? "Actif" : "Bloqué"}
                      </span>
                    </td>
                    <td>${escapeHtml(formatDate(user.createdAt))}</td>
                    <td>${escapeHtml(formatDate(user.lastLoginAt))}</td>
                  </tr>
                `).join("") : `<tr><td class="admin-table__empty" colspan="4">Aucun utilisateur admin.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderMain() {
  const viewMarkup = state.activeView === "accounts"
    ? renderAccountsView()
    : state.activeView === "import"
      ? renderImportView()
      : state.activeView === "users"
        ? renderUsersView()
      : renderProductsView();

  app.innerHTML = `
    <div class="admin-shell">
      ${renderSidebar()}
      <main class="admin-main">
        ${renderTopbar()}
        ${renderOverview()}
        ${viewMarkup}
      </main>
    </div>
  `;
}

function render() {
  if (!state.accessLoaded) {
    renderAccessLoading();
    return;
  }

  if (!state.accessAllowed) {
    renderAccessDenied();
    return;
  }

  renderMain();
}

async function loadAccess() {
  render();
  try {
    const response = await apiFetch("/api/admin-auth/me");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.authenticated) {
      state.accessLoaded = true;
      state.accessAllowed = false;
      state.accessError = payload.error || "";
      render();
      return;
    }

    state.accessLoaded = true;
    state.accessAllowed = true;
    render();
    await Promise.all([loadProductStatuses(), loadAccounts(), loadContactMessages(), loadImportJobs(), loadAdminUsers()]);
  } catch (error) {
    state.accessLoaded = true;
    state.accessAllowed = false;
    state.accessError = error.message || "Impossible de vérifier la session.";
    render();
  }
}

async function loginAdmin() {
  state.loginBusy = true;
  state.accessError = "";
  render();
  try {
    const response = await apiFetch("/api/admin-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: state.loginUsername,
        password: state.loginPassword
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.authenticated) {
      throw new Error(payload.error || "Connexion impossible.");
    }
    state.accessLoaded = true;
    state.accessAllowed = true;
    state.loginPassword = "";
    render();
    await Promise.all([loadProductStatuses(), loadAccounts(), loadContactMessages(), loadImportJobs(), loadAdminUsers()]);
  } catch (error) {
    state.accessAllowed = false;
    state.accessError = error.message || "Connexion impossible.";
  } finally {
    state.loginBusy = false;
    render();
  }
}

async function logoutAdmin() {
  await apiFetch("/api/admin-auth/logout", { method: "POST" }).catch(() => {});
  state.accessAllowed = false;
  state.accessError = "";
  state.loginPassword = "";
  render();
}

async function loadProductStatuses() {
  try {
    const response = await apiFetch("/api/admin/product-statuses");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Chargement impossible.");
    }
    state.productStatuses = new Map((payload.statuses || []).map((item) => [item.productId, item.status]));
    state.colorwayStatuses = new Map(
      (payload.colorwayStatuses || []).map((item) => [`${item.productId}::${item.colorwayId}`, item.status])
    );
    state.productsLoaded = true;
    render();
  } catch (error) {
    state.notice = error.message || "Impossible de charger les statuts produits.";
    render();
  }
}

async function loadAccounts() {
  try {
    const response = await apiFetch("/api/admin/professionals");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Chargement impossible.");
    }
    state.accounts = payload.professionals || [];
    state.accountsLoaded = true;
    render();
  } catch (error) {
    state.notice = error.message || "Impossible de charger les comptes.";
    render();
  }
}

async function loadContactMessages() {
  try {
    const response = await apiFetch("/api/admin/contact-messages");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Chargement impossible.");
    }
    state.contactMessages = payload.messages || [];
    state.contactMessagesLoaded = true;
    render();
  } catch (error) {
    state.notice = error.message || "Impossible de charger les messages.";
    render();
  }
}

async function deleteAccount(userId, label) {
  const confirmed = window.confirm(`Supprimer définitivement le compte client "${label}" ?`);
  if (!confirmed) {
    return;
  }

  state.accountsDeleting.add(userId);
  render();
  try {
    const response = await apiFetch(`/api/admin/professionals/${encodeURIComponent(userId)}`, {
      method: "DELETE"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Suppression impossible.");
    }
    state.accounts = state.accounts.filter((account) => account.id !== userId);
    state.notice = "";
  } catch (error) {
    state.notice = error.message || "Suppression impossible.";
  } finally {
    state.accountsDeleting.delete(userId);
    render();
  }
}

async function loadImportJobs() {
  try {
    const response = await apiFetch("/api/admin/product-import-jobs");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Chargement impossible.");
    }
    state.importJobs = payload.jobs || [];
    state.importJobsLoaded = true;
    render();
  } catch (error) {
    state.notice = error.message || "Impossible de charger la file d'import.";
    render();
  }
}

async function loadAdminUsers() {
  try {
    const response = await apiFetch("/api/admin/users");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Chargement impossible.");
    }
    state.adminUsers = payload.users || [];
    state.adminUsersLoaded = true;
    render();
  } catch (error) {
    state.notice = error.message || "Impossible de charger les utilisateurs admin.";
    render();
  }
}

async function refreshActiveView() {
  if (state.activeView === "accounts") {
    await loadAccounts();
  } else if (state.activeView === "import") {
    await loadImportJobs();
  } else if (state.activeView === "users") {
    await loadAdminUsers();
  } else {
    await Promise.all([loadProductStatuses(), loadContactMessages()]);
  }
}

async function updateProductStatus(productId, status) {
  state.productUpdating.add(productId);
  render();
  try {
    const response = await apiFetch(`/api/admin/product-statuses/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Mise à jour impossible.");
    }
    state.productStatuses.set(productId, status);
    state.notice = "";
  } catch (error) {
    state.notice = error.message || "Mise à jour impossible.";
  } finally {
    state.productUpdating.delete(productId);
    render();
  }
}

async function updateColorwayStatus(productId, colorwayId, status) {
  const key = `${productId}::${colorwayId}`;
  state.colorwayUpdating.add(key);
  render();
  try {
    const response = await apiFetch(
      `/api/admin/product-statuses/${encodeURIComponent(productId)}/colorways/${encodeURIComponent(colorwayId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Mise à jour impossible.");
    }
    state.colorwayStatuses.set(key, status);
    state.notice = "";
  } catch (error) {
    state.notice = error.message || "Mise à jour impossible.";
  } finally {
    state.colorwayUpdating.delete(key);
    render();
  }
}

async function submitImportJob() {
  const url = state.importUrl.trim();
  if (!url) return;

  state.importBusy = true;
  state.notice = "";
  render();
  try {
    const response = await apiFetch("/api/admin/product-import-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Lien impossible à enregistrer.");
    }
    state.importUrl = "";
    state.notice = payload.job?.message || "Lien enregistré.";
    await loadImportJobs();
  } catch (error) {
    state.notice = error.message || "Lien impossible à enregistrer.";
  } finally {
    state.importBusy = false;
    render();
  }
}

async function createAdminUser() {
  const username = state.newAdminUsername.trim();
  const password = state.newAdminPassword;
  if (!username || !password) return;

  state.createAdminBusy = true;
  state.notice = "";
  render();
  try {
    const response = await apiFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Création impossible.");
    }
    state.newAdminUsername = "";
    state.newAdminPassword = "";
    state.notice = "Utilisateur admin créé.";
    await loadAdminUsers();
  } catch (error) {
    state.notice = error.message || "Création impossible.";
  } finally {
    state.createAdminBusy = false;
    render();
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportAccountsCsv() {
  const rows = [
    ["Prénom", "Nom", "Email", "Téléphone", "Profession", "Statut", "Créé le"],
    ...state.accounts.map((account) => [
      account.firstName,
      account.lastName,
      account.email,
      account.phone,
      account.profession,
      getAccountStatusLabel(account.status),
      account.createdAt
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `odyssee-comptes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

app.addEventListener("input", (event) => {
  const target = event.target instanceof HTMLInputElement ? event.target : null;
  if (!target) return;

  if (target.matches("[data-admin-product-search]")) {
    state.productSearch = target.value;
    render();
  }

  if (target.matches("[data-admin-login-username]")) {
    state.loginUsername = target.value;
  }

  if (target.matches("[data-admin-login-password]")) {
    state.loginPassword = target.value;
  }

  if (target.matches("[data-admin-account-search]")) {
    state.accountsSearch = target.value;
    render();
  }

  if (target.matches("[data-admin-import-url]")) {
    state.importUrl = target.value;
  }

  if (target.matches("[data-admin-new-username]")) {
    state.newAdminUsername = target.value;
  }

  if (target.matches("[data-admin-new-password]")) {
    state.newAdminPassword = target.value;
  }
});

app.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const statusButton = target.closest("[data-admin-product-status]");
  if (statusButton instanceof HTMLButtonElement) {
    updateProductStatus(statusButton.dataset.adminProductStatus || "", statusButton.dataset.status || "available");
    return;
  }

  const colorwayButton = target.closest("[data-admin-colorway-status]");
  if (colorwayButton instanceof HTMLButtonElement) {
    updateColorwayStatus(
      colorwayButton.dataset.adminColorwayStatus || "",
      colorwayButton.dataset.colorwayId || "",
      colorwayButton.dataset.status || "available"
    );
    return;
  }

  const toggleButton = target.closest("[data-admin-toggle-colorways]");
  if (toggleButton instanceof HTMLButtonElement) {
    const productId = toggleButton.dataset.adminToggleColorways || "";
    if (state.expandedProducts.has(productId)) {
      state.expandedProducts.delete(productId);
    } else {
      state.expandedProducts.add(productId);
    }
    render();
    return;
  }

  if (target.closest("[data-admin-export-accounts]")) {
    exportAccountsCsv();
    return;
  }

  const deleteAccountButton = target.closest("[data-admin-delete-account]");
  if (deleteAccountButton instanceof HTMLButtonElement) {
    const userId = Number(deleteAccountButton.dataset.adminDeleteAccount);
    const label = deleteAccountButton.dataset.accountLabel || "ce compte";
    if (Number.isInteger(userId) && userId > 0) {
      deleteAccount(userId, label);
    }
    return;
  }

  if (target.closest("[data-admin-refresh]")) {
    refreshActiveView();
    return;
  }

  if (target.closest("[data-admin-logout]")) {
    logoutAdmin();
  }
});

app.addEventListener("submit", (event) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form) {
    return;
  }

  if (form.matches("[data-admin-login-form]")) {
    event.preventDefault();
    loginAdmin();
    return;
  }

  if (form.matches("[data-admin-import-form]")) {
    event.preventDefault();
    submitImportJob();
    return;
  }

  if (form.matches("[data-admin-create-user-form]")) {
    event.preventDefault();
    createAdminUser();
  }
});

window.addEventListener("hashchange", () => {
  state.activeView = getActiveViewFromHash();
  render();
  refreshActiveView();
});

loadAccess();
