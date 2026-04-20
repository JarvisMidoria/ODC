export const PRODUCT_SELECTION_SEPARATOR = "::";

function sanitizePart(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildProductSelectionKey(productId, colorwayId = "") {
  const normalizedProductId = sanitizePart(productId);
  const normalizedColorwayId = sanitizePart(colorwayId);

  if (!normalizedProductId) {
    return "";
  }

  return normalizedColorwayId
    ? `${normalizedProductId}${PRODUCT_SELECTION_SEPARATOR}${normalizedColorwayId}`
    : normalizedProductId;
}

export function parseProductSelectionKey(selectionKey) {
  const normalized = sanitizePart(selectionKey);
  if (!normalized) {
    return { productId: "", colorwayId: "", selectionKey: "" };
  }

  const [productId, ...rest] = normalized.split(PRODUCT_SELECTION_SEPARATOR);
  const colorwayId = rest.join(PRODUCT_SELECTION_SEPARATOR).trim();

  return {
    productId: sanitizePart(productId),
    colorwayId,
    selectionKey: buildProductSelectionKey(productId, colorwayId)
  };
}

export function selectionKeysMatch(leftKey, rightKey) {
  const left = parseProductSelectionKey(leftKey);
  const right = parseProductSelectionKey(rightKey);

  if (!left.productId || !right.productId) {
    return false;
  }

  if (left.selectionKey === right.selectionKey) {
    return true;
  }

  return left.productId === right.productId && (!left.colorwayId || !right.colorwayId);
}
