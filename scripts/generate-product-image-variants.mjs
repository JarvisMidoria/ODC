import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const productPages = [
  "produits/p/boot-hill/index.html",
  "produits/p/willow/index.html",
  "produits/p/fishbone/index.html",
  "produits/p/thunderbird/index.html",
  "produits/p/at192-col-16-xgkbt/index.html",
  "produits/p/otomi/index.html",
  "produits/p/at192-col-16/index.html",
  "produits/p/1830-col-01/index.html",
  "produits/p/1835-col-02/index.html",
  "produits/p/tico/index.html",
  "produits/p/at192-col-16-xgkbt-z6y7l/index.html",
  "produits/p/acebuche/index.html",
  "produits/p/tipi/index.html",
  "produits/p/alaior/index.html",
  "produits/p/1830-col-01-d79r9/index.html",
  "produits/p/cody/index.html",
  "produits/p/creek/index.html",
  "produits/p/clay/index.html",
  "produits/p/magpie/index.html",
  "produits/p/big-thunder/index.html",
  "produits/p/puebla/index.html",
  "produits/p/danza-de-la-lluvia/index.html",
  "produits/p/morningstar/index.html",
  "produits/p/blanket/index.html",
  "produits/p/doria/index.html",
  "produits/p/1807-col-1/index.html",
  "produits/p/durango/index.html",
  "produits/p/cash/index.html",
  "produits/p/wyatt/index.html",
  "produits/p/1830-col-01-sj7b9/index.html",
  "produits/p/arizona/index.html"
];

function variantSrc(src) {
  const extension = extname(src);
  return src.replace(new RegExp(`${extension}$`), `-500w${extension}`);
}

async function collectSources() {
  const sources = new Set();

  for (const page of productPages) {
    const html = await readFile(page, "utf8");
    for (const match of html.matchAll(/class="product-gallery-slides-item-image"[\s\S]*?data-src="([^"]+)"/g)) {
      sources.add(match[1]);
    }
  }

  return [...sources];
}

async function generateVariant(publicSrc) {
  const sourcePath = join("public", publicSrc.slice(1));
  const outputSrc = variantSrc(publicSrc);
  const outputPath = join("public", outputSrc.slice(1));

  await mkdir(dirname(outputPath), { recursive: true });

  if (!existsSync(outputPath)) {
    await execFileAsync("/usr/bin/sips", [
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "72",
      "-Z",
      "500",
      sourcePath,
      "--out",
      outputPath
    ]);
  }

  return {
    src: outputSrc,
    width: 500
  };
}

const manifest = {};
for (const src of await collectSources()) {
  manifest[src] = await generateVariant(src);
}

const body = `export const productImageVariants = ${JSON.stringify(manifest, null, 2)};\n`;
await writeFile("scripts/product-image-variants.mjs", body);
console.log(`Generated ${Object.keys(manifest).length} product image variants`);
