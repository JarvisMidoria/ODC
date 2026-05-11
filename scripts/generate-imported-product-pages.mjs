import fs from "node:fs/promises";
import path from "node:path";
import { odysseeImportedProducts } from "../src/product-catalog-odyssee-imported.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const productsRoot = path.join(root, "produits", "p");

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

function pageForProduct(product) {
  const title = `${product.title} — Odyssée`;
  const image = product.mainImage?.assetUrl || product.images?.[0]?.assetUrl || "";
  const description = String(product.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="https://www.odyssee.ma${product.fullUrl}" />
    <meta property="og:site_name" content="Odyssée" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:url" content="https://www.odyssee.ma${product.fullUrl}" />
    <meta property="og:type" content="product" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ""}
    <link rel="icon" href="/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-ca529fb2-ea08-4095-ad9c-b15a09eab42f-favicon.ico?format=100w" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,700;1,400;1,700" />
    <link rel="stylesheet" type="text/css" href="/mirrored-styles/assets.squarespace.com-universal-styles-compressed-commerce-0cdd7b80ab19270e-min.en-us.css" />
    <link rel="stylesheet" type="text/css" href="/mirrored-styles/assets.squarespace.com-universal-styles-compressed-user-account-core-04f69a41dc2eeba0-min.en-us.css" />
    <link rel="stylesheet" type="text/css" href="/mirrored-styles/static1.squarespace.com-677ec6234f6cb47c166aec0b-1767-site.css" />
    <link rel="stylesheet" type="text/css" href="/mirrored-styles/static1.squarespace.com-versioned-assets-1775067901690-fu1xwdnltjyprnloifj1-static.css" />
    <link rel="stylesheet" href="/src/home-navbar.css" />
  </head>
  <body class="odc-home-shell odc-cart-shell">
    <div id="odc-home-header-root"></div>
    <main class="odc-cart-main" role="main">
      <div class="product-detail"></div>
    </main>
    <footer id="footer-sections"></footer>
    <script type="module" src="/src/home-navbar.js"></script>
  </body>
</html>
`;
}

await fs.mkdir(productsRoot, { recursive: true });

for (const product of odysseeImportedProducts) {
  const directory = path.join(productsRoot, product.urlSlug);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "index.html"), pageForProduct(product), "utf8");
}

console.log(`Generated ${odysseeImportedProducts.length} product pages`);
