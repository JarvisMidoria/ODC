import fs from "node:fs/promises";
import path from "node:path";

function usage() {
  console.error("Usage: node scripts/import-product.mjs <product-url> [output.json]");
}

function decodeHtml(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value = "") {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTitle(rawTitle = "") {
  return stripTags(rawTitle).replace(/\s+[—-]\s+[^—-]+$/i, "").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function extractJsonLdObjects(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const objects = [];

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        objects.push(...parsed);
      } else if (Array.isArray(parsed?.["@graph"])) {
        objects.push(...parsed["@graph"]);
      } else {
        objects.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return objects;
}

function pickProductJsonLd(objects) {
  return (
    objects.find((item) => item?.["@type"] === "Product") ||
    objects.find((item) => Array.isArray(item?.["@type"]) && item["@type"].includes("Product")) ||
    null
  );
}

function extractMetaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return "";
}

function absolutizeUrl(candidate, baseUrl) {
  if (!candidate) {
    return "";
  }

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return candidate;
  }
}

function toAssetImage(url, title = "") {
  return {
    title,
    originalSize: "0x0",
    assetUrl: url,
    mediaFocalPoint: {
      x: 0.5,
      y: 0.5,
      source: 3
    }
  };
}

function shouldKeepImage(url, slug) {
  if (!url) {
    return false;
  }

  const lower = url.toLowerCase();

  if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(lower)) {
    return false;
  }

  if (/(^|[\/_.-])(logo|icon|phone|email|facebook|instagram|preview|avatar|favicon)([\/_.-]|$)/.test(lower)) {
    return false;
  }

  if (/-100x100(\.|$)|-150x150(\.|$)/.test(lower)) {
    return false;
  }

  if (slug && lower.includes(slug.toLowerCase())) {
    return true;
  }

  return /saba_|sierra_|savannah_|images\.squarespace-cdn\.com|static1\.squarespace\.com|wp-content\/uploads/.test(lower);
}

function extractProductGalleryImages(html, sourceUrl, slug) {
  const images = new Set();

  for (const match of html.matchAll(/woocommerce-product-gallery__image[\s\S]*?<a[^>]+href=["']([^"']+)["']/gi)) {
    const absolute = absolutizeUrl(match[1], sourceUrl);
    if (shouldKeepImage(absolute, slug)) {
      images.add(absolute);
    }
  }

  return [...images];
}

function extractAdditionalInfoDescription(html) {
  const plain = stripTags(html);
  const match = plain.match(/Información adicional(?:\s+Información adicional)?(?:\s+Specifications)?\s+([\s\S]*?)\s+Localizador de showrooms/i);
  if (!match?.[1]) {
    return "";
  }

  const labels = [
    "Marca",
    "Tipo de Producto",
    "Tipo",
    "Dibujo",
    "Martindale",
    "Color",
    "color",
    "Uso",
    "Código de Lavado",
    "Repeat horizontal \\(cm\\)",
    "Repeat vertical \\(cm\\)",
    "Ancho \\(cm\\)",
    "Composición"
  ];
  const labelPattern = labels.join("|");
  const rows = [];

  for (const row of match[1].matchAll(new RegExp(`(${labelPattern})\\s+([\\s\\S]*?)(?=\\s+(?:${labelPattern})\\s+|$)`, "g"))) {
    const label = row[1].trim();
    const value = row[2].trim().replace(/\s+,/g, ",").replace(/\s+\./g, ".");
    if (!value) {
      continue;
    }
    rows.push(`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`);
  }

  return rows.join("");
}

function normalizeImportedProduct(sourceUrl, html) {
  const jsonLdObjects = extractJsonLdObjects(html);
  const productLd = pickProductJsonLd(jsonLdObjects);
  const url = new URL(sourceUrl);
  const slug = url.pathname.split("/").filter(Boolean).pop() || "produit";
  const title =
    productLd?.name ||
    extractMetaContent(html, "og:title") ||
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ||
    slug ||
    "Produit";
  const description =
    productLd?.description ||
    extractMetaContent(html, "description") ||
    extractAdditionalInfoDescription(html) ||
    "";

  const imageCandidates = new Set();

  const addImageCandidate = (value) => {
    const absolute = absolutizeUrl(value, sourceUrl);
    if (shouldKeepImage(absolute, slug)) {
      imageCandidates.add(absolute);
    }
  };

  if (Array.isArray(productLd?.image)) {
    productLd.image.forEach(addImageCandidate);
  } else if (typeof productLd?.image === "string") {
    addImageCandidate(productLd.image);
  }

  addImageCandidate(extractMetaContent(html, "og:image"));
  extractProductGalleryImages(html, sourceUrl, slug).forEach(addImageCandidate);

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    if (imageCandidates.size >= 8) {
      break;
    }
    addImageCandidate(match[1]);
  }

  const images = [...imageCandidates].slice(0, 8).map((imageUrl) => toAssetImage(imageUrl));
  const firstOffer = Array.isArray(productLd?.offers) ? productLd.offers[0] : productLd?.offers || null;
  const basePrice = firstOffer?.price ? String(firstOffer.price) : "";
  const currency = firstOffer?.priceCurrency || "USD";
  return {
    importedAt: new Date().toISOString(),
    sourceUrl,
    product: {
      id: `import-${slug}`,
      title: normalizeTitle(title),
      fullUrl: `/produits/p/${slug}`,
      urlSlug: slug,
      price: basePrice ? { currency, value: basePrice } : null,
      salePrice: null,
      soldOut: false,
      onSale: false,
      description: description
        ? description.includes("<")
          ? description
          : `<p>${escapeHtml(stripTags(description))}</p>`
        : "",
      variants: [],
      firstInStockVariant: null,
      userDefinedVariantOptions: [],
      productType: 1,
      images,
      mainImage: images[0] || null,
      qtyInStock: Number.MAX_SAFE_INTEGER,
      allowMultiplePurchase: true,
      scarce: false,
      published: true,
      tags: [],
      mightHavePaymentPlan: false,
      collections: ["all"]
    }
  };
}

async function main() {
  const [, , sourceUrl, outputArg] = process.argv;

  if (!sourceUrl) {
    usage();
    process.exit(1);
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ODC importer)"
    }
  });

  if (!response.ok) {
    throw new Error(`Impossible de recuperer ${sourceUrl} (${response.status})`);
  }

  const html = await response.text();
  const normalized = normalizeImportedProduct(sourceUrl, html);
  const output = JSON.stringify(normalized, null, 2);

  if (outputArg) {
    const outputPath = path.resolve(process.cwd(), outputArg);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${output}\n`, "utf8");
    console.log(outputPath);
    return;
  }

  console.log(output);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
