import { getProductCatalogItemsForPath, productCollections } from "./product-catalog-data.js";

const navItems = [
  { href: "/produits", label: "Produits", matches: ["/produits", "/produits/","/produits.html"] },
  { href: "/marques.html", label: "Marques", matches: ["/marques", "/marques/","/marques.html"] },
  { href: "/ambiances.html", label: "Ambiances", matches: ["/ambiances", "/ambiances/","/ambiances.html"] },
  { href: "/contract.html", label: "Contract", matches: ["/contract", "/contract/","/contract.html"] },
  { href: "/histoire.html", label: "Histoire", matches: ["/histoire", "/histoire/","/histoire.html"] },
  { href: "/showrooms.html", label: "Showrooms", matches: ["/showrooms", "/showrooms/","/showroons","/showroons/","/showrooms.html"] }
];

const logo =
  "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-26b698d0-377c-47da-b63d-ee96b92af221-odysse-e-logo-design-v2.png";

const partnerLogos = [
  {
    alt: "Clarke & Clarke",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-8f6dd1cf-4d96-4315-aabd-de364e9749b5-clarke-clarke-logo.png",
    width: "104px",
    height: "24px",
    basis: "112px",
    scale: "1.18",
    gridWidth: "214px",
    gridHeight: "60px"
  },
  {
    alt: "Zoffany",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-6c8b16f3-da81-45ca-9c45-50c1b8381a47-zoffany-removebg-preview.png",
    width: "82px",
    height: "24px",
    basis: "122px",
    scale: "3.05",
    gridWidth: "456px",
    gridHeight: "204px"
  },
  {
    alt: "Morris & Co",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-9c502880-a230-409c-b230-614395c3a339-morris-and-co-logo-vector-removebg-preview.png",
    width: "102px",
    height: "24px",
    basis: "122px",
    scale: "1.4",
    gridWidth: "210px",
    gridHeight: "50px"
  },
  {
    alt: "Harlequin",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-1509a0c9-977a-4a49-8da6-4b3574ff805e-de-mooiste-muren-logo-harlequin-luxe-behang-removebg-preview.png",
    width: "108px",
    height: "22px",
    basis: "120px",
    scale: "1.14",
    gridWidth: "218px",
    gridHeight: "42px"
  },
  {
    alt: "Prestigious",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-1adc85c2-207d-4b47-9ba5-2eb077e26b99-artboard.png",
    width: "90px",
    height: "24px",
    basis: "132px",
    scale: "2.8",
    gridWidth: "584px",
    gridHeight: "136px"
  },
  {
    alt: "York Wallcoverings",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-28581e53-e360-4b74-a198-d10c3d6affea-ywc-logo-2018_400-removebg-preview.png",
    width: "104px",
    height: "22px",
    basis: "118px",
    scale: "1.3",
    gridWidth: "168px",
    gridHeight: "50px"
  },
  {
    alt: "Alessandro Bini",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-48718919-f382-4a0e-9407-3bee26450840-alessandrobini-1.png",
    width: "96px",
    height: "22px",
    basis: "136px",
    scale: "2.55",
    gridWidth: "476px",
    gridHeight: "84px"
  },
  {
    alt: "Aldeco",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-fb8c5ffa-5640-4ecd-9447-4dd9a045d577-2021-logo-aldeco-horiz-1024x724-removebg-preview.png",
    width: "90px",
    height: "24px",
    basis: "128px",
    scale: "2.4",
    gridWidth: "524px",
    gridHeight: "116px"
  },
  {
    alt: "Pedroso & osorio",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-0c8a5054-359f-484f-a42e-dcf45ce7c9c2-screenshot_2025-03-13_at_18.31.50-removebg-preview.png",
    width: "108px",
    height: "22px",
    basis: "118px",
    scale: "1.6",
    gridWidth: "162px",
    gridHeight: "52px"
  }
];

const nestedCollectionPaths = new Set(
  productCollections
    .filter((collection) => collection.path !== "/produits")
    .map((collection) => collection.path)
);

function normalizeCategoryPath(pathname) {
  if (nestedCollectionPaths.has(pathname)) {
    return `${pathname}/`;
  }

  return pathname;
}

if (window.location.pathname !== normalizeCategoryPath(window.location.pathname)) {
  const target = `${normalizeCategoryPath(window.location.pathname)}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
}

function navMarkup() {
  const current = window.location.pathname;
  return navItems
    .map((item) => {
      const matches = item.matches ?? [item.href];
      const active =
        matches.includes(current) ||
        (item.href === "/produits" && current.startsWith("/produits/")) ? "is-active" : "";
      return `<a class="${active}" href="${item.href}">${item.label}</a>`;
    })
    .join("");
}

const root = document.querySelector("#odc-home-header-root");

if (root) {
  root.innerHTML = `
    <header class="odc-home-header">
      <div class="odc-home-header__inner">
        <a class="odc-home-brand" href="/">
          <img src="${logo}" alt="Logo Odyssée" />
        </a>
        <button class="odc-home-toggle" type="button" aria-expanded="false" aria-controls="odc-home-mobile-nav">
          Menu
        </button>
        <nav class="odc-home-nav" aria-label="Navigation principale">
          ${navMarkup()}
        </nav>
        <a class="odc-home-cta" href="/contacter.html">Prendre contact</a>
      </div>
      <div id="odc-home-mobile-nav" class="odc-home-mobile">
        <nav aria-label="Navigation mobile">
          ${navMarkup()}
          <a class="odc-home-mobile-cta" href="/contacter.html">Prendre contact</a>
        </nav>
      </div>
    </header>
  `;

  const toggle = root.querySelector(".odc-home-toggle");
  const mobile = root.querySelector(".odc-home-mobile");
  toggle?.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    mobile?.classList.toggle("is-open", !expanded);
  });
}

function replaceHomeMarqueeWithLogos() {
  if (!["/", "/home", "/home/"].includes(window.location.pathname)) {
    return;
  }

  const marquee = document.querySelector(".Marquee");
  if (!marquee || marquee.dataset.odcBrandStripReady === "true") {
    return;
  }

  marquee.dataset.odcBrandStripReady = "true";
  marquee.classList.add("odc-brand-marquee");
  const logoItems = (hidden = false) =>
    partnerLogos
      .map(
        (item) => `
          <a class="odc-brand-strip__item" href="/marques.html" aria-label="${hidden ? "" : item.alt}" style="--odc-logo-width:${item.width};--odc-logo-height:${item.height};--odc-logo-basis:${item.basis};--odc-logo-scale:${item.scale};" ${hidden ? 'tabindex="-1" aria-hidden="true"' : ""}>
            <img class="odc-brand-strip__logo" src="${item.src}" alt="${hidden ? "" : item.alt}" loading="eager" decoding="async" />
          </a>
        `
      )
      .join("");

  marquee.innerHTML = `
    <div class="odc-brand-strip" aria-label="Voir les marques">
      <div class="odc-brand-strip__track">
        ${logoItems(false)}
        ${logoItems(true)}
      </div>
    </div>
  `;
}

function normalizeProductCategoryLinks() {
  document.querySelectorAll('a[href^="/produits/"]').forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || href.includes("/p/") || href.endsWith("/") || href.endsWith(".html")) {
      return;
    }

    const normalized = normalizeCategoryPath(href);
    if (normalized !== href) {
      link.setAttribute("href", normalized);
    }
  });

  document.querySelectorAll('option[value^="/produits/"]').forEach((option) => {
    const value = option.getAttribute("value");

    if (!value || value.includes("/p/") || value.endsWith("/") || value.endsWith(".html")) {
      return;
    }

    const normalized = normalizeCategoryPath(value);
    if (normalized !== value) {
      option.setAttribute("value", normalized);
    }
  });
}

function replaceMarquesGridWithLogos() {
  if (!["/marques", "/marques/", "/marques.html"].includes(window.location.pathname)) {
    return;
  }

  const gallery = document.querySelector('.gallery-strips[data-section-id="678d5cdd81638c5296106da8"]');
  if (!gallery || gallery.dataset.odcBrandGridReady === "true") {
    return;
  }

  gallery.dataset.odcBrandGridReady = "true";
  gallery.innerHTML = `
    <div class="odc-brand-grid" aria-label="Marques partenaires">
      ${partnerLogos
        .map(
          (item) => `
            <div class="odc-brand-grid__item">
              <img
                class="odc-brand-grid__logo"
                src="${item.src}"
                alt="${item.alt}"
                loading="eager"
                decoding="async"
                style="--odc-grid-width:${item.gridWidth};--odc-grid-height:${item.gridHeight};"
              />
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function isCommercePath() {
  return window.location.pathname.startsWith("/produits");
}

function hasCommerceCrumb() {
  return /(?:^|;\s*)crumb=/.test(document.cookie);
}

let commerceSessionPromise;

function getCommerceCrumb() {
  const match = document.cookie.match(/(?:^|;\s*)crumb=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function ensureCommerceSession() {
  if (hasCommerceCrumb()) {
    return true;
  }

  if (!commerceSessionPromise) {
    commerceSessionPromise = fetch("/cart", {
      method: "HEAD",
      credentials: "include",
      cache: "no-store"
    }).catch(() => null);
  }

  await commerceSessionPromise;
  commerceSessionPromise = undefined;

  return hasCommerceCrumb();
}

function patchCommerceRequests() {
  if (!isCommercePath() || window.__odcCommercePatched === true) {
    return;
  }

  window.__odcCommercePatched = true;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function open(method, url, ...rest) {
    this.__odcMethod = typeof method === "string" ? method.toUpperCase() : "";
    this.__odcUrl = typeof url === "string" ? url : "";
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function send(body) {
    const url = this.__odcUrl || "";
    const needsCsrf =
      this.__odcMethod === "POST" &&
      (
        url.startsWith("/api/commerce/") ||
        url.startsWith("/api/3/commerce/")
      );

    if (needsCsrf) {
      const crumb = getCommerceCrumb();

      if (crumb) {
        try {
          this.setRequestHeader("X-CSRF-Token", crumb);
        } catch {}
      }
    }

    return originalSend.call(this, body);
  };
}

function enableCommerceSessionBridge() {
  if (!isCommercePath()) {
    return;
  }

  patchCommerceRequests();
  void ensureCommerceSession();

  document.addEventListener(
    "click",
    async (event) => {
      const button = event.target instanceof Element
        ? event.target.closest(".sqs-add-to-cart-button")
        : null;

      if (!button || button.dataset.odcCrumbPrimed === "true" || hasCommerceCrumb()) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      button.dataset.odcCrumbPrimed = "true";
      await ensureCommerceSession();
      button.click();
      delete button.dataset.odcCrumbPrimed;
    },
    true
  );
}

function parseJsonAttribute(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function formatMoney(value) {
  if (!value || typeof value.value !== "string") {
    return "";
  }

  const amount = Number(value.value);

  if (!Number.isFinite(amount)) {
    return value.value;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: value.currency || "USD",
    minimumFractionDigits: 2
  }).format(amount);
}

async function getProductDiscoveryState() {
  const productList = document.querySelector(".product-list[data-controller='ProductList']");

  if (!productList) {
    return null;
  }

  const items = getProductCatalogItemsForPath(window.location.pathname);

  return {
    root: productList,
    items,
    currentIndex: -1,
    currentImageIndex: 0,
    activeTrigger: null,
    isAnimating: false
  };
}

function buildProductDiscoveryOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "odc-product-discovery";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="odc-product-discovery__backdrop" data-odc-close></div>
    <div class="odc-product-discovery__shell" role="dialog" aria-modal="true" aria-label="Aperçu du produit">
      <button class="odc-product-discovery__close" type="button" aria-label="Fermer" data-odc-close></button>
      <button class="odc-product-discovery__edge odc-product-discovery__edge--prev" type="button" aria-label="Produit précédent" data-odc-product-nav="prev"></button>
      <button class="odc-product-discovery__edge odc-product-discovery__edge--next" type="button" aria-label="Produit suivant" data-odc-product-nav="next"></button>
      <div class="odc-product-discovery__panel">
        <div class="odc-product-discovery__media">
          <div class="odc-product-discovery__thumbs" aria-label="Galerie produit"></div>
          <div class="odc-product-discovery__stage">
            <button class="odc-product-discovery__stage-arrow odc-product-discovery__stage-arrow--prev" type="button" aria-label="Image précédente" data-odc-image-nav="prev"></button>
            <div class="odc-product-discovery__image-wrap">
              <img class="odc-product-discovery__image" alt="" />
            </div>
            <button class="odc-product-discovery__stage-arrow odc-product-discovery__stage-arrow--next" type="button" aria-label="Image suivante" data-odc-image-nav="next"></button>
          </div>
        </div>
        <div class="odc-product-discovery__meta">
          <div class="odc-product-discovery__eyebrow">Collection</div>
          <h3 class="odc-product-discovery__title"></h3>
          <div class="odc-product-discovery__price"></div>
          <div class="odc-product-discovery__description"></div>
          <div class="odc-product-discovery__details"></div>
          <div class="odc-product-discovery__actions">
            <button class="odc-product-discovery__link" type="button">Voir la fiche</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function getProductPrimaryImage(product) {
  return product?.mainImage?.assetUrl || product?.images?.[0]?.assetUrl || "";
}

function getProductHoverImage(product) {
  return product?.images?.[1]?.assetUrl || getProductPrimaryImage(product);
}

function renderCustomProductGrid(state) {
  const layout = state.root.querySelector(".product-list-layout-container");

  if (!layout) {
    return null;
  }

  layout.innerHTML = `
    <div class="odc-product-grid">
      ${state.items
        .map((product, index) => {
          const primary = getProductPrimaryImage(product);
          const hover = getProductHoverImage(product);
          return `
            <article class="odc-product-card ${product.onSale ? "is-on-sale" : ""}" data-product-index="${index}">
              <button class="odc-product-card__quick-view" type="button" data-product-index="${index}">
                Quick View
              </button>
              <button class="odc-product-card__open" type="button" aria-label="Voir ${product.title}" data-product-index="${index}">
                <div class="odc-product-card__media">
                  <img class="odc-product-card__image odc-product-card__image--primary" src="${primary}" alt="${product.title}" loading="lazy" decoding="async" />
                  <img class="odc-product-card__image odc-product-card__image--hover" src="${hover}" alt="" loading="lazy" decoding="async" />
                </div>
                <div class="odc-product-card__meta">
                  <div class="odc-product-card__title">${product.title}</div>
                  <div class="odc-product-card__status">${product.onSale ? "Sale" : ""}</div>
                </div>
              </button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  return layout;
}

function getProductCardImage(trigger) {
  const card = trigger?.closest(".odc-product-card, .product-list-item");

  if (!card) {
    return null;
  }

  return (
    card.querySelector(".odc-product-card__image--primary") ||
    card.querySelector(".grid-image-cover") ||
    card.querySelector(".product-list-item-image img") ||
    null
  );
}

function sanitizeProductDescription(description) {
  const normalized = description ? decodeHtmlEntities(description).trim() : "";

  return normalized
    ? normalized
    : "<p>Découvrez les textures, teintes et finitions de cette référence dans sa fiche complète.</p>";
}

function renderProductDiscoveryImage(state, overlay, product) {
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : product.mainImage
      ? [product.mainImage]
      : [];
  const imageIndex = Math.max(0, Math.min(state.currentImageIndex, images.length - 1));
  state.currentImageIndex = imageIndex;

  const stageImage = overlay.querySelector(".odc-product-discovery__image");
  const thumbs = overlay.querySelector(".odc-product-discovery__thumbs");
  const current = images[imageIndex];

  if (stageImage && current) {
    stageImage.src = current.assetUrl;
    stageImage.alt = product.title;
  }

  if (thumbs) {
    thumbs.innerHTML = images
      .map(
        (image, index) => `
          <button
            class="odc-product-discovery__thumb ${index === imageIndex ? "is-active" : ""}"
            type="button"
            aria-label="Voir l'image ${index + 1}"
            data-odc-thumb-index="${index}"
          >
            <img src="${image.assetUrl}" alt="" loading="lazy" decoding="async" />
          </button>
        `
      )
      .join("");
  }

  overlay
    .querySelectorAll("[data-odc-image-nav]")
    .forEach((button) => {
      button.disabled = images.length <= 1;
    });
}

function renderProductDiscovery(state, overlay) {
  const product = state.items[state.currentIndex];

  if (!product) {
    return;
  }

  const title = overlay.querySelector(".odc-product-discovery__title");
  const price = overlay.querySelector(".odc-product-discovery__price");
  const description = overlay.querySelector(".odc-product-discovery__description");
  const details = overlay.querySelector(".odc-product-discovery__details");
  const link = overlay.querySelector(".odc-product-discovery__link");
  const eyebrow = overlay.querySelector(".odc-product-discovery__eyebrow");

  if (title) {
    title.textContent = product.title || "";
  }

  if (price) {
    const saleMarkup = product.salePrice
      ? `<strong>${formatMoney(product.salePrice)}</strong><span>${formatMoney(product.price)}</span>`
      : `<strong>${formatMoney(product.price)}</strong>`;
    price.innerHTML = saleMarkup;
  }

  if (description) {
    description.innerHTML = sanitizeProductDescription(product.description || "");
  }

  if (link) {
    const resolvedUrl = product.fullUrl
      ? new URL(product.fullUrl, window.location.origin).toString()
      : "#";
    link.dataset.odcTargetHref = resolvedUrl;
  }

  if (eyebrow) {
    eyebrow.textContent = product.onSale ? "Produit en promotion" : "Collection";
  }

  if (details) {
    const summary = [];

    if (product.images?.length) {
      summary.push(`${product.images.length} vues`);
    }

    if (product.variants?.length) {
      summary.push(`${product.variants.length} variation${product.variants.length > 1 ? "s" : ""}`);
    }

    summary.push(product.onSale ? "Disponible en promotion" : "Disponible");

    details.innerHTML = summary.map((item) => `<span>${item}</span>`).join("");
  }

  renderProductDiscoveryImage(state, overlay, product);

  overlay
    .querySelectorAll("[data-odc-product-nav]")
    .forEach((button) => {
      button.disabled = state.items.length <= 1;
    });
}

function animateDiscoveryOpen(state, overlay) {
  const stageImage = overlay.querySelector(".odc-product-discovery__image");
  const originImage = getProductCardImage(state.activeTrigger);

  if (!stageImage || !originImage) {
    overlay.classList.add("is-visible");
    return;
  }

  const originRect = originImage.getBoundingClientRect();
  const targetRect = stageImage.getBoundingClientRect();

  if (!originRect.width || !targetRect.width) {
    overlay.classList.add("is-visible");
    return;
  }

  state.isAnimating = true;
  overlay.classList.add("is-visible", "is-animating");
  stageImage.style.opacity = "0";

  const clone = originImage.cloneNode(true);
  clone.className = "odc-product-discovery__ghost";
  clone.style.top = `${originRect.top}px`;
  clone.style.left = `${originRect.left}px`;
  clone.style.width = `${originRect.width}px`;
  clone.style.height = `${originRect.height}px`;
  document.body.appendChild(clone);

  requestAnimationFrame(() => {
    clone.style.top = `${targetRect.top}px`;
    clone.style.left = `${targetRect.left}px`;
    clone.style.width = `${targetRect.width}px`;
    clone.style.height = `${targetRect.height}px`;
  });

  window.setTimeout(() => {
    clone.remove();
    stageImage.style.opacity = "";
    overlay.classList.remove("is-animating");
    state.isAnimating = false;
  }, 420);
}

function closeProductDiscovery(state, overlay) {
  if (!overlay.classList.contains("is-open")) {
    return;
  }

  overlay.classList.remove("is-open", "is-visible", "is-animating");
  overlay.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("odc-product-discovery-open");
  document.body.classList.remove("odc-product-discovery-open");
  state.currentIndex = -1;
  state.currentImageIndex = 0;
  state.activeTrigger = null;
  state.isAnimating = false;
}

function openProductDiscovery(state, overlay, index, trigger) {
  if (index < 0 || index >= state.items.length) {
    return;
  }

  state.currentIndex = index;
  state.currentImageIndex = 0;
  state.activeTrigger = trigger || null;

  renderProductDiscovery(state, overlay);
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
  document.documentElement.classList.add("odc-product-discovery-open");
  document.body.classList.add("odc-product-discovery-open");

  requestAnimationFrame(() => {
    animateDiscoveryOpen(state, overlay);
  });
}

async function enableProductDiscoveryOverlay() {
  if (!isCommercePath() || window.location.pathname.includes("/produits/p/")) {
    return;
  }

  const state = await getProductDiscoveryState();

  if (!state || state.root.dataset.odcProductDiscoveryReady === "true") {
    return;
  }

  state.root.dataset.odcProductDiscoveryReady = "true";
  const overlay = buildProductDiscoveryOverlay();
  renderCustomProductGrid(state);
  const cardButtons = Array.from(document.querySelectorAll(".odc-product-card__open"));
  const quickViewButtons = Array.from(document.querySelectorAll(".odc-product-card__quick-view"));

  const openFromElement = (element) => {
    const card = element?.closest(".odc-product-card, .product-list-item");
    const indexValue =
      element?.getAttribute("data-product-index") ||
      card?.getAttribute("data-product-index");
    const index = Number.parseInt(indexValue || "", 10);

    if (!Number.isInteger(index) || index < 0 || index >= state.items.length) {
      return;
    }

    openProductDiscovery(state, overlay, index, element);
  };

  cardButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openFromElement(button);
    });
  });

  quickViewButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      openFromElement(button);
    }, true);
  });

  overlay.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) {
      return;
    }

    if (target.closest(".odc-product-discovery__backdrop")) {
      event.preventDefault();
      closeProductDiscovery(state, overlay);
      return;
    }

    if (!target.closest(".odc-product-discovery__link")) {
      event.stopPropagation();
    }
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) {
      return;
    }

    const closeButton = target.closest("[data-odc-close]");
    if (closeButton) {
      event.preventDefault();
      closeProductDiscovery(state, overlay);
      return;
    }

    const overlayLink = target.closest(".odc-product-discovery__link");
    if (overlayLink) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const href = overlayLink.getAttribute("data-odc-target-href");
      if (href) {
        window.location.assign(href);
      }
      return;
    }

    const thumb = target.closest("[data-odc-thumb-index]");
    if (thumb && overlay.classList.contains("is-open")) {
      const index = Number(thumb.getAttribute("data-odc-thumb-index"));
      if (Number.isInteger(index)) {
        state.currentImageIndex = index;
        renderProductDiscoveryImage(state, overlay, state.items[state.currentIndex]);
      }
      return;
    }

    const imageNav = target.closest("[data-odc-image-nav]");
    if (imageNav && overlay.classList.contains("is-open")) {
      const product = state.items[state.currentIndex];
      const total = product?.images?.length || 0;
      if (total > 1) {
        const direction = imageNav.getAttribute("data-odc-image-nav") === "next" ? 1 : -1;
        state.currentImageIndex = (state.currentImageIndex + direction + total) % total;
        renderProductDiscoveryImage(state, overlay, product);
      }
      return;
    }

    const productNav = target.closest("[data-odc-product-nav]");
    if (productNav && overlay.classList.contains("is-open")) {
      const direction = productNav.getAttribute("data-odc-product-nav") === "next" ? 1 : -1;
      const nextIndex = (state.currentIndex + direction + state.items.length) % state.items.length;
      state.currentImageIndex = 0;
      state.currentIndex = nextIndex;
      renderProductDiscovery(state, overlay);
      return;
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      closeProductDiscovery(state, overlay);
    }

    if (event.key === "ArrowRight") {
      const product = state.items[state.currentIndex];
      const total = product?.images?.length || 0;
      if (total > 1) {
        state.currentImageIndex = (state.currentImageIndex + 1) % total;
        renderProductDiscoveryImage(state, overlay, product);
      }
    }

    if (event.key === "ArrowLeft") {
      const product = state.items[state.currentIndex];
      const total = product?.images?.length || 0;
      if (total > 1) {
        state.currentImageIndex = (state.currentImageIndex - 1 + total) % total;
        renderProductDiscoveryImage(state, overlay, product);
      }
    }
  });
}

if (document.readyState === "complete") {
  replaceHomeMarqueeWithLogos();
  replaceMarquesGridWithLogos();
  normalizeProductCategoryLinks();
  enableCommerceSessionBridge();
  enableProductDiscoveryOverlay();
} else {
  window.addEventListener(
    "load",
    () => {
      replaceHomeMarqueeWithLogos();
      replaceMarquesGridWithLogos();
      normalizeProductCategoryLinks();
      enableCommerceSessionBridge();
      enableProductDiscoveryOverlay();
    },
    { once: true }
  );
}
