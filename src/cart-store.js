const CART_STORAGE_KEY = "odc-local-cart-v1";
export const CART_CHANGE_EVENT = "odc:cartchange";

function hasWindow() {
  return typeof window !== "undefined";
}

function sanitizeQuantity(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(9999, parsed));
}

function sanitizeLine(line) {
  if (!line || typeof line.productId !== "string" || !line.productId.trim()) {
    return null;
  }

  return {
    productId: line.productId,
    variantId: typeof line.variantId === "string" && line.variantId.trim() ? line.variantId : "",
    quantity: sanitizeQuantity(line.quantity)
  };
}

function readStoredCart() {
  if (!hasWindow()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(sanitizeLine).filter(Boolean);
  } catch {
    return [];
  }
}

function writeStoredCart(lines) {
  if (!hasWindow()) {
    return [];
  }

  const sanitized = lines.map(sanitizeLine).filter(Boolean);
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT, { detail: sanitized }));
  return sanitized;
}

export function getCartLines() {
  return readStoredCart();
}

export function getCartCount() {
  return getCartLines().reduce((total, line) => total + line.quantity, 0);
}

export function addCartLine({ productId, variantId = "", quantity = 1 }) {
  const nextQuantity = sanitizeQuantity(quantity);
  const lines = getCartLines();
  const existing = lines.find((line) => line.productId === productId && line.variantId === variantId);

  if (existing) {
    existing.quantity = sanitizeQuantity(existing.quantity + nextQuantity);
    return writeStoredCart(lines);
  }

  return writeStoredCart([
    ...lines,
    {
      productId,
      variantId,
      quantity: nextQuantity
    }
  ]);
}

export function updateCartLineQuantity({ productId, variantId = "", quantity = 1 }) {
  const nextQuantity = sanitizeQuantity(quantity);
  const lines = getCartLines().map((line) => {
    if (line.productId === productId && line.variantId === variantId) {
      return {
        ...line,
        quantity: nextQuantity
      };
    }

    return line;
  });

  return writeStoredCart(lines);
}

export function removeCartLine({ productId, variantId = "" }) {
  return writeStoredCart(
    getCartLines().filter((line) => !(line.productId === productId && line.variantId === variantId))
  );
}

export function clearCart() {
  return writeStoredCart([]);
}
