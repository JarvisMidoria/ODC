export const PROFESSIONAL_AUTH_EVENT = "odc:professional-auth-change";

import { apiFetch } from "./api-client.js";

const defaultState = {
  authenticated: false,
  user: null,
  favoriteProductIds: []
};

let authState = { ...defaultState };
let sessionRequest = null;

async function readApiPayload(response) {
  const raw = await response.text();
  if (!raw) {
    if (!response.ok) {
      return { error: "Serveur d’authentification indisponible. Relancez l’API puis réessayez." };
    }
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Serveur d’authentification indisponible. Relancez l’API puis réessayez.");
  }
}

function emit() {
  window.dispatchEvent(new CustomEvent(PROFESSIONAL_AUTH_EVENT, { detail: getProfessionalState() }));
}

export function getProfessionalState() {
  return {
    ...authState,
    favoriteProductIds: [...(authState.favoriteProductIds || [])]
  };
}

export function isProfessionalAuthenticated() {
  return authState.authenticated === true;
}

export async function fetchProfessionalSession() {
  const response = await apiFetch("/api/auth/me");

  const payload = await readApiPayload(response);
  authState = {
    ...defaultState,
    ...payload
  };
  emit();
  return getProfessionalState();
}

export async function ensureProfessionalSession() {
  if (authState.authenticated) {
    return getProfessionalState();
  }

  if (!sessionRequest) {
    sessionRequest = fetchProfessionalSession().finally(() => {
      sessionRequest = null;
    });
  }

  return sessionRequest;
}

export async function registerProfessionalAccount(formData) {
  const response = await apiFetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(formData)
  });

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Inscription impossible.");
  }

  return payload;
}

export async function loginProfessionalAccount(credentials) {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(credentials)
  });

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Connexion impossible.");
  }

  authState = {
    ...defaultState,
    ...payload,
    authenticated: true
  };
  emit();
  return getProfessionalState();
}

export async function logoutProfessionalAccount() {
  await apiFetch("/api/auth/logout", {
    method: "POST"
  });

  authState = { ...defaultState };
  emit();
  return getProfessionalState();
}

export async function fetchProfessionalFavorites() {
  const response = await apiFetch("/api/favorites");

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Impossible de charger les favoris.");
  }

  authState = {
    ...authState,
    favoriteProductIds: Array.isArray(payload.favoriteProductIds) ? [...payload.favoriteProductIds] : []
  };
  emit();
  return getProfessionalState();
}

export async function addProfessionalFavorite(productId) {
  const response = await apiFetch(`/api/favorites/${encodeURIComponent(productId)}`, {
    method: "POST"
  });

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Impossible d’ajouter ce favori.");
  }

  authState = {
    ...authState,
    favoriteProductIds: Array.isArray(payload.favoriteProductIds) ? [...payload.favoriteProductIds] : [...(authState.favoriteProductIds || [])]
  };
  emit();
  return getProfessionalState();
}

export async function removeProfessionalFavorite(productId) {
  const response = await apiFetch(`/api/favorites/${encodeURIComponent(productId)}`, {
    method: "DELETE"
  });

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Impossible de retirer ce favori.");
  }

  authState = {
    ...authState,
    favoriteProductIds: Array.isArray(payload.favoriteProductIds) ? [...payload.favoriteProductIds] : [...(authState.favoriteProductIds || [])]
  };
  emit();
  return getProfessionalState();
}
