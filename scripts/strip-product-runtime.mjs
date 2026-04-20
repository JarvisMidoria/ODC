import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const files = [
  "/Users/macbookair/Desktop/ODC/produits.html",
  "/Users/macbookair/Desktop/ODC/produits/index.html",
  "/Users/macbookair/Desktop/ODC/produits/coton/index.html",
  "/Users/macbookair/Desktop/ODC/produits/cuir/index.html",
  "/Users/macbookair/Desktop/ODC/produits/jacquard/index.html",
  "/Users/macbookair/Desktop/ODC/produits/lin/index.html",
  "/Users/macbookair/Desktop/ODC/produits/recycl/index.html",
  "/Users/macbookair/Desktop/ODC/produits/tissu-enduit/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/1807-col-1/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/1830-col-01/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/1830-col-01-d79r9/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/1830-col-01-sj7b9/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/1835-col-02/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/at192-col-16/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/at192-col-16-xgkbt/index.html",
  "/Users/macbookair/Desktop/ODC/produits/p/at192-col-16-xgkbt-z6y7l/index.html"
];

function shouldStripScriptTag(scriptTag) {
  const normalized = scriptTag.replace(/\s+/g, " ");

  if (/type=["']application\/ld\+json["']/i.test(normalized)) {
    return false;
  }

  if (/src=["']\/src\/home-navbar\.js["']/i.test(normalized)) {
    return false;
  }

  if (/src=["'](?:https?:)?\/\/assets\.squarespace\.com\//i.test(normalized)) {
    return true;
  }

  if (/src=["']https:\/\/definitions\.sqspcdn\.com\//i.test(normalized)) {
    return true;
  }

  if (/src=["']https:\/\/static1\.squarespace\.com\/static\/vta\//i.test(normalized)) {
    return true;
  }

  if (/SQUARESPACE_ROLLUPS|Static\.SQUARESPACE_CONTEXT|Static\.COOKIE_BANNER_CAPABLE/i.test(normalized)) {
    return true;
  }

  return false;
}

async function stripRuntime(file) {
  const source = await readFile(file, "utf8");
  const cleaned = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (scriptTag) => {
    return shouldStripScriptTag(scriptTag) ? "" : scriptTag;
  });

  if (cleaned !== source) {
    await writeFile(file, cleaned, "utf8");
  }

  return cleaned !== source;
}

let changedCount = 0;

for (const file of files) {
  const changed = await stripRuntime(file);
  if (changed) {
    changedCount += 1;
    console.log(`cleaned ${path.relative("/Users/macbookair/Desktop/ODC", file)}`);
  }
}

console.log(`done: ${changedCount} file(s) updated`);
