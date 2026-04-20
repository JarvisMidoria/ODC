export const PROFESSIONAL_AUTH_EVENT = "odc:professional-auth-change";

import { apiFetch } from "./api-client.js";

const defaultState = {
  authenticated: false,
  user: null,
  sampleLimit: 10,
  samplesUsed: 0,
  samplesRemaining: 10,
  sampleProductIds: [],
  favoriteProductIds: []
};

let authState = { ...defaultState };

function emit() {
  window.dispatchEvent(new CustomEvent(PROFESSIONAL_AUTH_EVENT, { detail: getProfessionalState() }));
}

export function getProfessionalState() {
  return {
    ...authState,
    sampleProductIds: [...(authState.sampleProductIds || [])],
    favoriteProductIds: [...(authState.favoriteProductIds || [])]
  };
}

export function isProfessionalAuthenticated() {
  return authState.authenticated === true;
}

export async function fetchProfessionalSession() {
  const response = await apiFetch("/api/auth/me");

  const payload = await response.json();
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

  const payload = await response.json();
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

  const payload = await response.json();
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

export async function requestProfessionalSample(productId) {
  const response = await apiFetch("/api/samples/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ productId })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Demande d’échantillon impossible.");
  }

  authState = {
    ...authState,
    sampleLimit: payload.sampleLimit,
    samplesUsed: payload.samplesUsed,
    samplesRemaining: payload.samplesRemaining,
    sampleProductIds: [...new Set([...(authState.sampleProductIds || []), payload.productId])]
  };
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

  const payload = await response.json();
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
      : [...(authState.sampleProductIds || [])]
  };
  emit();
  return payload;
}

export async function fetchProfessionalFavorites() {
  const response = await apiFetch("/api/favorites");

  const payload = await response.json();
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

  const payload = await response.json();
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

  const payload = await response.json();
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
