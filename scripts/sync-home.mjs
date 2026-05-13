import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const homeUrl = "https://www.odyssee.ma/home";

const aliasMap = {
  "inventaire/index.html": "/produits.html",
  "marques/index.html": "/marques.html",
  "ambiances/index.html": "/ambiances.html",
  "contract/index.html": "/contract.html",
  "histoire/index.html": "/histoire.html",
  "showroons/index.html": "/showrooms.html",
  "cart/index.html": "https://www.odyssee.ma/cart"
};

function injectHomeNavbar(html) {
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

function redirectHtml(target) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${target}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirection</title>
    <script>
      window.location.replace(${JSON.stringify(target)});
    </script>
  </head>
  <body></body>
</html>
`;
}

async function writeAlias(file, target) {
  const absolute = resolve(root, file);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, redirectHtml(target));
}

const response = await fetch(homeUrl, { redirect: "follow" });

if (!response.ok) {
  throw new Error(`Unable to fetch ${homeUrl}: ${response.status}`);
}

const homeHtml = injectHomeNavbar(await response.text());

await writeFile(resolve(root, "index.html"), homeHtml);
await mkdir(resolve(root, "home"), { recursive: true });
await writeFile(resolve(root, "home", "index.html"), homeHtml);

await Promise.all(Object.entries(aliasMap).map(([file, target]) => writeAlias(file, target)));

console.log("Homepage synced from", homeUrl);
