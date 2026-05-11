import { odysseeImportedProducts } from "./product-catalog-odyssee-imported.js";

export const productCollections = [
  { id: "all", path: "/produits", title: "Produits" },
  { id: "tissu", path: "/produits/tissu", title: "Tissus" },
  { id: "papier-peint", path: "/produits/papier-peint", title: "Papiers peints" }
];

const products = odysseeImportedProducts;

const collectionByPath = new Map(
  productCollections.flatMap((collection) => [
    [collection.path, collection],
    [`${collection.path}/`, collection],
    [`${collection.path}.html`, collection],
    [`${collection.path}/index.html`, collection]
  ])
);

export const productCatalogItems = products;

const productByPath = new Map(
  productCatalogItems.flatMap((product) => [
    [product.fullUrl, product],
    [`${product.fullUrl}/`, product],
    [`${product.fullUrl}.html`, product],
    [`${product.fullUrl}/index.html`, product]
  ])
);

const productById = new Map(
  productCatalogItems.map((product) => [product.id, product])
);

function getProductTypeLabel(product) {
  const description = String(product?.description || "");
  const match = description.match(/<strong>\s*Type de produit\s*:\s*<\/strong>\s*([^<]+)/i);
  return String(match?.[1] || "").trim();
}

function slugifyFilterKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductCollectionForPath(pathname) {
  return collectionByPath.get(pathname) || collectionByPath.get(pathname.replace(/\/$/, ""));
}

export function getProductCatalogItemsForPath(pathname) {
  const collection = getProductCollectionForPath(pathname);

  if (!collection || collection.id === "all") {
    return productCatalogItems;
  }

  return productCatalogItems.filter((item) => slugifyFilterKey(getProductTypeLabel(item)) === collection.id);
}

export function getProductCatalogItemForPath(pathname) {
  return (
    productByPath.get(pathname) ||
    productByPath.get(pathname.replace(/\/$/, "")) ||
    null
  );
}

export function getProductCatalogItemById(productId) {
  return productById.get(productId) || null;
}

export function getProductColorwayById(product, colorwayId) {
  if (!product || !Array.isArray(product.colorways) || !product.colorways.length) {
    return null;
  }

  const normalizedColorwayId = typeof colorwayId === "string" ? colorwayId.trim() : "";
  if (!normalizedColorwayId) {
    return product.colorways[0] || null;
  }

  return product.colorways.find((colorway) => colorway.id === normalizedColorwayId) || product.colorways[0] || null;
}
