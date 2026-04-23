import {
  ADMIN_ASSET_OPTIONS,
  DEFAULT_SITE_CONTENT,
  loadSiteContent,
  resetSiteContent,
  saveSiteContent
} from "./site-content.js";
import { apiFetch } from "./api-client.js";
import { getProductCatalogItemById, getProductColorwayById, productCatalogItems } from "./product-catalog-data.js";
import { parseProductSelectionKey } from "./product-selection.js";

const state = {
  content: loadSiteContent(),
  accessLoaded: false,
  accessAllowed: false,
  accessError: "",
  professionals: [],
  professionalsLoaded: false,
  professionalsError: "",
  professionalsUpdating: [],
  professionalsStatusUpdating: [],
  sampleOrders: [],
  sampleOrdersLoaded: false,
  sampleOrdersError: "",
  contactUnreadCount: 0,
  sampleOrdersUpdating: [],
  sampleOrderDraftNotes: {},
  sampleOrdersSearch: "",
  sampleOrdersDate: "",
  sampleOrdersSort: "date-desc",
  sampleOrdersPage: 1,
  sampleOrdersPageSize: 10,
  assetDraftLabel: "",
  assetDraftSrc: ""
};

const catalogStats = {
  parentProducts: productCatalogItems.length,
  visibleProducts: productCatalogItems.reduce((count, item) => count + (Array.isArray(item.colorways) && item.colorways.length ? item.colorways.length : 1), 0)
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
            ${renderAssetOptions(card.image)}
          </select>
        </label>
      </div>
    </article>
  `;
}

function getAdminAssets() {
  if (Array.isArray(state.content.assets)) {
    return state.content.assets;
  }

  return ADMIN_ASSET_OPTIONS;
}

function ensureAssetOption(selectedSrc) {
  const normalizedSrc = String(selectedSrc || "").trim();
  const assets = getAdminAssets();
  if (!normalizedSrc) {
    return assets;
  }

  const hasMatch = assets.some((asset) => asset.src === normalizedSrc);
  if (hasMatch) {
    return assets;
  }

  return [
    {
      id: `orphan-${normalizedSrc}`,
      label: "Asset actuel",
      src: normalizedSrc
    },
    ...assets
  ];
}

function renderAssetOptions(selectedSrc = "") {
  return ensureAssetOption(selectedSrc).map((asset) => `
    <option value="${asset.src}" ${asset.src === selectedSrc ? "selected" : ""}>${escapeHtml(asset.label)}</option>
  `).join("");
}

function slugifyAssetId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAssetId(label, src) {
  return slugifyAssetId(label) || slugifyAssetId(src) || `asset-${Date.now()}`;
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
            <th>Statut</th>
            <th>Quota</th>
            <th>Échantillons</th>
            <th>Créé le</th>
          </tr>
        </thead>
        <tbody>
          ${state.professionals.map((professional) => `
            ${(() => {
              const isUpdating = state.professionalsUpdating.includes(professional.id);
              const isStatusUpdating = state.professionalsStatusUpdating.includes(professional.id);
              return `
            <tr>
              <td>${escapeHtml(professional.lastName)}</td>
              <td>${escapeHtml(professional.firstName)}</td>
              <td>${escapeHtml(professional.phone)}</td>
              <td><a href="mailto:${escapeHtml(professional.email)}">${escapeHtml(professional.email)}</a></td>
              <td>${escapeHtml(professional.profession)}</td>
              <td>
                <div class="admin-account-status">
                  <span class="admin-status-pill admin-status-pill--${escapeHtml(professional.status || "active")}">${escapeHtml(professional.status || "active")}</span>
                  <button
                    type="button"
                    class="admin-status-action"
                    data-admin-professional-status="${professional.status === "blocked" ? "active" : "blocked"}"
                    data-admin-professional-id="${professional.id}"
                    ${isStatusUpdating ? "disabled" : ""}
                  >
                    ${professional.status === "blocked" ? "Réactiver" : "Bloquer"}
                  </button>
                </div>
              </td>
              <td>
                <div class="admin-quota-control" role="group" aria-label="Quota d'échantillons de ${escapeHtml(`${professional.firstName} ${professional.lastName}`.trim())}">
                  <button type="button" class="admin-quota-control__button" data-admin-sample-limit-delta="-1" data-admin-user-id="${professional.id}" ${isUpdating || professional.sampleLimit <= 0 ? "disabled" : ""}>-</button>
                  <strong>${escapeHtml(String(professional.sampleLimit))}</strong>
                  <button type="button" class="admin-quota-control__button" data-admin-sample-limit-delta="1" data-admin-user-id="${professional.id}" ${isUpdating ? "disabled" : ""}>+</button>
                </div>
              </td>
              <td>${escapeHtml(String(professional.sampleCount))}</td>
              <td>${escapeHtml(professional.createdAt)}</td>
            </tr>
          `;
            })()}
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function describeSampleSelection(selectionKey) {
  const { productId, colorwayId, selectionKey: normalizedKey } = parseProductSelectionKey(selectionKey);
  const product = getProductCatalogItemById(productId);
  const colorway = product ? getProductColorwayById(product, colorwayId) : null;

  if (!product) {
    return {
      title: normalizedKey || selectionKey,
      subtitle: ""
    };
  }

  return {
    title: product.title,
    subtitle: colorway?.label ? `Coloris : ${colorway.label}` : ""
  };
}

function getFilteredSampleOrders() {
  const search = state.sampleOrdersSearch.trim().toLowerCase();
  const date = state.sampleOrdersDate.trim();
  const filteredOrders = state.sampleOrders.filter((order) => {
    const fullName = `${order.firstName || ""} ${order.lastName || ""}`.trim().toLowerCase();
    const submittedDate = String(order.submittedAt || order.createdAt || "").slice(0, 10);
    const matchesSearch = !search || fullName.includes(search);
    const matchesDate = !date || submittedDate === date;
    return matchesSearch && matchesDate;
  });

  filteredOrders.sort((left, right) => {
    const leftName = `${left.firstName || ""} ${left.lastName || ""}`.trim().toLowerCase();
    const rightName = `${right.firstName || ""} ${right.lastName || ""}`.trim().toLowerCase();
    const leftDate = new Date(left.submittedAt || left.createdAt || 0).getTime();
    const rightDate = new Date(right.submittedAt || right.createdAt || 0).getTime();

    switch (state.sampleOrdersSort) {
      case "date-asc":
        return leftDate - rightDate;
      case "name-asc":
        return leftName.localeCompare(rightName, "fr");
      case "name-desc":
        return rightName.localeCompare(leftName, "fr");
      case "date-desc":
      default:
        return rightDate - leftDate;
    }
  });

  return filteredOrders;
}

function getSampleOrdersPaginationMeta() {
  const filteredOrders = getFilteredSampleOrders();
  const totalItems = filteredOrders.length;
  const pageSize = state.sampleOrdersPageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, state.sampleOrdersPage), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    filteredOrders,
    totalItems,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    paginatedOrders: filteredOrders.slice(startIndex, endIndex)
  };
}

function toCsvValue(value) {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

function exportSampleOrdersCsv() {
  const { filteredOrders } = getSampleOrdersPaginationMeta();
  if (!filteredOrders.length) {
    window.alert("Aucune demande à exporter avec les filtres actuels.");
    render();
    return;
  }

  const rows = [
    [
      "Commande",
      "Client",
      "Email",
      "Téléphone",
      "Statut",
      "Date de soumission",
      "Échantillons",
      "Notes internes"
    ],
    ...filteredOrders.map((order) => [
      order.id,
      `${order.firstName || ""} ${order.lastName || ""}`.trim(),
      order.email || "",
      order.phone || "",
      order.status || "pending",
      order.submittedAt || order.createdAt || "",
      (order.productIds || []).map((selectionKey) => {
        const selection = describeSampleSelection(selectionKey);
        return selection.subtitle ? `${selection.title} (${selection.subtitle})` : selection.title;
      }).join(" | "),
      order.adminNotes || ""
    ])
  ];

  const csvContent = rows
    .map((row) => row.map((value) => toCsvValue(value)).join(","))
    .join("\n");

  const blob = new Blob([`\ufeff${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `odc-demandes-echantillons-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderSampleOrdersTable() {
  if (state.sampleOrdersError) {
    return `<div class="admin-table__empty">${escapeHtml(state.sampleOrdersError)}</div>`;
  }

  if (!state.sampleOrdersLoaded) {
    return `<div class="admin-table__empty">Chargement des demandes d’échantillons...</div>`;
  }

  if (!state.sampleOrders.length) {
    return `<div class="admin-table__empty">Aucune demande d’échantillons enregistrée pour l’instant.</div>`;
  }

  const {
    totalItems,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    paginatedOrders
  } = getSampleOrdersPaginationMeta();

  if (!totalItems) {
    return `<div class="admin-table__empty">Aucune demande ne correspond aux filtres actuels.</div>`;
  }

  return `
    <div class="admin-table-meta">
      <span>${escapeHtml(String(startIndex + 1))}-${escapeHtml(String(endIndex))} sur ${escapeHtml(String(totalItems))}</span>
      <div class="admin-pagination" role="group" aria-label="Pagination des demandes d’échantillons">
        <button type="button" class="admin-button" data-admin-sample-orders-page="prev" ${currentPage <= 1 ? "disabled" : ""}>Préc</button>
        <span>Page ${escapeHtml(String(currentPage))} / ${escapeHtml(String(totalPages))}</span>
        <button type="button" class="admin-button" data-admin-sample-orders-page="next" ${currentPage >= totalPages ? "disabled" : ""}>Suiv</button>
      </div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Commande</th>
            <th>Client</th>
            <th>Contact</th>
            <th>Échantillons</th>
            <th>Statut</th>
            <th>Actions</th>
            <th>Notes internes</th>
            <th>Soumise le</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedOrders.map((order) => `
            ${(() => {
              const isUpdating = state.sampleOrdersUpdating.includes(order.id);
              const noteValue = Object.prototype.hasOwnProperty.call(state.sampleOrderDraftNotes, order.id)
                ? state.sampleOrderDraftNotes[order.id]
                : (order.adminNotes || "");
              return `
            <tr>
              <td>
                <strong>#${escapeHtml(String(order.id))}</strong><br />
                <span class="admin-table__muted">${escapeHtml(String(order.productIds?.length || 0))} ligne${(order.productIds?.length || 0) > 1 ? "s" : ""}</span>
              </td>
              <td>
                <strong>${escapeHtml(`${order.firstName} ${order.lastName}`.trim())}</strong><br />
                <span class="admin-table__muted">Compte #${escapeHtml(String(order.userId))}</span>
              </td>
              <td>
                <a href="mailto:${escapeHtml(order.email)}">${escapeHtml(order.email)}</a><br />
                <span class="admin-table__muted">${escapeHtml(order.phone)}</span>
              </td>
              <td>
                <div class="admin-order-lines">
                  ${(order.productIds || []).map((selectionKey) => {
                    const selection = describeSampleSelection(selectionKey);
                    return `
                      <div class="admin-order-line">
                        <strong>${escapeHtml(selection.title)}</strong>
                        ${selection.subtitle ? `<span>${escapeHtml(selection.subtitle)}</span>` : ""}
                      </div>
                    `;
                  }).join("")}
                </div>
              </td>
              <td><span class="admin-status-pill admin-status-pill--${escapeHtml(order.status || "pending")}">${escapeHtml(order.status || "pending")}</span></td>
              <td>
                <div class="admin-status-actions" role="group" aria-label="Mettre à jour le statut de la commande ${escapeHtml(String(order.id))}">
                  <button type="button" class="admin-status-action ${order.status === "pending" ? "is-active" : ""}" data-admin-order-status="pending" data-admin-order-id="${order.id}" ${isUpdating ? "disabled" : ""}>Pending</button>
                  <button type="button" class="admin-status-action ${order.status === "processing" ? "is-active" : ""}" data-admin-order-status="processing" data-admin-order-id="${order.id}" ${isUpdating ? "disabled" : ""}>Processing</button>
                  <button type="button" class="admin-status-action ${order.status === "completed" ? "is-active" : ""}" data-admin-order-status="completed" data-admin-order-id="${order.id}" ${isUpdating ? "disabled" : ""}>Completed</button>
                </div>
              </td>
              <td>
                <div class="admin-order-notes">
                  <textarea rows="4" class="admin-order-notes__field" data-admin-order-notes="${order.id}" ${isUpdating ? "disabled" : ""}>${escapeHtml(noteValue)}</textarea>
                  <button type="button" class="admin-status-action" data-admin-order-save-notes="${order.id}" ${isUpdating ? "disabled" : ""}>Enregistrer</button>
                </div>
              </td>
              <td>${escapeHtml(order.submittedAt || order.createdAt || "")}</td>
            </tr>
          `;
            })()}
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadAdminAccess() {
  state.accessLoaded = false;
  state.accessAllowed = false;
  state.accessError = "";
  render();

  try {
    const response = await apiFetch("/api/auth/me");
    if (!response.ok) {
      throw new Error("Impossible de vérifier la session administrateur.");
    }

    const payload = await response.json();
    if (!payload?.authenticated) {
      state.accessError = "Connexion administrateur requise.";
      state.accessLoaded = true;
      render();
      return;
    }

    if (payload?.user?.role !== "admin") {
      state.accessError = "Accès administrateur requis.";
      state.accessLoaded = true;
      render();
      return;
    }

    state.accessAllowed = true;
    state.accessError = "";
    state.accessLoaded = true;
    render();
    void loadProfessionals();
    void loadSampleOrders();
    void loadContactInboxSummary();
  } catch (error) {
    state.accessError = error.message || "Impossible de vérifier la session administrateur.";
    state.accessLoaded = true;
    render();
  }
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

async function loadSampleOrders() {
  try {
    const response = await apiFetch("/api/admin/sample-orders");
    if (!response.ok) {
      throw new Error("Impossible de charger les demandes d’échantillons.");
    }
    const payload = await response.json();
    state.sampleOrders = Array.isArray(payload.sampleOrders) ? payload.sampleOrders : [];
    state.sampleOrderDraftNotes = {};
    state.sampleOrdersError = "";
  } catch (error) {
    state.sampleOrders = [];
    state.sampleOrdersError = error.message || "Impossible de charger les demandes d’échantillons.";
  }

  state.sampleOrdersLoaded = true;
  render();
}

async function loadContactInboxSummary() {
  try {
    const response = await apiFetch("/api/admin/contact-messages");
    if (!response.ok) {
      throw new Error("Impossible de charger l’inbox.");
    }

    const payload = await response.json();
    state.contactUnreadCount = Number(payload?.unreadCount) || 0;
  } catch {
    state.contactUnreadCount = 0;
  }

  render();
}

async function updateProfessionalSampleLimit(userId, nextSampleLimit) {
  if (!Number.isInteger(userId) || userId <= 0) return;
  if (!Number.isFinite(nextSampleLimit) || nextSampleLimit < 0) return;

  state.professionalsUpdating = [...new Set([...state.professionalsUpdating, userId])];
  state.professionalsError = "";
  render();

  try {
    const response = await apiFetch(`/api/admin/professionals/${userId}/sample-limit`, {
      method: "PATCH",
      body: JSON.stringify({ sampleLimit: nextSampleLimit })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Impossible de mettre à jour le quota.");
    }

    state.professionals = state.professionals.map((professional) => (
      professional.id === userId
        ? { ...professional, sampleLimit: nextSampleLimit }
        : professional
    ));
  } catch (error) {
    state.professionalsError = error.message || "Impossible de mettre à jour le quota.";
  } finally {
    state.professionalsUpdating = state.professionalsUpdating.filter((id) => id !== userId);
    render();
  }
}

async function updateProfessionalStatus(userId, status) {
  if (!Number.isInteger(userId) || userId <= 0) return;
  if (!["active", "blocked"].includes(status)) return;

  state.professionalsStatusUpdating = [...new Set([...state.professionalsStatusUpdating, userId])];
  state.professionalsError = "";
  render();

  try {
    const response = await apiFetch(`/api/admin/professionals/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Impossible de mettre à jour le statut du compte.");
    }

    state.professionals = state.professionals.map((professional) => (
      professional.id === userId
        ? { ...professional, status }
        : professional
    ));
  } catch (error) {
    state.professionalsError = error.message || "Impossible de mettre à jour le statut du compte.";
  } finally {
    state.professionalsStatusUpdating = state.professionalsStatusUpdating.filter((id) => id !== userId);
    render();
  }
}

async function updateSampleOrderStatus(orderId, status) {
  if (!Number.isInteger(orderId) || !status) return;

  state.sampleOrdersUpdating = [...new Set([...state.sampleOrdersUpdating, orderId])];
  state.sampleOrdersError = "";
  render();

  try {
    const response = await apiFetch(`/api/admin/sample-orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Impossible de mettre à jour le statut.");
    }

    state.sampleOrders = state.sampleOrders.map((order) => (
      order.id === orderId
        ? { ...order, status: payload?.status || status, adminNotes: payload?.adminNotes ?? order.adminNotes }
        : order
    ));
  } catch (error) {
    state.sampleOrdersError = error.message || "Impossible de mettre à jour le statut.";
  } finally {
    state.sampleOrdersUpdating = state.sampleOrdersUpdating.filter((id) => id !== orderId);
    render();
  }
}

async function updateSampleOrderNotes(orderId, adminNotes) {
  if (!Number.isInteger(orderId)) return;

  state.sampleOrdersUpdating = [...new Set([...state.sampleOrdersUpdating, orderId])];
  state.sampleOrdersError = "";
  render();

  try {
    const response = await apiFetch(`/api/admin/sample-orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ adminNotes })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Impossible d’enregistrer la note.");
    }

    state.sampleOrders = state.sampleOrders.map((order) => (
      order.id === orderId
        ? { ...order, status: payload?.status || order.status, adminNotes: payload?.adminNotes ?? adminNotes }
        : order
    ));
    delete state.sampleOrderDraftNotes[orderId];
  } catch (error) {
    state.sampleOrdersError = error.message || "Impossible d’enregistrer la note.";
  } finally {
    state.sampleOrdersUpdating = state.sampleOrdersUpdating.filter((id) => id !== orderId);
    render();
  }
}

function render() {
  const app = document.querySelector("#admin-app");
  if (!app) return;

  const { home, contract, showrooms, products } = state.content;
  const assetLibrary = getAdminAssets();
  const pendingOrders = state.sampleOrders.filter((order) => order.status === "pending").length;
  const blockedProfessionals = state.professionals.filter((professional) => professional.status === "blocked").length;
  const activeProfessionals = state.professionals.length - blockedProfessionals;
  const contactUnreadBadge = state.contactUnreadCount > 0
    ? `<span class="admin-nav-badge">${escapeHtml(String(state.contactUnreadCount))}</span>`
    : "";

  if (!state.accessLoaded) {
    app.innerHTML = `
      <div class="admin-access-shell">
        <section class="admin-access-card">
          <div class="admin-wordmark" aria-label="Odyssée">ODYSSEE</div>
          <p class="admin-access-card__eyebrow">Admin</p>
          <h1>Ouverture du back office…</h1>
        </section>
      </div>
    `;
    return;
  }

  if (!state.accessAllowed) {
    app.innerHTML = `
      <div class="admin-access-shell">
        <section class="admin-access-card">
          <div class="admin-wordmark" aria-label="Odyssée">ODYSSEE</div>
          <p class="admin-access-card__eyebrow">Admin</p>
          <h1>Accès refusé</h1>
          <p>${escapeHtml(state.accessError || "Accès administrateur requis.")}</p>
        </section>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-sidebar__brand">
          <img class="admin-sidebar__logo" src="/custom-assets/logo-odc-white.png" alt="Odyssée" />
          <div class="admin-sidebar__brand-meta">
            <span>Admin</span>
            <strong>Control Room</strong>
          </div>
        </div>
        <nav class="admin-sidebar__nav" aria-label="Navigation admin">
          <a href="#admin-overview">Vue d’ensemble</a>
          <a href="/admin-inbox.html">Inbox ${contactUnreadBadge}</a>
          <a href="#admin-sample-orders">Demandes</a>
          <a href="#admin-professionals">Comptes pro</a>
          <a href="#admin-products">Imports produits</a>
          <a href="#admin-home">Home</a>
          <a href="#admin-contract">Contract</a>
          <a href="#admin-showrooms">Showrooms</a>
          <a href="#admin-assets">Assets</a>
        </nav>
        <div class="admin-sidebar__actions">
          <button type="button" class="admin-button admin-button--primary" data-admin-save>Enregistrer</button>
          <button type="button" class="admin-button" data-admin-reset>Réinitialiser</button>
        </div>
      </aside>

      <main class="admin-main">
        <header id="admin-overview" class="admin-topbar">
          <div class="admin-topbar__copy">
            <p class="admin-kicker">Odyssée</p>
            <h1>Back office</h1>
            <p class="admin-topbar__lede">Catalogue, comptes pro, demandes et bibliothèque visuelle dans un seul espace clair.</p>
          </div>
          <div class="admin-topbar__actions">
            <a class="admin-button" href="/admin-inbox.html">Inbox${state.contactUnreadCount > 0 ? ` (${escapeHtml(String(state.contactUnreadCount))})` : ""}</a>
            <button type="button" class="admin-button admin-button--primary" data-admin-save>Enregistrer</button>
            <button type="button" class="admin-button" data-admin-reset>Réinitialiser</button>
          </div>
        </header>

        <section class="admin-overview-grid">
          <article class="admin-overview-lead">
            <p class="admin-kicker">Catalogue live</p>
            <div class="admin-overview-lead__numbers">
              <strong>${catalogStats.visibleProducts}</strong>
              <span>produits visibles</span>
            </div>
            <p class="admin-overview-lead__meta">${catalogStats.parentProducts} familles produit actives dans le catalogue actuel.</p>
          </article>
          <article class="admin-stat">
            <span>Demandes en attente</span>
            <strong>${pendingOrders}</strong>
          </article>
          <article class="admin-stat">
            <span>Comptes actifs</span>
            <strong>${activeProfessionals}</strong>
          </article>
          <article class="admin-stat">
            <span>Comptes bloqués</span>
            <strong>${Math.max(0, blockedProfessionals)}</strong>
          </article>
          <article class="admin-stat">
            <span>Imports en file</span>
            <strong>${products.importLinks.length}</strong>
          </article>
          <article class="admin-stat">
            <span>Cartes home</span>
            <strong>${home.shortcuts.length}</strong>
          </article>
          <article class="admin-stat">
            <span>Assets en bibliothèque</span>
            <strong>${assetLibrary.length}</strong>
          </article>
        </section>

        <section id="admin-products" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Produits</p><h2>Imports</h2></div>
            <div class="admin-section__aside">
              <span>${catalogStats.visibleProducts} références visibles</span>
              <span>${catalogStats.parentProducts} produits parents</span>
            </div>
          </div>
          <div class="admin-grid admin-grid--two">
            <div class="admin-surface">
              <label class="admin-panel__label">Liens à ajouter
                <textarea rows="8" id="admin-product-links-input" placeholder="https://www.odyssee.ma/produits/p/...\nhttps://www.odyssee.ma/produits/p/..."></textarea>
              </label>
              <div class="admin-panel__actions">
                <button type="button" class="admin-button admin-button--primary" data-admin-add-links>Ajouter à la file</button>
              </div>
            </div>
            <div class="admin-surface">
              <h3>File active</h3>
              <ul class="admin-link-list">${renderProductQueue()}</ul>
            </div>
          </div>
        </section>

        <section id="admin-professionals" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Professionnels</p><h2>Comptes</h2></div>
          </div>
          <div class="admin-surface">
            ${renderProfessionalsTable()}
          </div>
        </section>

        <section id="admin-sample-orders" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Échantillons</p><h2>Demandes</h2></div>
          </div>
          <div class="admin-toolbar admin-toolbar--sample-orders">
            <label class="admin-toolbar__field">
              <span>Nom client</span>
              <input id="admin-sample-orders-search" type="search" value="${escapeHtml(state.sampleOrdersSearch)}" placeholder="Rechercher par nom" />
            </label>
            <label class="admin-toolbar__field">
              <span>Date</span>
              <input id="admin-sample-orders-date" type="date" value="${escapeHtml(state.sampleOrdersDate)}" />
            </label>
            <label class="admin-toolbar__field">
              <span>Trier par</span>
              <select id="admin-sample-orders-sort">
                <option value="date-desc" ${state.sampleOrdersSort === "date-desc" ? "selected" : ""}>Date récente</option>
                <option value="date-asc" ${state.sampleOrdersSort === "date-asc" ? "selected" : ""}>Date ancienne</option>
                <option value="name-asc" ${state.sampleOrdersSort === "name-asc" ? "selected" : ""}>Nom A → Z</option>
                <option value="name-desc" ${state.sampleOrdersSort === "name-desc" ? "selected" : ""}>Nom Z → A</option>
              </select>
            </label>
            <label class="admin-toolbar__field">
              <span>Par page</span>
              <select id="admin-sample-orders-page-size">
                <option value="10" ${state.sampleOrdersPageSize === 10 ? "selected" : ""}>10</option>
                <option value="25" ${state.sampleOrdersPageSize === 25 ? "selected" : ""}>25</option>
                <option value="50" ${state.sampleOrdersPageSize === 50 ? "selected" : ""}>50</option>
              </select>
            </label>
            <button type="button" class="admin-button admin-button--primary" data-admin-export-sample-orders-csv>Exporter CSV</button>
            <button type="button" class="admin-button" data-admin-clear-sample-order-filters>Réinitialiser</button>
          </div>
          <div class="admin-surface">
            ${renderSampleOrdersTable()}
          </div>
        </section>

        <section id="admin-home" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Home</p><h2>Cartes</h2></div>
          </div>
          <div class="admin-card-grid">${home.shortcuts.map((card, index) => shortcutCardEditor(card, index)).join("")}</div>
        </section>

        <section id="admin-contract" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Contract</p><h2>Hero & texte</h2></div>
          </div>
          <div class="admin-grid admin-grid--two">
            <div class="admin-surface">
              <div class="admin-preview admin-preview--hero">
                <img src="${contract.heroImage}" alt="Hero contract" />
                <div class="admin-preview__overlay">
                  <strong>${escapeHtml(contract.heroTitle)}</strong>
                  <span>${escapeHtml(contract.heroButtonLabel)}</span>
                </div>
              </div>
              <label>Image hero
                <select id="admin-contract-hero-image">${renderAssetOptions(contract.heroImage)}</select>
              </label>
              <label>Titre hero<input id="admin-contract-hero-title" type="text" value="${escapeHtml(contract.heroTitle)}" /></label>
              <label>Bouton hero<input id="admin-contract-hero-button" type="text" value="${escapeHtml(contract.heroButtonLabel)}" /></label>
            </div>
            <div class="admin-surface">
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
                <select id="admin-contract-side-image">${renderAssetOptions(contract.sideImage)}</select>
              </label>
            </div>
          </div>
        </section>

        <section id="admin-showrooms" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Showrooms</p><h2>Visuel & villes</h2></div>
          </div>
          <div class="admin-grid admin-grid--two">
            <div class="admin-surface">
              <div class="admin-preview admin-preview--showrooms"><img src="${showrooms.heroImage}" alt="Showrooms" /></div>
              <label>Image showrooms
                <select id="admin-showrooms-image">${renderAssetOptions(showrooms.heroImage)}</select>
              </label>
            </div>
            <div class="admin-surface">
              <h3>Villes affichées</h3>
              <div class="admin-city-list">
                ${showrooms.cities.map((city, index) => `<label>Ville ${index + 1}<input type="text" value="${escapeHtml(city)}" data-admin-showroom-city="${index}" /></label>`).join("")}
              </div>
            </div>
          </div>
        </section>

        <section id="admin-assets" class="admin-section">
          <div class="admin-section__heading">
            <div><p class="admin-kicker">Visuels</p><h2>Assets</h2></div>
            <div class="admin-section__aside">
              <span>${assetLibrary.length} assets disponibles</span>
            </div>
          </div>
          <div class="admin-grid admin-grid--assets">
            <div class="admin-surface admin-surface--asset-form">
              <div class="admin-surface__intro">
                <h3>Ajouter un asset</h3>
                <p>Ajoute un label et un chemin ou une URL. L’asset sera disponible immédiatement dans les sélecteurs du backoffice.</p>
              </div>
              <label>Nom affiché
                <input id="admin-asset-label" type="text" value="${escapeHtml(state.assetDraftLabel)}" placeholder="Ex: Hero printemps" />
              </label>
              <label>Chemin ou URL
                <input id="admin-asset-src" type="text" value="${escapeHtml(state.assetDraftSrc)}" placeholder="/custom-assets/mon-visuel.jpg" />
              </label>
              <div class="admin-panel__actions">
                <button type="button" class="admin-button admin-button--primary" data-admin-add-asset>Ajouter l’asset</button>
              </div>
            </div>
            <div class="admin-assets-grid">
            ${assetLibrary.map((asset) => `
              <article class="admin-asset-card">
                <img src="${asset.src}" alt="${escapeHtml(asset.label)}" />
                <div>
                  <strong>${escapeHtml(asset.label)}</strong>
                  <span>${escapeHtml(asset.src)}</span>
                </div>
                <button type="button" class="admin-asset-card__remove" data-admin-remove-asset="${escapeHtml(asset.src)}">Supprimer</button>
              </article>
            `).join("")}
            </div>
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

    if (target.matches("[data-admin-add-asset]")) {
      const label = state.assetDraftLabel.trim();
      const src = state.assetDraftSrc.trim();
      if (!label || !src) {
        return;
      }

      const nextAssets = getAdminAssets().filter((asset) => asset.src !== src);
      nextAssets.unshift({ id: buildAssetId(label, src), label, src });
      state.content.assets = nextAssets;
      state.assetDraftLabel = "";
      state.assetDraftSrc = "";
      saveSiteContent(state.content);
      render();
      return;
    }

    if (target.matches("[data-admin-remove-asset]")) {
      const src = String(target.getAttribute("data-admin-remove-asset") || "").trim();
      if (!src) {
        return;
      }

      state.content.assets = getAdminAssets().filter((asset) => asset.src !== src);
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
      window.setTimeout(() => { target.textContent = "Enregistrer"; }, 1200);
      return;
    }

    if (target.matches("[data-admin-reset]")) {
      state.content = structuredClone(DEFAULT_SITE_CONTENT);
      resetSiteContent();
      saveSiteContent(state.content);
      render();
      return;
    }

    if (target.matches("[data-admin-order-status]")) {
      const orderId = Number(target.getAttribute("data-admin-order-id"));
      const status = String(target.getAttribute("data-admin-order-status") || "").trim();
      void updateSampleOrderStatus(orderId, status);
      return;
    }

    if (target.matches("[data-admin-order-save-notes]")) {
      const orderId = Number(target.getAttribute("data-admin-order-save-notes"));
      const order = state.sampleOrders.find((item) => item.id === orderId);
      const adminNotes = Object.prototype.hasOwnProperty.call(state.sampleOrderDraftNotes, orderId)
        ? state.sampleOrderDraftNotes[orderId]
        : (order?.adminNotes || "");
      void updateSampleOrderNotes(orderId, adminNotes);
      return;
    }

    if (target.matches("[data-admin-clear-sample-order-filters]")) {
      state.sampleOrdersSearch = "";
      state.sampleOrdersDate = "";
      state.sampleOrdersSort = "date-desc";
      state.sampleOrdersPage = 1;
      render();
      return;
    }

    if (target.matches("[data-admin-export-sample-orders-csv]")) {
      exportSampleOrdersCsv();
      return;
    }

    if (target.matches("[data-admin-sample-orders-page]")) {
      const direction = String(target.getAttribute("data-admin-sample-orders-page") || "");
      const { totalPages, currentPage } = getSampleOrdersPaginationMeta();
      if (direction === "prev" && currentPage > 1) {
        state.sampleOrdersPage = currentPage - 1;
      }
      if (direction === "next" && currentPage < totalPages) {
        state.sampleOrdersPage = currentPage + 1;
      }
      render();
      return;
    }

    if (target.matches("[data-admin-sample-limit-delta]")) {
      const userId = Number(target.getAttribute("data-admin-user-id"));
      const delta = Number(target.getAttribute("data-admin-sample-limit-delta"));
      const professional = state.professionals.find((item) => item.id === userId);
      if (!professional || !Number.isFinite(delta)) return;
      const nextSampleLimit = Math.max(0, Number(professional.sampleLimit || 0) + delta);
      void updateProfessionalSampleLimit(userId, nextSampleLimit);
      return;
    }

    if (target.matches("[data-admin-professional-status]")) {
      const userId = Number(target.getAttribute("data-admin-professional-id"));
      const status = String(target.getAttribute("data-admin-professional-status") || "").trim();
      void updateProfessionalStatus(userId, status);
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const shortcutTitle = target.getAttribute("data-admin-shortcut-title");
    const shortcutHref = target.getAttribute("data-admin-shortcut-href");
    const showroomCity = target.getAttribute("data-admin-showroom-city");
    const orderNotes = target.getAttribute("data-admin-order-notes");

    if (shortcutTitle !== null && target instanceof HTMLTextAreaElement) {
      state.content.home.shortcuts[Number(shortcutTitle)].title = target.value.trim().replace(/\n+/g, "<br />");
    }
    if (shortcutHref !== null && target instanceof HTMLInputElement) {
      state.content.home.shortcuts[Number(shortcutHref)].href = target.value.trim() || "/";
    }
    if (showroomCity !== null && target instanceof HTMLInputElement) {
      state.content.showrooms.cities[Number(showroomCity)] = target.value.trim();
    }
    if (orderNotes !== null && target instanceof HTMLTextAreaElement) {
      state.sampleOrderDraftNotes[Number(orderNotes)] = target.value;
      return;
    }
    if (target.id === "admin-sample-orders-search" && target instanceof HTMLInputElement) {
      state.sampleOrdersError = "";
      state.sampleOrdersSearch = target.value;
      state.sampleOrdersPage = 1;
      render();
      return;
    }
    if (target.id === "admin-sample-orders-date" && target instanceof HTMLInputElement) {
      state.sampleOrdersError = "";
      state.sampleOrdersDate = target.value;
      state.sampleOrdersPage = 1;
      render();
      return;
    }
    if (target.id === "admin-sample-orders-sort" && target instanceof HTMLSelectElement) {
      state.sampleOrdersError = "";
      state.sampleOrdersSort = target.value || "date-desc";
      state.sampleOrdersPage = 1;
      render();
      return;
    }
    if (target.id === "admin-sample-orders-page-size" && target instanceof HTMLSelectElement) {
      state.sampleOrdersError = "";
      state.sampleOrdersPageSize = Number(target.value) || 10;
      state.sampleOrdersPage = 1;
      render();
      return;
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
    if (target.id === "admin-asset-label" && target instanceof HTMLInputElement) {
      state.assetDraftLabel = target.value;
      return;
    }
    if (target.id === "admin-asset-src" && target instanceof HTMLInputElement) {
      state.assetDraftSrc = target.value;
      return;
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
void loadAdminAccess();
