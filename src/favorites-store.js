import {
  PROFESSIONAL_AUTH_EVENT,
  addProfessionalFavorite,
  fetchProfessionalFavorites,
  getProfessionalState,
  removeProfessionalFavorite
} from "./professional-auth.js";

const FAVORITES_STORAGE_KEY = "odc-favorites-v1";
export const FAVORITES_CHANGE_EVENT = "odc:favoriteschange";

let syncInFlight = false;

function hasWindow() {
  return typeof window !== "undefined";
}

function sanitizeProductId(productId) {
  return typeof productId === "string" ? productId.trim() : "";
}

function emitFavoriteChange(productIds) {
  if (!hasWindow()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, { detail: [...productIds] }));
}

function readStoredFavorites() {
  if (!hasWindow()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return [...new Set(parsed.map(sanitizeProductId).filter(Boolean))];
  } catch {
    return [];
  }
}

function writeStoredFavorites(productIds) {
  if (!hasWindow()) {
    return [];
  }

  const sanitized = [...new Set(productIds.map(sanitizeProductId).filter(Boolean))];
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(sanitized));
  emitFavoriteChange(sanitized);
  return sanitized;
}

function clearStoredFavorites() {
  if (!hasWindow()) {
    return [];
  }

  window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
  emitFavoriteChange([]);
  return [];
}

export function getFavoriteProductIds() {
  const authState = getProfessionalState();
  if (authState.authenticated) {
    return [...(authState.favoriteProductIds || [])];
  }

  return readStoredFavorites();
}

export function hasFavoriteProduct(productId) {
  const normalized = sanitizeProductId(productId);
  if (!normalized) {
    return false;
  }

  return getFavoriteProductIds().includes(normalized);
}

export async function toggleFavoriteProduct(productId) {
  const normalized = sanitizeProductId(productId);
  if (!normalized) {
    return getFavoriteProductIds();
  }

  const authState = getProfessionalState();

  if (authState.authenticated) {
    if (hasFavoriteProduct(normalized)) {
      await removeProfessionalFavorite(normalized);
    } else {
      await addProfessionalFavorite(normalized);
    }

    emitFavoriteChange(getProfessionalState().favoriteProductIds || []);
    return getProfessionalState().favoriteProductIds || [];
  }

  const current = readStoredFavorites();
  if (current.includes(normalized)) {
    return writeStoredFavorites(current.filter((item) => item !== normalized));
  }

  return writeStoredFavorites([...current, normalized]);
}

export async function syncStoredFavoritesToAccount() {
  const authState = getProfessionalState();
  const localFavorites = readStoredFavorites();

  if (!authState.authenticated || !localFavorites.length || syncInFlight) {
    return getFavoriteProductIds();
  }

  syncInFlight = true;
  try {
    const existing = new Set(authState.favoriteProductIds || []);
    for (const productId of localFavorites) {
      if (!existing.has(productId)) {
        await addProfessionalFavorite(productId);
      }
    }

    clearStoredFavorites();
    await fetchProfessionalFavorites();
    return getProfessionalState().favoriteProductIds || [];
  } finally {
    syncInFlight = false;
  }
}

if (hasWindow()) {
  window.addEventListener(PROFESSIONAL_AUTH_EVENT, () => {
    const authState = getProfessionalState();
    if (authState.authenticated) {
      syncStoredFavoritesToAccount().catch(() => {});
      emitFavoriteChange(authState.favoriteProductIds || []);
      return;
    }

    emitFavoriteChange(readStoredFavorites());
  });
}
