const SAMPLE_CART_STORAGE_KEY = "odc-sample-cart-v1";
export const SAMPLE_CART_CHANGE_EVENT = "odc:samplecartchange";

function hasWindow() {
  return typeof window !== "undefined";
}

function sanitizeProductId(productId) {
  return typeof productId === "string" ? productId.trim() : "";
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
      .map(sanitizeProductId)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeStoredSampleCart(productIds) {
  if (!hasWindow()) {
    return [];
  }

  const sanitized = [...new Set(productIds.map(sanitizeProductId).filter(Boolean))];
  window.localStorage.setItem(SAMPLE_CART_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new CustomEvent(SAMPLE_CART_CHANGE_EVENT, { detail: sanitized }));
  return sanitized;
}

export function getSampleCartProductIds() {
  return readStoredSampleCart();
}

export function getSampleCartCount() {
  return getSampleCartProductIds().length;
}

export function hasSampleCartProduct(productId) {
  const normalized = sanitizeProductId(productId);
  if (!normalized) {
    return false;
  }

  return getSampleCartProductIds().includes(normalized);
}

export function addSampleCartProduct(productId) {
  const normalized = sanitizeProductId(productId);
  if (!normalized) {
    return getSampleCartProductIds();
  }

  const current = getSampleCartProductIds();
  if (current.includes(normalized)) {
    return current;
  }

  return writeStoredSampleCart([...current, normalized]);
}

export function removeSampleCartProduct(productId) {
  const normalized = sanitizeProductId(productId);
  return writeStoredSampleCart(
    getSampleCartProductIds().filter((item) => item !== normalized)
  );
}

export function clearSampleCart() {
  return writeStoredSampleCart([]);
}
