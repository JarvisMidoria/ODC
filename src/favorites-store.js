import {
  buildProductSelectionKey,
  parseProductSelectionKey,
  selectionKeysMatch
} from "./product-selection.js";

// Keep the existing key so browser selections survive the removal of accounts.
const FAVORITES_STORAGE_KEY = "odc-favorites-v1";
export const FAVORITES_CHANGE_EVENT = "odc:favoriteschange";
let memoryFavorites = [];
let storageUnavailable = false;

function sanitizeSelectionKeys(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === "string").map((item) => {
    const parsed = parseProductSelectionKey(item);
    return buildProductSelectionKey(parsed.productId, parsed.colorwayId);
  }).filter(Boolean))];
}

function emitFavoriteChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, {
    detail: [...memoryFavorites]
  }));
}

export function getFavoriteProductIds() {
  if (typeof window === "undefined") return [];
  if (storageUnavailable) return [...memoryFavorites];
  try {
    memoryFavorites = sanitizeSelectionKeys(JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]"));
  } catch {
    // Storage may be disabled or contain malformed data. Keep the page selection.
  }
  return [...memoryFavorites];
}

export function hasFavoriteProduct(selectionKey) {
  const [normalized] = sanitizeSelectionKeys([selectionKey]);
  return Boolean(normalized && getFavoriteProductIds().some((key) => selectionKeysMatch(key, normalized)));
}

export async function toggleFavoriteProduct(selectionKey) {
  const [normalized] = sanitizeSelectionKeys([selectionKey]);
  if (!normalized || typeof window === "undefined") return getFavoriteProductIds();
  const current = getFavoriteProductIds();
  memoryFavorites = current.some((key) => selectionKeysMatch(key, normalized))
    ? current.filter((key) => !selectionKeysMatch(key, normalized))
    : [...current, normalized];
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(memoryFavorites));
    storageUnavailable = false;
  } catch {
    // Disabled storage or exhausted quota must not break product browsing.
    storageUnavailable = true;
  }
  emitFavoriteChange();
  return [...memoryFavorites];
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== FAVORITES_STORAGE_KEY && event.key !== null) return;
    storageUnavailable = false;
    memoryFavorites = [];
    getFavoriteProductIds();
    emitFavoriteChange();
  });
}
