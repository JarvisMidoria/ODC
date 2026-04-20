import {
  PROFESSIONAL_AUTH_EVENT,
  addProfessionalFavorite,
  fetchProfessionalFavorites,
  getProfessionalState,
  removeProfessionalFavorite
} from "./professional-auth.js";
import {
  buildProductSelectionKey,
  parseProductSelectionKey,
  selectionKeysMatch
} from "./product-selection.js";

const FAVORITES_STORAGE_KEY = "odc-favorites-v1";
export const FAVORITES_CHANGE_EVENT = "odc:favoriteschange";

let syncInFlight = false;

function hasWindow() {
  return typeof window !== "undefined";
}

function sanitizeSelectionKey(selectionKey) {
  const parsed = parseProductSelectionKey(selectionKey);
  return buildProductSelectionKey(parsed.productId, parsed.colorwayId);
}

function emitFavoriteChange(selectionKeys) {
  if (!hasWindow()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, { detail: [...selectionKeys] }));
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

    return [...new Set(parsed.map(sanitizeSelectionKey).filter(Boolean))];
  } catch {
    return [];
  }
}

function writeStoredFavorites(selectionKeys) {
  if (!hasWindow()) {
    return [];
  }

  const sanitized = [...new Set(selectionKeys.map(sanitizeSelectionKey).filter(Boolean))];
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

export function hasFavoriteProduct(selectionKey) {
  const normalized = sanitizeSelectionKey(selectionKey);
  if (!normalized) {
    return false;
  }

  return getFavoriteProductIds().some((storedKey) => selectionKeysMatch(storedKey, normalized));
}

export async function toggleFavoriteProduct(selectionKey) {
  const normalized = sanitizeSelectionKey(selectionKey);
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
  if (current.some((storedKey) => selectionKeysMatch(storedKey, normalized))) {
    return writeStoredFavorites(current.filter((item) => !selectionKeysMatch(item, normalized)));
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
    const existing = authState.favoriteProductIds || [];
    for (const selectionKey of localFavorites) {
      if (!existing.some((storedKey) => selectionKeysMatch(storedKey, selectionKey))) {
        await addProfessionalFavorite(selectionKey);
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
