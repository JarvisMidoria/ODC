export const PROFESSIONAL_AUTH_EVENT = "odc:professional-auth-change";

import { apiFetch } from "./api-client.js";

const defaultState = {
  authenticated: false,
  user: null,
  sampleLimit: 10,
  samplesUsed: 0,
  samplesRemaining: 10,
  sampleProductIds: [],
  pendingSampleProductIds: [],
  favoriteProductIds: []
};

let authState = { ...defaultState };

async function readApiPayload(response) {
  const raw = await response.text();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Serveur indisponible. Relancez l’API locale puis réessayez.");
  }
}

function emit() {
  window.dispatchEvent(new CustomEvent(PROFESSIONAL_AUTH_EVENT, { detail: getProfessionalState() }));
}

export function getProfessionalState() {
  return {
    ...authState,
    sampleProductIds: [...(authState.sampleProductIds || [])],
    pendingSampleProductIds: [...(authState.pendingSampleProductIds || [])],
    favoriteProductIds: [...(authState.favoriteProductIds || [])]
  };
}

export function setProfessionalPendingSampleProductIds(productIds) {
  authState = {
    ...authState,
    pendingSampleProductIds: Array.isArray(productIds) ? [...new Set(productIds)] : []
  };
  emit();
  return getProfessionalState();
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

export async function submitProfessionalSampleCheckout(productIds) {
  const response = await apiFetch("/api/samples/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productIds })
  });

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Validation des échantillons impossible.");
  }

  authState = {
    ...authState,
    sampleLimit: payload.sampleLimit,
    samplesUsed: payload.samplesUsed,
    samplesRemaining: payload.samplesRemaining,
    sampleProductIds: Array.isArray(payload.sampleProductIds)
      ? [...payload.sampleProductIds]
      : [...(authState.sampleProductIds || [])],
    pendingSampleProductIds: Array.isArray(payload.pendingSampleProductIds)
      ? [...payload.pendingSampleProductIds]
      : [...(authState.pendingSampleProductIds || [])]
  };
  emit();
  return payload;
}

export async function fetchProfessionalPendingSamples() {
  const response = await apiFetch("/api/samples/pending");

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Impossible de charger le panier d’échantillons.");
  }

  authState = {
    ...authState,
    pendingSampleProductIds: Array.isArray(payload.pendingSampleProductIds) ? [...payload.pendingSampleProductIds] : []
  };
  emit();
  return getProfessionalState();
}

export async function replaceProfessionalPendingSamples(productIds) {
  const response = await apiFetch("/api/samples/pending", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productIds })
  });

  const payload = await readApiPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Impossible de mettre à jour le panier d’échantillons.");
  }

  authState = {
    ...authState,
    pendingSampleProductIds: Array.isArray(payload.pendingSampleProductIds) ? [...payload.pendingSampleProductIds] : []
  };
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
