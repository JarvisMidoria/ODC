import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public", "mirrored-assets");
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg|ico)$/i;
const TEXT_EXTENSIONS = new Set([".html", ".js", ".css"]);
const IGNORED_DIRS = new Set([".git", "dist", "node_modules", "public"]);
const URL_PATTERN = /https?:\/\/[^"'()\s>]+/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeAssetUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function buildLocalFilename(urlString, takenNames) {
  const url = new URL(urlString);
  const pathname = decodeURIComponent(url.pathname);
  const extension = path.extname(pathname).toLowerCase();
  const pathSegments = pathname.split("/").filter(Boolean);
  const basename = path.basename(pathname, extension);
  const parent = pathSegments.at(-2) || "asset";
  const grandParent = pathSegments.at(-3) || "root";
  const host = url.hostname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const rawName = `${host}-${grandParent}-${parent}-${basename}`
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  let candidate = `${rawName}${extension}`;
  let index = 2;

  while (takenNames.has(candidate)) {
    candidate = `${rawName}-${index}${extension}`;
    index += 1;
  }

  takenNames.add(candidate);
  return candidate;
}

function collectImageUrls(files) {
  const urls = new Map();

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const matches = text.match(URL_PATTERN) || [];

    for (const match of matches) {
      if (!IMAGE_EXTENSIONS.test(new URL(match).pathname)) {
        continue;
      }

      const normalized = normalizeAssetUrl(match);
      if (!urls.has(normalized)) {
        urls.set(normalized, new Set());
      }
      urls.get(normalized).add(file);
    }
  }

  return urls;
}

async function downloadImage(url, destination) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, buffer);
}

async function main() {
  const files = walk(ROOT);
  const imageUrls = collectImageUrls(files);

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const takenNames = new Set();
  const replacements = new Map();

  for (const url of imageUrls.keys()) {
    const localName = buildLocalFilename(url, takenNames);
    const localPath = path.join(PUBLIC_DIR, localName);

    if (!fs.existsSync(localPath)) {
      await downloadImage(url, localPath);
    }

    replacements.set(url, `/mirrored-assets/${localName}`);
  }

  for (const file of files) {
    let text = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const [sourceUrl, localUrl] of replacements.entries()) {
      if (!text.includes(sourceUrl)) {
        continue;
      }
      text = text.split(sourceUrl).join(localUrl);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, text);
    }
  }

  console.log(`Mirrored ${replacements.size} images into ${path.relative(ROOT, PUBLIC_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
