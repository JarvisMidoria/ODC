import { apiFetch } from "./api-client.js";

const state = {
  accessLoaded: false,
  accessAllowed: false,
  accessError: "",
  messagesLoaded: false,
  messagesError: "",
  messages: [],
  selectedMessageId: null,
  updatingMessageIds: [],
  search: "",
  status: "all"
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

function getFilteredMessages() {
  const search = state.search.trim().toLowerCase();
  return state.messages.filter((message) => {
    const haystack = [
      message.name,
      message.email,
      message.subject,
      message.message,
      message.sector
    ].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = state.status === "all" || message.status === state.status;
    return matchesSearch && matchesStatus;
  });
}

function getSelectedMessage(messages) {
  const selected = messages.find((message) => message.id === state.selectedMessageId);
  return selected || messages[0] || null;
}

function renderList(messages, selectedMessage) {
  if (state.messagesError) {
    return `<div class="admin-table__empty">${escapeHtml(state.messagesError)}</div>`;
  }

  if (!state.messagesLoaded) {
    return `<div class="admin-table__empty">Chargement des messages…</div>`;
  }

  if (!messages.length) {
    return `<div class="admin-table__empty">Aucun message ne correspond aux filtres actuels.</div>`;
  }

  return `
    <div class="admin-inbox-list">
      ${messages.map((message) => `
        <button
          type="button"
          class="admin-inbox-list__item ${selectedMessage?.id === message.id ? "is-active" : ""}"
          data-admin-inbox-open="${message.id}"
        >
          <div class="admin-inbox-list__topline">
            <strong>${escapeHtml(message.name)}</strong>
            <span class="admin-status-pill admin-status-pill--${escapeHtml(message.status)}">${escapeHtml(message.status)}</span>
          </div>
          <span class="admin-inbox-list__subject">${escapeHtml(message.subject)}</span>
          <span class="admin-inbox-list__meta">${escapeHtml(message.email)}${message.phone ? ` • ${escapeHtml(message.phone)}` : ""}</span>
          <span class="admin-inbox-list__snippet">${escapeHtml(message.message)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderDetail(message) {
  if (!message) {
    return `<div class="admin-table__empty">Aucun message sélectionné.</div>`;
  }

  const isUpdating = state.updatingMessageIds.includes(message.id);
  return `
    <article class="admin-inbox-detail">
      <div class="admin-inbox-detail__header">
        <div>
          <p class="admin-kicker">Inbox</p>
          <h2>${escapeHtml(message.subject)}</h2>
        </div>
        <span class="admin-status-pill admin-status-pill--${escapeHtml(message.status)}">${escapeHtml(message.status)}</span>
      </div>

      <div class="admin-inbox-detail__meta">
        <div><span>Nom</span><strong>${escapeHtml(message.name)}</strong></div>
        <div><span>Email</span><strong><a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a></strong></div>
        <div><span>Téléphone</span><strong>${escapeHtml(message.phone || "Non renseigné")}</strong></div>
        <div><span>Source</span><strong>${escapeHtml(message.source)}</strong></div>
        <div><span>Secteur</span><strong>${escapeHtml(message.sector || "—")}</strong></div>
        <div><span>Reçu le</span><strong>${escapeHtml(message.createdAt)}</strong></div>
      </div>

      <div class="admin-inbox-detail__message">
        <p>${escapeHtml(message.message).replace(/\n/g, "<br />")}</p>
      </div>

      <div class="admin-status-actions" role="group" aria-label="Actions du message ${escapeHtml(String(message.id))}">
        <button type="button" class="admin-status-action ${message.status === "unread" ? "is-active" : ""}" data-admin-inbox-status="unread" data-admin-inbox-id="${message.id}" ${isUpdating ? "disabled" : ""}>Non lu</button>
        <button type="button" class="admin-status-action ${message.status === "read" ? "is-active" : ""}" data-admin-inbox-status="read" data-admin-inbox-id="${message.id}" ${isUpdating ? "disabled" : ""}>Lu</button>
        <button type="button" class="admin-status-action ${message.status === "archived" ? "is-active" : ""}" data-admin-inbox-status="archived" data-admin-inbox-id="${message.id}" ${isUpdating ? "disabled" : ""}>Archiver</button>
      </div>
    </article>
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
    state.accessLoaded = true;
    render();
    void loadMessages();
  } catch (error) {
    state.accessError = error.message || "Impossible de vérifier la session administrateur.";
    state.accessLoaded = true;
    render();
  }
}

async function loadMessages() {
  try {
    const response = await apiFetch("/api/admin/contact-messages");
    if (!response.ok) {
      throw new Error("Impossible de charger les messages.");
    }

    const payload = await response.json();
    state.messages = Array.isArray(payload.messages) ? payload.messages : [];
    state.messagesError = "";
    if (!state.messages.some((message) => message.id === state.selectedMessageId)) {
      state.selectedMessageId = state.messages[0]?.id || null;
    }
  } catch (error) {
    state.messages = [];
    state.messagesError = error.message || "Impossible de charger les messages.";
  }

  state.messagesLoaded = true;
  render();
}

async function updateMessageStatus(messageId, status) {
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return;
  }

  state.updatingMessageIds = [...new Set([...state.updatingMessageIds, messageId])];
  render();

  try {
    const response = await apiFetch(`/api/admin/contact-messages/${messageId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Impossible de mettre à jour le message.");
    }

    state.messages = state.messages.map((message) => (
      message.id === messageId
        ? { ...message, status: payload.status || status }
        : message
    ));
  } catch (error) {
    state.messagesError = error.message || "Impossible de mettre à jour le message.";
  } finally {
    state.updatingMessageIds = state.updatingMessageIds.filter((id) => id !== messageId);
    render();
  }
}

function render() {
  const app = document.querySelector("#admin-inbox-app");
  if (!app) {
    return;
  }

  const filteredMessages = getFilteredMessages();
  const selectedMessage = getSelectedMessage(filteredMessages);
  const unreadCount = state.messages.filter((message) => message.status === "unread").length;

  if (!state.accessLoaded) {
    app.innerHTML = `
      <div class="admin-access-shell">
        <section class="admin-access-card">
          <div class="admin-wordmark" aria-label="Odyssée">ODYSSEE</div>
          <p class="admin-access-card__eyebrow">Inbox</p>
          <h1>Ouverture de l’inbox…</h1>
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
          <p class="admin-access-card__eyebrow">Inbox</p>
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
            <strong>Inbox</strong>
          </div>
        </div>
        <nav class="admin-sidebar__nav" aria-label="Navigation admin">
          <a href="/admin.html">Dashboard</a>
          <a href="/admin-inbox.html">Inbox</a>
        </nav>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar">
          <div class="admin-topbar__copy">
            <p class="admin-kicker">Messages entrants</p>
            <h1>Inbox contact</h1>
            <p class="admin-topbar__lede">${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""} dans la boîte actuelle.</p>
          </div>
        </header>

        <section class="admin-overview-grid admin-overview-grid--compact">
          <article class="admin-stat">
            <span>Total messages</span>
            <strong>${state.messages.length}</strong>
          </article>
          <article class="admin-stat">
            <span>Non lus</span>
            <strong>${unreadCount}</strong>
          </article>
          <article class="admin-stat">
            <span>Lus</span>
            <strong>${state.messages.filter((message) => message.status === "read").length}</strong>
          </article>
          <article class="admin-stat">
            <span>Archivés</span>
            <strong>${state.messages.filter((message) => message.status === "archived").length}</strong>
          </article>
        </section>

        <section class="admin-section">
          <div class="admin-toolbar">
            <label class="admin-toolbar__field">
              <span>Recherche</span>
              <input id="admin-inbox-search" type="search" value="${escapeHtml(state.search)}" placeholder="Nom, email, sujet..." />
            </label>
            <label class="admin-toolbar__field">
              <span>Statut</span>
              <select id="admin-inbox-status-filter">
                <option value="all" ${state.status === "all" ? "selected" : ""}>Tous</option>
                <option value="unread" ${state.status === "unread" ? "selected" : ""}>Non lus</option>
                <option value="read" ${state.status === "read" ? "selected" : ""}>Lus</option>
                <option value="archived" ${state.status === "archived" ? "selected" : ""}>Archivés</option>
              </select>
            </label>
          </div>

          <div class="admin-inbox-layout">
            <div class="admin-surface">
              ${renderList(filteredMessages, selectedMessage)}
            </div>
            <div class="admin-surface">
              ${renderDetail(selectedMessage)}
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) {
    return;
  }

  if (target.matches("[data-admin-inbox-open]")) {
    state.selectedMessageId = Number(target.getAttribute("data-admin-inbox-open"));
    const selectedMessage = state.messages.find((message) => message.id === state.selectedMessageId);
    if (selectedMessage?.status === "unread") {
      void updateMessageStatus(selectedMessage.id, "read");
      return;
    }
    render();
    return;
  }

  if (target.matches("[data-admin-inbox-status]")) {
    const messageId = Number(target.getAttribute("data-admin-inbox-id"));
    const status = String(target.getAttribute("data-admin-inbox-status") || "").trim();
    void updateMessageStatus(messageId, status);
  }
});

document.addEventListener("input", (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) {
    return;
  }

  if (target.id === "admin-inbox-search" && target instanceof HTMLInputElement) {
    state.search = target.value;
    render();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) {
    return;
  }

  if (target.id === "admin-inbox-status-filter" && target instanceof HTMLSelectElement) {
    state.status = target.value || "all";
    render();
  }
});

render();
void loadAdminAccess();
