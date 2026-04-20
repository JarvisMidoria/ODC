import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/macbookair/Desktop/ODC";
const OUTPUT_DIR = path.join(ROOT, "public", "mirrored-styles");
const PRODUCT_HTML_FILES = [
  "produits.html",
  "produits/index.html",
  "produits/coton/index.html",
  "produits/cuir/index.html",
  "produits/jacquard/index.html",
  "produits/lin/index.html",
  "produits/recycl/index.html",
  "produits/tissu-enduit/index.html",
  "produits/p/1807-col-1/index.html",
  "produits/p/1830-col-01/index.html",
  "produits/p/1830-col-01-d79r9/index.html",
  "produits/p/1830-col-01-sj7b9/index.html",
  "produits/p/1835-col-02/index.html",
  "produits/p/at192-col-16/index.html",
  "produits/p/at192-col-16-xgkbt/index.html",
  "produits/p/at192-col-16-xgkbt-z6y7l/index.html"
].map((file) => path.join(ROOT, file));

const STYLE_URLS = [
  "https://static1.squarespace.com/static/versioned-site-css/677ec6234f6cb47c166aec02/28/5c5a519771c10ba3470d8101/677ec6234f6cb47c166aec0b/1767/site.css?nocustom=true",
  "https://static1.squarespace.com/static/vta/5c5a519771c10ba3470d8101/versioned-assets/1775067901690-FU1XWDNLTJYPRNLOIFJ1/static.css",
  "https://assets.squarespace.com/universal/styles-compressed/commerce-0cdd7b80ab19270e-min.en-US.css",
  "https://assets.squarespace.com/universal/styles-compressed/user-account-core-04f69a41dc2eeba0-min.en-US.css",
  "https://definitions.sqspcdn.com/website-component-definition/static-assets/website.components.socialLinks/06cc33c9-df71-4bea-bb45-b8271a7ffeed_163/website.components.socialLinks.styles.css",
  "https://definitions.sqspcdn.com/website-component-definition/static-assets/website.components.imageFluid/b7bacc0e-5721-49cc-9aa2-b1087ea46113_373/website.components.imageFluid.styles.css",
  "https://definitions.sqspcdn.com/website-component-definition/static-assets/website.components.html/859aabbe-1dae-4f78-b818-4f64fea54982_385/website.components.html.styles.css"
];

function sanitizeName(input) {
  return input
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function buildCssFilename(urlString) {
  const url = new URL(urlString);
  const pathname = decodeURIComponent(url.pathname);
  const parts = pathname.split("/").filter(Boolean);
  const basename = parts.at(-1) || "style.css";
  const stem = sanitizeName(`${url.hostname}-${parts.slice(-3, -1).join("-")}-${basename}`);
  return stem.endsWith(".css") ? stem : `${stem}.css`;
}

function buildAssetFilename(urlString) {
  const url = new URL(urlString);
  const pathname = decodeURIComponent(url.pathname);
  const ext = path.extname(pathname) || ".bin";
  const parts = pathname.split("/").filter(Boolean);
  const basename = path.basename(pathname, ext);
  return `${sanitizeName(`${url.hostname}-${parts.slice(-3).join("-")}-${basename}`)}${ext.toLowerCase()}`;
}

function resolveAssetUrl(reference, baseUrl) {
  if (!reference || reference.startsWith("data:") || reference.startsWith("#")) {
    return null;
  }

  if (reference.startsWith("//")) {
    return new URL(`https:${reference}`).toString();
  }

  if (reference.startsWith("/")) {
    const origin = new URL(baseUrl).origin;
    return new URL(reference, origin).toString();
  }

  return new URL(reference, baseUrl).toString();
}

async function fetchBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const assetsDir = path.join(OUTPUT_DIR, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const htmlReplacements = new Map();
  const assetReplacements = new Map();

  for (const styleUrl of STYLE_URLS) {
    const cssBuffer = await fetchBuffer(styleUrl);
    let cssText = cssBuffer.toString("utf8");
    const matches = [...cssText.matchAll(/url\(([^)]+)\)/g)];

    for (const match of matches) {
      const rawReference = match[1].trim().replace(/^['"]|['"]$/g, "");
      const resolved = resolveAssetUrl(rawReference, styleUrl);

      if (!resolved || assetReplacements.has(resolved)) {
        continue;
      }

      const assetFilename = buildAssetFilename(resolved);
      const localAssetPath = path.join(assetsDir, assetFilename);
      const localAssetUrl = `/mirrored-styles/assets/${assetFilename}`;

      if (!fs.existsSync(localAssetPath)) {
        const assetBuffer = await fetchBuffer(resolved);
        fs.writeFileSync(localAssetPath, assetBuffer);
      }

      assetReplacements.set(resolved, localAssetUrl);
    }

    for (const [sourceUrl, localUrl] of assetReplacements.entries()) {
      cssText = cssText.split(sourceUrl).join(localUrl);
      cssText = cssText.split(sourceUrl.replace(/^https:/, "")).join(localUrl);
    }

    const cssFilename = buildCssFilename(styleUrl);
    fs.writeFileSync(path.join(OUTPUT_DIR, cssFilename), cssText, "utf8");
    htmlReplacements.set(styleUrl, `/mirrored-styles/${cssFilename}`);
    htmlReplacements.set(styleUrl.replace(/^https:/, ""), `/mirrored-styles/${cssFilename}`);
  }

  for (const file of PRODUCT_HTML_FILES) {
    let html = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const [sourceUrl, localUrl] of htmlReplacements.entries()) {
      if (!html.includes(sourceUrl)) {
        continue;
      }
      html = html.split(sourceUrl).join(localUrl);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, html, "utf8");
      console.log(`updated ${path.relative(ROOT, file)}`);
    }
  }

  console.log(`mirrored ${STYLE_URLS.length} styles into public/mirrored-styles`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
