import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const productsUrl = "https://www.odyssee.ma/produits";
const sitemapUrl = "https://www.odyssee.ma/sitemap.xml";

function injectSharedNavbar(html) {
  const linkTag = '<link rel="stylesheet" href="/src/home-navbar.css" />';
  const scriptTag = '<script type="module" src="/src/home-navbar.js"></script>';
  let output = html.replace("</head>", `${linkTag}\n</head>`);
  output = output.replace(/<body([^>]*)class="/, '<body$1class="odc-home-shell ');
  output = output.replace(
    /<body([\s\S]*?)>/,
    (match) => `${match}\n<div id="odc-home-header-root"></div>`
  );
  output = output.replace("</body>", '<div id="odc-home-footer-root"></div>\n</body>');
  output = output.replace("</body>", `${scriptTag}\n</body>`);
  return output;
}

const response = await fetch(productsUrl, { redirect: "follow" });

if (!response.ok) {
  throw new Error(`Unable to fetch ${productsUrl}: ${response.status}`);
}

const productsHtml = injectSharedNavbar(await response.text());

await writeFile(resolve(root, "produits.html"), productsHtml);
await mkdir(resolve(root, "produits"), { recursive: true });
await writeFile(resolve(root, "produits", "index.html"), productsHtml);

const sitemapResponse = await fetch(sitemapUrl, { redirect: "follow" });

if (!sitemapResponse.ok) {
  throw new Error(`Unable to fetch ${sitemapUrl}: ${sitemapResponse.status}`);
}

const sitemapXml = await sitemapResponse.text();
const productRoutes = [...sitemapXml.matchAll(/https:\/\/www\.odyssee\.ma(\/produits[^<]+)/g)].map(
  (match) => match[1]
);

for (const route of productRoutes) {
  if (route === "/produits") {
    continue;
  }

  const pageResponse = await fetch(`https://www.odyssee.ma${route}`, { redirect: "follow" });
  if (!pageResponse.ok) {
    throw new Error(`Unable to fetch https://www.odyssee.ma${route}: ${pageResponse.status}`);
  }

  const html = injectSharedNavbar(await pageResponse.text());
  const filePath = resolve(root, route.slice(1), "index.html");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, html);
}

console.log("Products routes synced from", productsUrl, "and sitemap");
