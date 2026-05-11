import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const outputPath = path.join(root, "src", "product-catalog-odyssee-imported.js");

const frocaEntries = [
  ["LIDO", "https://froca.com/es/art/tapiceria-LIDO"],
  ["BIRMANIA", "https://froca.com/es/art/tapiceria-BIRMANIA"],
  ["BRUNEI", "https://froca.com/es/art/tapiceria-BRUNEI"],
  ["COIMBRA", "https://froca.com/es/art/tapiceria-COIMBRA"],
  ["NINFA", "https://froca.com/es/art/tejido-decoracion-NINFA"],
  ["ZAFIRO", "https://froca.com/es/art/tapiceria-ZAFIRO"]
];

const symphonyEntries = [
  ["BERMUDA", "https://symphonymills.com/eu-en/products/textures/bermuda/"],
  ["SAPPHIRE", "https://symphonymills.com/eu-en/products/velvets/sapphire/"],
  ["BERGEN", "https://symphonymills.com/eu-en/products/textures/bergen/"],
  ["COPENHAGEN", "https://symphonymills.com/eu-en/products/textures/copenhagen/"]
];

const yorkNames = [
  "OASIS GRASSCLOTH",
  "ARTISAN STONE",
  "LINE IN THE SAND",
  "SILK ESSENCE",
  "OPEN AIR",
  "TISKET A TASKET",
  "HEATHERED LINEN",
  "SARI SILK",
  "TERRENE",
  "PRECIOUS METAL",
  "MYSTIC GRASSCLOTH",
  "DOWN TO EARTH",
  "SILK SPUN",
  "CROSSOVER",
  "MYSTIC ISLE",
  "BORDEAUX",
  "MARGUERITE VINE",
  "BRIARWOOD",
  "GEODES",
  "BRIDGEWATER",
  "BRAIDED STRIPE",
  "PALISADE",
  "BRUSHED LINEN",
  "NADIE",
  "ASLAN",
  "AMARI",
  "LINGERING GARDEN MURAL",
  "GARDEN TERRACE",
  "MAGNOLIA BRANCHES",
  "COLETTE",
  "GWENDOLYN",
  "EVERLEIGH",
  "FRENCH LINEN STRIPE",
  "CHARM",
  "WINDSOR",
  "HUNTER",
  "LYDIA",
  "RIDGE",
  "WASHED LINEN",
  "PLAIN GRASS",
  "CROSSHATCH STRING",
  "PAPER YARN",
  "WOODLANDS MURAL",
  "FRENCH MARIGOLD",
  "SPRIG & HERON",
  "DAYSTONE",
  "MORNING SHELL",
  "ELLENA",
  "KIMORA'S GARDEN",
  "LOTUS WEAVE",
  "MALIA",
  "TIMIRA",
  "APRIL BLOSSOM",
  "AMYRA SILK",
  "SAORI",
  "SHIMMERING POPPIES",
  "SAKURA BLOOMS MURAL",
  "CHALLENGER",
  "CROSSROAD",
  "MEADOWBROOK",
  "IN THE DETAILS",
  "LOOMED",
  "BRINDLED",
  "STROLL",
  "WEFT AND WEAVE",
  "BOULEVARD",
  "SIDE BY SIDE",
  "CENTER SQUARE",
  "LAKELYNN",
  "MAGUEY SISAL",
  "ABACA WEAVE",
  "EDO PAPERWEAVE",
  "TAILORED WEAVE",
  "MARLED ABACA",
  "TERRA MICA",
  "BRILLIANT MICA",
  "HORIZON PAPERWEAVE",
  "KNOTTED GRASS",
  "INTERLOCKING WOOD",
  "HANDCRAFTED SHIMMERING PAPER",
  "INLAY LINE",
  "WICKER WORK",
  "BURLWOOD",
  "MODERN ABACA",
  "DELICATE ABACA",
  "HEXAGRAM WOOD VENEER",
  "ATELIER HERRINGBONE",
  "LOTUS LEAF",
  "TATAMI WEAVE",
  "CLASSIC LINEN"
];

function decodeHtml(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
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
  return String(value).replace(/[&<>"']/g, (character) => {
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

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function absolutizeUrl(candidate, baseUrl) {
  if (!candidate) {
    return "";
  }

  try {
    return new URL(decodeHtml(candidate), baseUrl).toString();
  } catch {
    return decodeHtml(candidate);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const frocaColorPalette = [
  "Anthracite",
  "Gris",
  "Taupe",
  "Beige",
  "Ivoire",
  "Sable",
  "Lin",
  "Marron",
  "Camel",
  "Terracotta",
  "Rouille",
  "Bordeaux",
  "Rose poudré",
  "Bleu clair",
  "Bleu nuit",
  "Vert sauge",
  "Vert forêt",
  "Jaune moutarde",
  "Noir",
  "Blanc cassé",
  "Naturel",
  "Chocolat",
  "Grège",
  "Argile",
  "Kaki",
  "Pétrole",
  "Amande",
  "Craie",
  "Cognac",
  "Écru",
  "Perle",
  "Ficelle",
  "Tabac",
  "Brume",
  "Marine",
  "Céladon",
  "Ocre",
  "Prune",
  "Sauge",
  "Mastic",
  "Glacier",
  "Aubergine",
  "Chanvre",
  "Moka",
  "Orage",
  "Poudre"
];

const numericColorNames = {
  100: "Blanc cassé",
  101: "Ivoire",
  102: "Crème",
  103: "Lin",
  104: "Beige",
  105: "Sable",
  106: "Naturel",
  107: "Craie",
  108: "Grège",
  109: "Mastic",
  200: "Jaune pâle",
  201: "Doré",
  202: "Moutarde",
  203: "Ocre",
  204: "Ambre",
  300: "Orange",
  301: "Terracotta",
  302: "Rouille",
  303: "Cuivre",
  304: "Cognac",
  400: "Rose poudré",
  401: "Vieux rose",
  402: "Framboise",
  403: "Mauve",
  500: "Rouge",
  501: "Bordeaux",
  502: "Prune",
  503: "Aubergine",
  600: "Bleu ciel",
  601: "Bleu",
  602: "Bleu pétrole",
  603: "Bleu nuit",
  604: "Indigo",
  605: "Marine",
  700: "Vert d'eau",
  701: "Vert sauge",
  702: "Kaki",
  703: "Olive",
  704: "Vert forêt",
  705: "Céladon",
  800: "Gris clair",
  801: "Gris",
  802: "Anthracite",
  803: "Noir",
  804: "Argent",
  900: "Taupe",
  901: "Marron",
  902: "Chocolat",
  903: "Camel",
  904: "Moka"
};

const productFrenchDescriptions = {
  LIDO:
    "Collection de tissus unis au toucher ferme, traités pour mieux résister aux taches. Une base sobre et polyvalente pour l’ameublement, disponible dans une large palette de coloris.",
  BIRMANIA:
    "Velours matelassé avec dessin cousu et finition protectrice. Un tissu confortable, décoratif et facile à vivre pour les assises et les éléments d’ameublement.",
  BRUNEI:
    "Velours d’ameublement décliné dans une large gamme de couleurs. Sa finition protectrice facilite l’entretien tout en conservant un toucher doux.",
  COIMBRA:
    "Tissu au toucher généreux et matelassé, pensé pour apporter confort et relief aux assises. Sa palette douce convient aux intérieurs contemporains comme classiques.",
  NINFA:
    "Rideau jacquard aux fils d’aspect naturel et aux motifs géométriques. Une proposition élégante, légère et décorative pour habiller les fenêtres.",
  ZAFIRO:
    "Tissu à structure cheviot, agréable au toucher et facile à intégrer. Sa palette de coloris permet de travailler aussi bien les tons neutres que les accents plus marqués.",
  BERMUDA:
    "Tissu d’ameublement texturé à l’aspect naturel, inspiré par les matières brutes et les nuances de bord de mer. Son toucher souple convient aux assises, coussins et rideaux.",
  SAPPHIRE:
    "Velours tissé haut de gamme au rendu mat et profond. Il associe une main luxueuse à une palette riche pour les projets d’ameublement sophistiqués.",
  BERGEN:
    "Chenille épaisse au toucher enveloppant, avec une surface riche et travaillée. Idéale pour créer des assises confortables et visuellement chaleureuses.",
  COPENHAGEN:
    "Tissu bouclette inspiré des matières cosy. Son relief doux apporte une sensation chaleureuse aux canapés, fauteuils, coussins et têtes de lit."
};

const englishColorNames = new Map([
  ["abaca", "abaca"],
  ["amber", "ambre"],
  ["beige", "beige"],
  ["black", "noir"],
  ["blue", "bleu"],
  ["brass", "laiton"],
  ["brick", "brique"],
  ["brown", "marron"],
  ["charcoal", "anthracite"],
  ["chocolate", "chocolat"],
  ["cream", "crème"],
  ["dark blue", "bleu nuit"],
  ["dark green", "vert foncé"],
  ["dove", "tourterelle"],
  ["gold", "doré"],
  ["grass", "herbe"],
  ["green", "vert"],
  ["grey", "gris"],
  ["gray", "gris"],
  ["ivory", "ivoire"],
  ["light blue", "bleu clair"],
  ["light grey", "gris clair"],
  ["light gray", "gris clair"],
  ["linen", "lin"],
  ["metal", "métal"],
  ["natural", "naturel"],
  ["neutral", "neutre"],
  ["pearl", "perle"],
  ["pink", "rose"],
  ["red", "rouge"],
  ["rust", "rouille"],
  ["sage", "sauge"],
  ["sand", "sable"],
  ["silver", "argent"],
  ["stone", "pierre"],
  ["taupe", "taupe"],
  ["teal", "bleu canard"],
  ["white", "blanc"]
]);

function translateSubtype(value = "") {
  const normalized = value.trim().toLowerCase();
  if (normalized === "wallpaper") return "Papier peint";
  if (normalized === "tapicerie") return "Tapisserie";
  if (normalized === "textures") return "Texture";
  if (normalized === "velvets") return "Velours";
  return value;
}

function translateSpecLabel(label = "") {
  const normalized = label.trim().toLowerCase();
  if (normalized === "composición") return "Composition";
  if (normalized === "ancho") return "Largeur";
  if (normalized === "peso") return "Poids";
  if (normalized === "resistencia a la abrasión") return "Résistance à l'abrasion";
  if (normalized === "laize") return "Largeur";
  if (normalized === "usage") return "Usage";
  return label;
}

function translateSpecValue(value = "") {
  return String(value)
    .replace(/\bPOLIESTER\b/gi, "Polyester")
    .replace(/\bNYLON\b/gi, "Nylon")
    .replace(/\bALGODON\b/gi, "Coton")
    .replace(/\bVISCOSA\b/gi, "Viscose")
    .replace(/\bBED\b/gi, "lit")
    .replace(/\bCURTAINS\b/gi, "rideaux")
    .replace(/\bCUSHIONS\b/gi, "coussins")
    .replace(/\bSOFA\b/gi, "canapé")
    .replace(/\bPET FRIENDLY\b/gi, "adapté aux animaux")
    .replace(/\bCiclos\b/gi, "Cycles")
    .replace(/cms?\./gi, "cm")
    .replace(/(\d)(cm)\b/gi, "$1 cm");
}

function titleCaseFrench(value = "") {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function translateColorName(value = "") {
  const cleaned = stripTags(value)
    .replace(/\b(faux|fabric|wallpaper|grasscloth|linen|stripe|mural|paper|weave|texture|velvet)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = cleaned.toLowerCase();

  if (englishColorNames.has(lower)) {
    return titleCaseFrench(englishColorNames.get(lower));
  }

  for (const [english, french] of [...englishColorNames.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (lower.includes(english)) {
      return titleCaseFrench(french);
    }
  }

  return titleCaseFrench(cleaned || "Naturel");
}

function getNumericColorName(rawLabel = "", index = 0) {
  const normalized = String(rawLabel).trim();
  const numeric = Number.parseInt(normalized, 10);

  if (Number.isFinite(numeric) && numericColorNames[numeric]) {
    return numericColorNames[numeric];
  }

  return frocaColorPalette[index % frocaColorPalette.length];
}

function resolveColorLabel(rawLabel = "", { index = 0, numericSource = false } = {}) {
  const normalized = stripTags(rawLabel).trim();

  if (/^\d+[A-Z]?$/i.test(normalized)) {
    return getNumericColorName(normalized, index);
  }

  if (numericSource && /^\d+/.test(normalized)) {
    return getNumericColorName(normalized, index);
  }

  return translateColorName(normalized);
}

function colorwayDescription(reference, colorLabel, extra = "") {
  return [
    `<p><strong>Référence:</strong> ${escapeHtml(reference)}</p>`,
    colorLabel ? `<p><strong>Couleur:</strong> ${escapeHtml(colorLabel)}</p>` : "",
    extra
  ].join("");
}

function canonicalImageKey(url = "") {
  const decoded = decodeHtml(url);

  try {
    const parsed = new URL(decoded);
    const parts = parsed.pathname.split("/");
    const assetIndex = parts.indexOf("asset");

    if (assetIndex >= 0 && parts[assetIndex + 1]) {
      return `${parsed.hostname}/asset/${parts[assetIndex + 1]}`;
    }

    return `${parsed.hostname}${parsed.pathname}`
      .replace(/_(?:360|600)\.(jpe?g|webp)$/i, ".$1")
      .replace(/\.(webp|jpe?g|png)$/i, "");
  } catch {
    return decoded
      .replace(/\?.*$/, "")
      .replace(/_(?:360|600)\.(jpe?g|webp)$/i, ".$1")
      .replace(/\.(webp|jpe?g|png)$/i, "");
  }
}

function dedupeImagesByVisual(urls = []) {
  const bestByKey = new Map();
  const scoreImage = (url) => {
    if (/\/Webshop-Product\//i.test(url)) return 5;
    if (/\/Webshop-Color-Slider\//i.test(url)) return 4;
    if (/_600\./i.test(url)) return 3;
    if (/\/Webshop-Teaser\//i.test(url)) return 2;
    if (/\/thumbnail\//i.test(url)) return 0;
    return 1;
  };

  for (const url of urls.filter(Boolean)) {
    const key = canonicalImageKey(url);
    const current = bestByKey.get(key);

    if (!current || scoreImage(url) > scoreImage(current)) {
      bestByKey.set(key, url);
    }
  }

  return [...bestByKey.values()];
}

function image(assetUrl, title = "") {
  return {
    title,
    originalSize: "834x834",
    assetUrl,
    mediaFocalPoint: {
      x: 0.5,
      y: 0.5,
      source: 3
    }
  };
}

function colorway({ productSlug, label, sku, images, description }) {
  const normalizedLabel = label || sku || "Coloris";
  const cleanImages = dedupeImagesByVisual(images);
  return {
    id: `${productSlug}-${slugify(normalizedLabel) || "coloris"}`,
    label: normalizedLabel,
    sku: sku || normalizedLabel,
    price: null,
    salePrice: null,
    description,
    images: cleanImages.map((item) => image(item, `${normalizedLabel}`)),
    mainImage: cleanImages[0] ? image(cleanImages[0], `${normalizedLabel}`) : null
  };
}

function product({ title, sourceUrl, brand, type, subtype, descriptionText, specs = [], colorways }) {
  const productSlug = slugify(title);
  const description = [
    `<p><strong>Type de produit:</strong> ${escapeHtml(type)}</p>`,
    subtype ? `<p><strong>Type:</strong> ${escapeHtml(translateSubtype(subtype))}</p>` : "",
    descriptionText ? `<p>${escapeHtml(descriptionText)}</p>` : "",
    ...specs.map(([label, value]) => `<p><strong>${escapeHtml(translateSpecLabel(label))}:</strong> ${escapeHtml(translateSpecValue(value))}</p>`)
  ].join("");
  const images = dedupeImagesByVisual(colorways.flatMap((item) => item.images || [])).slice(0, 8);

  return {
    id: `import-${productSlug}`,
    title,
    brand,
    sourceUrl,
    fullUrl: `/produits/p/${productSlug}`,
    urlSlug: productSlug,
    price: null,
    salePrice: null,
    soldOut: false,
    onSale: false,
    description,
    variants: [],
    firstInStockVariant: null,
    userDefinedVariantOptions: [],
    productType: 1,
    images: images.map((item) => image(item, title)),
    mainImage: images[0] ? image(images[0], title) : null,
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [brand, type, subtype].filter(Boolean),
    mightHavePaymentPlan: false,
    collections: ["all"],
    colorways: colorways.map((item) =>
      colorway({
        productSlug,
        ...item
      })
    )
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; ODC catalog importer)"
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }

  return response.text();
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return "";
}

async function importFroca([fallbackTitle, sourceUrl]) {
  const html = await fetchHtml(sourceUrl);
  const title = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || fallbackTitle).toUpperCase();
  const descriptionHtml = html.match(/<p class=["']desc["']>([\s\S]*?)<\/p>/i)?.[1] || extractMeta(html, "description");
  const descriptionText = productFrenchDescriptions[title] || stripTags(descriptionHtml.replace(/<\/br>/gi, ". "));
  const mainImage = absolutizeUrl(html.match(/<div class=['"]mySlides[^>]*>\s*<img[^>]+src=['"]([^'"]+)/i)?.[1], sourceUrl);
  const specs = [];

  for (const label of ["Composición", "Ancho", "Peso", "Resistencia a la abrasión"]) {
    const match = descriptionHtml.match(new RegExp(`<b>${label}:<\\/b>\\s*([^<]+)`, "i"));
    if (match?.[1]) {
      specs.push([label, stripTags(match[1])]);
    }
  }

  const productSlug = slugify(title);
  const colorwayMatches = [...html.matchAll(/<div class=['"]imgcolor['"]>[\s\S]*?<a[^>]+href=['"]([^'"]+)['"][^>]*>[\s\S]*?<img[^>]+src=['"]([^'"]+)['"][^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/gi)];
  const colorways = colorwayMatches.map((match, index) => {
    const fullImage = absolutizeUrl(match[1] || match[2], sourceUrl);
    const thumbImage = absolutizeUrl(match[2] || match[1], sourceUrl);
    const sku = stripTags(match[3]);
    const rawLabel = sku.replace(new RegExp(`^${title}\\s*`, "i"), "").trim() || sku;
    const label = rawLabel;
    return {
      label,
      sku,
      images: unique([fullImage, thumbImage, mainImage]),
      description: colorwayDescription(sku, label)
    };
  });

  return product({
    title,
    sourceUrl,
    brand: "Froca",
    type: "Tissu",
    subtype: sourceUrl.includes("tapiceria") ? "Tapicerie" : "Décoration",
    descriptionText,
    specs,
    colorways: colorways.length
      ? colorways
      : [
          {
            label: title,
            sku: title,
            images: unique([mainImage]),
            description: colorwayDescription(title, "")
          }
        ]
  });
}

function symphonyImageUrls(imageSet = {}) {
  return dedupeImagesByVisual([imageSet.defaultUrl, imageSet.teaserImageUrl]);
}

async function importSymphony([fallbackTitle, sourceUrl]) {
  const html = await fetchHtml(sourceUrl);
  const raw = html.match(/<script id=["']__NEXT_DATA__["'] type=["']application\/json["']>([\s\S]*?)<\/script>/i)?.[1];

  if (!raw) {
    throw new Error(`Impossible de lire Symphony: ${sourceUrl}`);
  }

  const data = JSON.parse(raw);
  const item = data?.props?.pageProps?.data?.content?.product;
  const title = (item?.name || fallbackTitle).toUpperCase();
  const category = item?.category?.name || "";
  const secondaryImages = (item?.secondaryImages || []).flatMap(symphonyImageUrls);
  const productImages = dedupeImagesByVisual([...symphonyImageUrls(item?.primaryImage), ...secondaryImages]);
  const specs = [
    ["Collection", item?.collection?.name || item?.collection || ""],
    ["Usage", Array.isArray(item?.usages) ? unique(item.usages.map((usage) => usage?.name || usage)).join(", ") : ""],
    ["Laize", item?.sizes?.width ? `${item.sizes.width}` : ""],
    ["Composition", item?.composition || ""]
  ].filter(([, value]) => value);

  return product({
    title,
    sourceUrl,
    brand: "Symphony Mills",
    type: "Tissu",
    subtype: category || "Texture",
    descriptionText: productFrenchDescriptions[title] || item?.description || "",
    specs,
    colorways: (item?.colors || []).map((entry, index) => {
      const rawLabel = entry.customerTitle || entry.name || entry.id;
      const label = rawLabel;
      const reference = `${title}-${entry.name || entry.id}`;
      const colorImages = dedupeImagesByVisual([...(entry.imageUrls || []).flatMap(symphonyImageUrls), ...productImages]).slice(0, 5);
      return {
        label,
        sku: reference,
        images: colorImages,
        description: colorwayDescription(reference, label)
      };
    })
  });
}

function enhanceYorkImage(url) {
  return decodeHtml(url).replace(/_360\.(jpeg|jpg|webp)$/i, "_600.$1");
}

function extractYorkSearchColorways(html, name) {
  const matches = [...html.matchAll(/<h3 class=product-title><a href=([^ >]+)[^>]*>([\s\S]*?)<\/a><\/h3>/gi)];

  return matches.map((match, index) => {
    const start = html.lastIndexOf("<div class=item-box", match.index);
    const end = index + 1 < matches.length ? matches[index + 1].index : html.length;
    const block = html.slice(Math.max(0, start), end);
    const title = stripTags(match[2]);
    const href = absolutizeUrl(match[1].replace(/^["']|["']$/g, ""), "https://www.yorkwallcoverings.com");
    const dataAnalytics = decodeHtml(block.match(/data-analytics=["']([^"']+)["']/i)?.[1] || "");
    const sku = dataAnalytics.split(",")[1]?.trim() || href.split("/").pop()?.toUpperCase() || title;
    const images = dedupeImagesByVisual(
      [...block.matchAll(/https:\/\/bhf-cdn\.azureedge\.net\/[^"' <)]+?\.(?:jpeg|jpg|webp)/gi)]
        .map((item) => enhanceYorkImage(item[0]))
        .filter((url) => !url.includes("/logo"))
    ).slice(0, 4);
    const rawLabel = title.replace(new RegExp(name.split(/\s+/).filter(Boolean).join("|"), "ig"), "").replace(/\b(faux|wallpaper|grasscloth|linen|stripe|mural)\b/gi, "").replace(/\s+/g, " ").trim() || title;
    const label = rawLabel;

    return {
      label,
      sku,
      images,
      description: colorwayDescription(sku, label),
      sourceUrl: href
    };
  }).filter((item) => item.images.length);
}

async function importYork(name) {
  const searchTerms = unique([
    name,
    name.replace(/['’]/g, ""),
    name.replace(/['’]S\b/gi, " S").replace(/['’]/g, "")
  ]);
  let sourceUrl = "";
  let colorways = [];

  for (const searchTerm of searchTerms) {
    sourceUrl = `https://www.yorkwallcoverings.com/search?advs=false&cid=0&mid=0&vid=0&q=${encodeURIComponent(searchTerm)}&sid=false&isc=true&orderBy=100`;
    const html = await fetchHtml(sourceUrl);
    colorways = extractYorkSearchColorways(html, name).slice(0, 18);

    if (colorways.length) {
      break;
    }
  }

  if (!colorways.length) {
    throw new Error(`Aucun resultat York pour ${name}`);
  }

  return product({
    title: name.toUpperCase(),
    sourceUrl,
    brand: "York Wallcoverings",
    type: "Papier peint",
    subtype: "Papier peint",
    descriptionText: `Sélection de papier peint décoratif autour du motif ${name}. Les coloris proposés permettent de comparer rapidement les nuances disponibles pour un projet d’intérieur.`,
    specs: [],
    colorways
  });
}

function serialize(value) {
  return JSON.stringify(value, null, 2).replace(/"__MAX_SAFE_INTEGER__"/g, "Number.MAX_SAFE_INTEGER");
}

async function main() {
  const products = [];
  const failures = [];
  const jobs = [
    ...frocaEntries.map((entry) => ["Froca", entry, () => importFroca(entry)]),
    ...symphonyEntries.map((entry) => ["Symphony", entry, () => importSymphony(entry)]),
    ...yorkNames.map((entry) => ["York", entry, () => importYork(entry)])
  ];

  for (const [source, entry, importer] of jobs) {
    const label = Array.isArray(entry) ? entry[0] : entry;
    process.stdout.write(`Import ${source}: ${label}... `);

    try {
      const imported = await importer();
      products.push(imported);
      console.log(`${imported.colorways?.length || 0} coloris`);
    } catch (error) {
      failures.push({ source, label, error: error.message });
      console.log(`ECHEC (${error.message})`);
    }
  }

  const source = `// Generated by scripts/import-odyssee-catalog.mjs\n// Do not edit manually; update the importer/source list and rerun it.\n\nexport const odysseeImportedProducts = ${serialize(products)};\n\nexport const odysseeImportFailures = ${serialize(failures)};\n`;
  await fs.writeFile(outputPath, source, "utf8");
  console.log(`\\n${products.length} produits importes, ${failures.length} echecs`);
  console.log(outputPath);

  if (failures.length) {
    console.log(JSON.stringify(failures, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
