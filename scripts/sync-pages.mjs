import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pages = [
  { source: "/marques", html: "marques.html", aliases: ["marques/index.html"] },
  { source: "/ambiances", html: "ambiances.html", aliases: ["ambiances/index.html"] },
  { source: "/contract", html: "contract.html", aliases: ["contract/index.html"] },
  { source: "/histoire", html: "histoire.html", aliases: ["histoire/index.html"] },
  {
    source: "/showroons",
    html: "showrooms.html",
    aliases: ["showroons/index.html", "showrooms/index.html"]
  }
];

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

for (const page of pages) {
  const response = await fetch(`https://www.odyssee.ma${page.source}`, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Unable to fetch https://www.odyssee.ma${page.source}: ${response.status}`);
  }

  const html = injectSharedNavbar(await response.text());
  await writeFile(resolve(root, page.html), html);

  for (const alias of page.aliases) {
    const destination = resolve(root, alias);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html);
  }
}

console.log("Static pages synced");
