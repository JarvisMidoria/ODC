import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/macbookair/Desktop/ODC";
const FILES = [
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

function removeOriginalHeader(html) {
  return html.replace(/\s*<header\b[\s\S]*?\bid="header"[\s\S]*?<\/header>\s*/i, "\n");
}

function trimRuntimeAttributes(html) {
  return html
    .replace(/\sdata-context="[^"]*"/g, "")
    .replace(/\sdata-localized-strings="[^"]*"/g, "")
    .replace(/\sdata-block-scripts="[^"]*"/g, "")
    .replace(/\sdata-controller="(?:ProductList|ProductDetail|SectionWrapperController|Lightbox|Header)"/g, "");
}

function trimPreconnects(html) {
  return html.replace(/\n<link rel="preconnect" href="https:\/\/images\.squarespace-cdn\.com">\s*/g, "\n");
}

let changedCount = 0;

for (const file of FILES) {
  const source = fs.readFileSync(file, "utf8");
  const cleaned = trimPreconnects(trimRuntimeAttributes(removeOriginalHeader(source)));

  if (cleaned !== source) {
    fs.writeFileSync(file, cleaned, "utf8");
    changedCount += 1;
    console.log(`trimmed ${path.relative(ROOT, file)}`);
  }
}

console.log(`done: ${changedCount} file(s) updated`);
