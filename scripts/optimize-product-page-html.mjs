import { productImageVariants } from "./product-image-variants.mjs";

function buildSrcset(src, originalWidth) {
  const variant = productImageVariants[src];
  const entries = [];

  if (variant?.src && variant?.width) {
    entries.push(`${variant.src} ${variant.width}w`);
  }

  entries.push(`${src} ${originalWidth}w`);
  return entries.join(", ");
}

function extractImageDimensions(tag) {
  const match = tag.match(/data-image-dimensions="(\d+)x(\d+)"/);
  if (!match) {
    return { width: "834", height: "834" };
  }

  return {
    width: match[1],
    height: match[2]
  };
}

function stripAttribute(tag, attribute) {
  return tag.replace(new RegExp(`\\s${attribute}="[^"]*"`, "g"), "");
}

function setAttribute(tag, attribute, value) {
  const stripped = stripAttribute(tag, attribute);
  const selfClosing = /\/>$/.test(stripped.trim());
  return stripped.replace(/\s*\/?>$/, ` ${attribute}="${value}"${selfClosing ? " />" : ">"}`);
}

function enhanceImageTag(tag, src, options = {}) {
  const { width, height } = extractImageDimensions(tag);
  const srcset = buildSrcset(src, width);
  const sizes = options.sizes || "(max-width: 767px) 100vw, 50vw";

  let next = tag;
  ["src", "srcset", "sizes", "loading", "decoding", "fetchpriority", "width", "height"].forEach((attribute) => {
    next = stripAttribute(next, attribute);
  });

  next = next.replace(/\s+\/\s*>$/, ">");
  next = next.replace(/\s*\/>$/, ">");

  next = setAttribute(next, "src", src);
  next = setAttribute(next, "srcset", srcset);
  next = setAttribute(next, "sizes", sizes);
  next = setAttribute(next, "width", width);
  next = setAttribute(next, "height", height);
  next = setAttribute(next, "decoding", "async");
  next = setAttribute(next, "loading", options.loading || "lazy");

  if (options.fetchpriority) {
    next = setAttribute(next, "fetchpriority", options.fetchpriority);
  }

  return next;
}

function injectPreloadLink(html, href, originalWidth) {
  if (!href || html.includes(`rel="preload" as="image" href="${href}"`)) {
    return html;
  }

  const preload = `<link rel="preload" as="image" href="${href}" imagesrcset="${buildSrcset(
    href,
    originalWidth
  )}" imagesizes="(max-width: 767px) 100vw, 50vw" fetchpriority="high"/>`;

  return html.replace("</head>", `${preload}\n</head>`);
}

export function optimizeProductPageHtml(html) {
  const imageTagPattern = /<img\b[^>]*class="product-gallery-slides-item-image"[^>]*>/g;
  const matches = [...html.matchAll(imageTagPattern)];

  if (!matches.length) {
    return html;
  }

  let output = html;
  const firstTag = matches[0][0];
  const firstSrcMatch = firstTag.match(/data-src="([^"]+)"/);
  const firstSrc = firstSrcMatch?.[1] || "";
  const firstDimensions = extractImageDimensions(firstTag);

  if (firstSrc) {
    output = output.replace(
      firstTag,
      enhanceImageTag(firstTag, firstSrc, {
        loading: "eager",
        fetchpriority: "high"
      })
    );
    output = injectPreloadLink(output, firstSrc, firstDimensions.width);
  }

  for (const match of matches.slice(1)) {
    const tag = match[0];
    const srcMatch = tag.match(/data-src="([^"]+)"/);
    const src = srcMatch?.[1];
    if (!src) {
      continue;
    }

    output = output.replace(
      tag,
      enhanceImageTag(tag, src, {
        loading: "lazy"
      })
    );
  }

  return output;
}
