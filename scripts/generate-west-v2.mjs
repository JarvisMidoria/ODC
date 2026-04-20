import fs from "node:fs/promises";
import path from "node:path";

const root = "/Users/macbookair/Desktop/Odyssee/ODC";
const baseCollectionUrl = "https://gastonydaniela.com/catalogo/en/collections/west-en/";
const selectedFamilies = [
  "GDT-5872",
  "GDT-5867",
  "GDW-5890",
  "GDT-5862",
  "GDT-5851",
  "GDT-5842",
  "GDT-5863",
  "GDT-5861",
  "GDT-5880",
  "GDW-5883",
  "GDT-5852",
  "GDT-5870",
  "GDW-5889",
  "GDW-5887",
  "GDT-5848",
  "GDT-5881",
  "GDW-5882",
  "GDW-5888",
  "GDW-5885",
  "GDW-5884"
];

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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function familyFromSku(sku = "") {
  return sku.split("-").slice(0, 2).join("-");
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function parseCollectionBlocks(html) {
  return [...html.matchAll(/<li class="rey-swatches product[\s\S]*?<\/li>/gi)]
    .map((match) => match[0])
    .map((block) => {
      const href =
        block.match(/<a href="([^"]+)" class="woocommerce-LoopProduct-link/i)?.[1]?.trim() || "";
      const title = stripTags(
        block.match(/woocommerce-loop-product__title[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || ""
      );
      const sku = stripTags(block.match(/<p class='sku-archive'>(.*?)<\/p>/i)?.[1] || "");
      return { href, title, sku, family: familyFromSku(sku) };
    })
    .filter((item) => item.href && item.title && item.sku);
}

function parseSpecRows(html) {
  return [...html.matchAll(/woocommerce-product-attributes-item__label">([^<]+)<[\s\S]*?woocommerce-product-attributes-item__value">([\s\S]*?)<\/td>/gi)]
    .map((match) => ({
      label: stripTags(match[1]),
      value: stripTags(match[2])
    }))
    .filter((row) => row.label && row.value);
}

function parseGalleryImages(html) {
  const images = [];

  for (const match of html.matchAll(/woocommerce-product-gallery__image[\s\S]*?<a[^>]+href="([^"]+)"/gi)) {
    const url = match[1]?.trim();
    if (!url || !/wp-content\/uploads/.test(url) || /-(100x100|150x150)\./.test(url)) {
      continue;
    }
    if (!images.includes(url)) {
      images.push(url);
    }
  }

  return images;
}

function parseAvailableColorLinks(html, family) {
  const start = html.indexOf("Available colours");
  if (start < 0) {
    return [];
  }

  const section = html.slice(start, start + 50000);
  const links = [];
  const pattern = /<a href="([^"]+)" class="ae-woocommerce-LoopProduct-link">[\s\S]*?<h2 class="elementor-heading-title[^>]*">([^<]+)<\/h2>[\s\S]*?<div class="elementor-widget-container">\s*([^<\s][^<]*)\s*<\/div>/gi;

  for (const match of section.matchAll(pattern)) {
    const href = match[1]?.trim();
    const title = stripTags(match[2]);
    const sku = stripTags(match[3]);

    if (!href || !sku || familyFromSku(sku) !== family) {
      continue;
    }

    links.push({ href, title, sku });
  }

  return links;
}

function commonPrefixName(titles) {
  const tokenized = titles.map((title) => title.split(/\s+/).filter(Boolean));
  const prefix = [];

  for (const part of tokenized[0] || []) {
    const index = prefix.length;
    if (tokenized.every((tokens) => tokens[index] === part)) {
      prefix.push(part);
    } else {
      break;
    }
  }

  return prefix.length ? prefix.join(" ") : titles[0];
}

function buildDescription(specs) {
  return specs
    .map((row) => `<p><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</p>`)
    .join("");
}

async function buildWestProducts() {
  const listingItems = [];

  for (let page = 1; page < 30; page += 1) {
    const url = page === 1 ? baseCollectionUrl : `${baseCollectionUrl}page/${page}/`;
    let html = "";
    try {
      html = await fetchText(url);
    } catch (error) {
      if (String(error).includes("HTTP 404")) {
        break;
      }
      throw error;
    }
    const parsed = parseCollectionBlocks(html);
    if (!parsed.length) {
      break;
    }
    listingItems.push(...parsed);
  }

  const seedByFamily = new Map();
  for (const item of listingItems) {
    if (selectedFamilies.includes(item.family) && !seedByFamily.has(item.family)) {
      seedByFamily.set(item.family, item);
    }
  }

  for (const family of selectedFamilies) {
    if (!seedByFamily.has(family)) {
      throw new Error(`Missing seed for ${family}`);
    }
  }

  const products = [];

  for (const family of selectedFamilies) {
    const seed = seedByFamily.get(family);
    const seedHtml = await fetchText(seed.href);
    const currentTitle = stripTags(seedHtml.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || seed.title);
    const currentSku = stripTags(
      seedHtml.match(/<span class="sku">\s*([^<]+)\s*<\/span>/i)?.[1] || seed.sku
    );
    const urls = new Map([[seed.href, { title: currentTitle, sku: currentSku }]]);

    for (const item of parseAvailableColorLinks(seedHtml, family)) {
      urls.set(item.href, { title: item.title, sku: item.sku });
    }

    const colorways = [];
    let parentSpecs = [];
    let brand = "Gastón y Daniela";
    let tags = ["West"];

    for (const [url, meta] of urls.entries()) {
      const html = await fetchText(url);
      const title = stripTags(html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || meta.title);
      const sku = stripTags(
        html.match(/<span class="sku">\s*([^<]+)\s*<\/span>/i)?.[1] || meta.sku
      );
      const specs = parseSpecRows(html);

      if (!parentSpecs.length) {
        parentSpecs = specs;
        const brandRow = specs.find((row) => /^Brand$/i.test(row.label));
        if (brandRow) {
          brand = brandRow.value;
        }
        tags = [
          brand,
          specs.find((row) => /^Product type$/i.test(row.label))?.value,
          specs.find((row) => /^Type$/i.test(row.label))?.value,
          specs.find((row) => /^Pattern$/i.test(row.label))?.value,
          "West"
        ].filter(Boolean);
      }

      colorways.push({
        title,
        sku,
        images: parseGalleryImages(html)
      });
    }

    colorways.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }));

    const parentTitle = commonPrefixName(colorways.map((item) => item.title));
    const slug = slugify(parentTitle);

    products.push({
      id: `west-v2-${slug}`,
      title: parentTitle,
      brand,
      fullUrl: `/produits/p/${slug}`,
      urlSlug: slug,
      description: buildDescription(parentSpecs),
      tags,
      collections: ["all"],
      images: colorways[0]?.images || [],
      mainImage: colorways[0]?.images?.[0] || "",
      colorways: colorways.map((item) => {
        const label =
          item.title.replace(new RegExp(`^${parentTitle}\\s*`, "i"), "").trim() || item.title;
        return {
          id: slugify(item.title),
          label,
          sku: item.sku,
          description: `<p><strong>Reference:</strong> ${escapeHtml(item.sku)}</p><p><strong>Couleur:</strong> ${escapeHtml(label)}</p>`,
          images: item.images
        };
      })
    });
  }

  return products;
}

function buildModule(products) {
  const lines = [
    'function image(assetUrl, title = "") {',
    "  return {",
    "    title,",
    '    originalSize: "834x834",',
    "    assetUrl,",
    "    mediaFocalPoint: { x: 0.5, y: 0.5, source: 3 }",
    "  };",
    "}",
    "",
    "export const westV2Products = ["
  ];

  for (const product of products) {
    lines.push("  {");
    lines.push(`    id: ${JSON.stringify(product.id)},`);
    lines.push(`    title: ${JSON.stringify(product.title)},`);
    lines.push(`    brand: ${JSON.stringify(product.brand)},`);
    lines.push(`    fullUrl: ${JSON.stringify(product.fullUrl)},`);
    lines.push(`    urlSlug: ${JSON.stringify(product.urlSlug)},`);
    lines.push("    price: null,");
    lines.push("    salePrice: null,");
    lines.push("    soldOut: false,");
    lines.push("    onSale: false,");
    lines.push(`    description: ${JSON.stringify(product.description)},`);
    lines.push("    variants: [],");
    lines.push("    firstInStockVariant: null,");
    lines.push("    userDefinedVariantOptions: [],");
    lines.push("    productType: 1,");
    lines.push("    images: [");
    for (const url of product.images) {
      lines.push(`      image(${JSON.stringify(url)}),`);
    }
    lines.push("    ],");
    lines.push(
      `    mainImage: image(${JSON.stringify(product.mainImage)}, ${JSON.stringify(
        `${product.title} ${product.colorways[0]?.label || ""}`.trim()
      )}),`
    );
    lines.push("    qtyInStock: Number.MAX_SAFE_INTEGER,");
    lines.push("    allowMultiplePurchase: true,");
    lines.push("    scarce: false,");
    lines.push("    published: true,");
    lines.push(`    tags: ${JSON.stringify(product.tags)},`);
    lines.push("    mightHavePaymentPlan: false,");
    lines.push(`    collections: ${JSON.stringify(product.collections)},`);
    lines.push("    colorways: [");
    for (const colorway of product.colorways) {
      lines.push("      {");
      lines.push(`        id: ${JSON.stringify(colorway.id)},`);
      lines.push(`        label: ${JSON.stringify(colorway.label)},`);
      lines.push(`        sku: ${JSON.stringify(colorway.sku)},`);
      lines.push("        price: null,");
      lines.push("        salePrice: null,");
      lines.push(`        description: ${JSON.stringify(colorway.description)},`);
      lines.push("        images: [");
      for (const url of colorway.images) {
        lines.push(`          image(${JSON.stringify(url)}),`);
      }
      lines.push("        ],");
      lines.push(`        mainImage: image(${JSON.stringify(colorway.images[0] || "")})`);
      lines.push("      },");
    }
    lines.push("    ]");
    lines.push("  },");
  }

  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

async function createProductPages(products) {
  const template = path.join(root, "produits/p/wyatt/index.html");

  for (const product of products) {
    const dir = path.join(root, "produits/p", product.urlSlug);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(template, path.join(dir, "index.html"));
  }
}

const products = await buildWestProducts();
await fs.writeFile(path.join(root, "src/product-catalog-west-v2.js"), buildModule(products));
await createProductPages(products);

console.log(`Generated ${products.length} West V2 products.`);
for (const product of products) {
  console.log(`${product.title}: ${product.colorways.length}`);
}
