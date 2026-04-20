import {
  PROFESSIONAL_AUTH_EVENT,
  fetchProfessionalPendingSamples,
  getProfessionalState,
  replaceProfessionalPendingSamples,
  setProfessionalPendingSampleProductIds
} from "./professional-auth.js";
import {
  buildProductSelectionKey,
  parseProductSelectionKey,
  selectionKeysMatch
} from "./product-selection.js";

const SAMPLE_CART_STORAGE_KEY = "odc-sample-cart-v1";
export const SAMPLE_CART_CHANGE_EVENT = "odc:samplecartchange";

let syncInFlight = false;

function hasWindow() {
  return typeof window !== "undefined";
}

function sanitizeSelectionKey(selectionKey) {
  const parsed = parseProductSelectionKey(selectionKey);
  return buildProductSelectionKey(parsed.productId, parsed.colorwayId);
}

function emitSampleCartChange(selectionKeys) {
  if (!hasWindow()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(SAMPLE_CART_CHANGE_EVENT, { detail: [...selectionKeys] }));
}

function readStoredSampleCart() {
  if (!hasWindow()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAMPLE_CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(sanitizeSelectionKey)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeStoredSampleCart(selectionKeys) {
  if (!hasWindow()) {
    return [];
  }

  const sanitized = [...new Set(selectionKeys.map(sanitizeSelectionKey).filter(Boolean))];
  window.localStorage.setItem(SAMPLE_CART_STORAGE_KEY, JSON.stringify(sanitized));
  emitSampleCartChange(sanitized);
  return sanitized;
}

function clearStoredSampleCart() {
  if (!hasWindow()) {
    return [];
  }

  window.localStorage.removeItem(SAMPLE_CART_STORAGE_KEY);
  emitSampleCartChange([]);
  return [];
}

function getAuthenticatedPendingSampleProductIds() {
  return [...(getProfessionalState().pendingSampleProductIds || [])];
}

function persistAuthenticatedSampleCart(selectionKeys) {
  const sanitized = [...new Set(selectionKeys.map(sanitizeSelectionKey).filter(Boolean))];
  setProfessionalPendingSampleProductIds(sanitized);
  emitSampleCartChange(sanitized);
  replaceProfessionalPendingSamples(sanitized).catch(() => {
    fetchProfessionalPendingSamples().catch(() => {});
  });
  return sanitized;
}

export function getSampleCartProductIds() {
  const authState = getProfessionalState();
  if (authState.authenticated) {
    return getAuthenticatedPendingSampleProductIds();
  }

  return readStoredSampleCart();
}

export function getSampleCartCount() {
  return getSampleCartProductIds().length;
}

export function hasSampleCartProduct(selectionKey) {
  const normalized = sanitizeSelectionKey(selectionKey);
  if (!normalized) {
    return false;
  }

  return getSampleCartProductIds().some((storedKey) => selectionKeysMatch(storedKey, normalized));
}

export function addSampleCartProduct(selectionKey) {
  const normalized = sanitizeSelectionKey(selectionKey);
  if (!normalized) {
    return getSampleCartProductIds();
  }

  const current = getSampleCartProductIds();
  if (current.some((storedKey) => selectionKeysMatch(storedKey, normalized))) {
    return current;
  }

  if (getProfessionalState().authenticated) {
    return persistAuthenticatedSampleCart([...current, normalized]);
  }

  return writeStoredSampleCart([...current, normalized]);
}

export function removeSampleCartProduct(selectionKey) {
  const normalized = sanitizeSelectionKey(selectionKey);
  const next = getSampleCartProductIds().filter((item) => !selectionKeysMatch(item, normalized));

  if (getProfessionalState().authenticated) {
    return persistAuthenticatedSampleCart(next);
  }

  return writeStoredSampleCart(next);
}

export function clearSampleCart() {
  if (getProfessionalState().authenticated) {
    return persistAuthenticatedSampleCart([]);
  }

  return writeStoredSampleCart([]);
}

export async function syncStoredSampleCartToAccount() {
  const authState = getProfessionalState();
  const localSelections = readStoredSampleCart();

  if (!authState.authenticated || !localSelections.length || syncInFlight) {
    return getSampleCartProductIds();
  }

  syncInFlight = true;
  try {
    const merged = [...new Set([...(authState.pendingSampleProductIds || []), ...localSelections])];
    await replaceProfessionalPendingSamples(merged);
    clearStoredSampleCart();
    return getProfessionalState().pendingSampleProductIds || [];
  } finally {
    syncInFlight = false;
  }
}

if (hasWindow()) {
  window.addEventListener(PROFESSIONAL_AUTH_EVENT, () => {
    const authState = getProfessionalState();
    if (authState.authenticated) {
      syncStoredSampleCartToAccount().catch(() => {});
      emitSampleCartChange(authState.pendingSampleProductIds || []);
      return;
    }

    emitSampleCartChange(readStoredSampleCart());
  });
}
