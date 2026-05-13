import {
  getProductCatalogItemById,
  getProductCatalogItemForPath,
  getProductCatalogItemsForPath,
  getProductColorwayById,
  productCatalogItems,
  productCollections
} from "./product-catalog-data.js";
import {
  CART_CHANGE_EVENT,
  addCartLine,
  clearCart,
  getCartCount,
  getCartLines,
  removeCartLine,
  updateCartLineQuantity
} from "./cart-store.js";
import {
  FAVORITES_CHANGE_EVENT,
  getFavoriteProductIds,
  hasFavoriteProduct,
  toggleFavoriteProduct
} from "./favorites-store.js";
import {
  buildProductSelectionKey,
  parseProductSelectionKey
} from "./product-selection.js";
import { loadSiteContent } from "./site-content.js";
import { apiFetch } from "./api-client.js";
import {
  PROFESSIONAL_AUTH_EVENT,
  ensureProfessionalSession,
  fetchProfessionalSession,
  getProfessionalState,
  loginProfessionalAccount,
  logoutProfessionalAccount,
  registerProfessionalAccount
} from "./professional-auth.js";
import { PROFESSIONAL_PROFESSIONS } from "./professional-config.js";

const PROFESSIONAL_MODAL_REQUEST_EVENT = "odc:professional-modal-request";
let pendingFavoriteSelectionKey = "";
let pendingFavoriteRedirectHref = "";
let pendingAuthReload = false;

const navItems = [
  { href: "/produits", label: "Produits", matches: ["/produits", "/produits/","/produits.html"] },
  { href: "/marques", label: "Marques", matches: ["/marques", "/marques/","/marques.html"] },
  { href: "/contract/", label: "Contract", matches: ["/contract", "/contract/","/contract.html", "/contract/projets", "/contract/projets/", "/contract/a-propos", "/contract/a-propos/", "/contract/clients", "/contract/clients/"] },
  { href: "/histoire.html", label: "Histoire", matches: ["/histoire", "/histoire/","/histoire.html"] },
  { href: "/showrooms.html", label: "Showrooms", matches: ["/showrooms", "/showrooms/","/showroons","/showroons/","/showrooms.html"] }
];

const contractAreaNavItems = [
  { href: "/contract/", label: "À propos", matches: ["/contract", "/contract/", "/contract.html", "/contract/a-propos", "/contract/a-propos/"] },
  { href: "/contract/projets/", label: "Projets", matches: ["/contract/projets", "/contract/projets/"] },
  { href: "/contract/clients/", label: "Clients", matches: ["/contract/clients", "/contract/clients/"] }
];

const logo =
  "/custom-assets/logo-odv-black.png";
const contractAreaLogo = "/custom-assets/odyssee-contract-black.png";
const footerLogo = "/custom-assets/logo-odc-white.png";
const homeVideo = "/custom-assets/odyssee-video-global-web.mp4";
const homeCard = "/custom-assets/carte-odc.png";
const showroomsFacade = "/custom-assets/showrooms-chatgpt-06042026-010433.png";
const showroomAccordionItems = [
  {
    city: "Casablanca",
    address: "1, Avenue Dr Mohamed Sijelmassi (ex Avenue du Phare)",
    phoneLabel: "+212 5223-69923",
    phoneHref: "tel:+212522369923",
    email: "contact@odyssee.ma",
    mapHref: "https://maps.google.com/?q=33.592222,-7.641667",
    mapEmbed: "https://www.google.com/maps?q=33.592222,-7.641667&z=17&output=embed",
    wazeHref: "https://waze.com/ul?ll=33.592222,-7.641667&navigate=yes",
    appleHref: "https://maps.apple.com/?ll=33.592222,-7.641667&q=1%20Avenue%20du%20Phare%20R%C3%A9sidence%20Isma%C3%AFlia%20Casablanca%20Morocco"
  },
  {
    city: "Rabat",
    address: "10, Avenue du 16 Novembre - Quartier Agdal",
    phoneLabel: "+212 5223-69923",
    phoneHref: "tel:+212522369923",
    email: "contact@odyssee.ma",
    mapHref: "https://maps.google.com/?q=33.9913771,-6.8488065",
    mapEmbed: "https://www.google.com/maps?q=33.9913771,-6.8488065&z=17&output=embed",
    wazeHref: "https://waze.com/ul?ll=33.9913771,-6.8488065&navigate=yes",
    appleHref: "https://maps.apple.com/?ll=33.9913771,-6.8488065&q=10%20Avenue%20du%2016%20Novembre%20Agdal%20Rabat%20Morocco"
  },
  {
    city: "Tanger",
    address: "5-6 angle Rue Ibnou Zaidoune et rue Kortoba",
    phoneLabel: "+212 5223-69923",
    phoneHref: "tel:+212522369923",
    email: "contact@odyssee.ma",
    mapHref: "https://maps.google.com/?q=35.7833128,-5.8235286",
    mapEmbed: "https://www.google.com/maps?q=35.7833128,-5.8235286&z=17&output=embed",
    wazeHref: "https://waze.com/ul?ll=35.7833128,-5.8235286&navigate=yes",
    appleHref: "https://maps.apple.com/?ll=35.7833128,-5.8235286&q=5-6%20angle%20Rue%20Ibnou%20Zaidoune%20et%20rue%20Kortoba%20Tanger%20Morocco"
  }
];

const partnerLogos = [
  {
    alt: "Clarke & Clarke",
    href: "https://www.clarkeandclarke.design/",
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
    href: "https://www.zoffany.design/",
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
    href: "https://www.wmorrisandco.com/",
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
    href: "https://www.harlequin.design/",
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
    href: "https://www.prestigious.co.uk/",
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
    href: "https://www.yorkwallcoverings.com/",
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
    href: "https://www.alessandrobini.com/en/",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-48718919-f382-4a0e-9407-3bee26450840-alessandrobini-1.png",
    width: "96px",
    height: "24px",
    basis: "140px",
    scale: "1.58",
    gridWidth: "268px",
    gridHeight: "92px"
  },
  {
    alt: "Aldeco",
    href: "https://aldeco.pt/",
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
    href: "https://pedrosoeosorio.pt/en/pedroso-osorio/",
    src: "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-0c8a5054-359f-484f-a42e-dcf45ce7c9c2-screenshot_2025-03-13_at_18.31.50-removebg-preview.png",
    width: "108px",
    height: "22px",
    basis: "118px",
    scale: "1.6",
    gridWidth: "162px",
    gridHeight: "52px"
  }
];

const siteContent = loadSiteContent();

primeHeaderLogo();

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

function primeHeaderLogo() {
  const head = document.head;
  if (!head) {
    return;
  }

  const headerLogoHref = isContractAreaPath() ? contractAreaLogo : logo;
  if (!headerLogoHref || head.querySelector(`link[data-odc-header-logo="${headerLogoHref}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = headerLogoHref;
  link.setAttribute("data-odc-header-logo", headerLogoHref);
  head.append(link);
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

function isContractAreaPath(pathname = window.location.pathname) {
  return pathname === "/contract" ||
    pathname === "/contract/" ||
    pathname === "/contract.html" ||
    pathname.startsWith("/contract/projets") ||
    pathname.startsWith("/contract/a-propos") ||
    pathname.startsWith("/contract/clients");
}

function contractAreaNavMarkup() {
  const current = window.location.pathname;
  return contractAreaNavItems
    .map((item) => {
      const active = item.matches.includes(current) ? "is-active" : "";
      return `<a class="${active}" href="${item.href}">${item.label}</a>`;
    })
    .join("");
}

function contractAreaActionsMarkup() {
  return `
    <div class="odc-home-header__actions odc-contract-space-actions">
      <button class="odc-home-cta odc-contract-space-cta" type="button" data-contract-contact-open>Prendre contact</button>
      <a class="odc-contract-space-return" href="/">Retour</a>
    </div>
  `;
}

function favoriteNavIconMarkup() {
  return `
    <span class="odc-home-favorite-link__icon" aria-hidden="true">
      ${favoriteIconMarkup(false)}
    </span>
    <span class="odc-home-favorite-link__count" data-odc-favorite-count>0</span>
  `;
}

async function requestProfessionalFavoriteAccess(selectionKey = "", redirectHref = "") {
  const professionalState = await ensureProfessionalSession().catch(() => getProfessionalState());

  if (professionalState.authenticated) {
    return true;
  }

  pendingFavoriteSelectionKey = selectionKey || "";
  pendingFavoriteRedirectHref = redirectHref || "";
  pendingAuthReload = false;
  document.dispatchEvent(
    new CustomEvent(PROFESSIONAL_MODAL_REQUEST_EVENT, {
      detail: { favoriteContext: true, redirectAfterLogin: false }
    })
  );
  return false;
}

async function requestProfessionalProductAccess(redirectHref = "", reloadAfterLogin = false) {
  const professionalState = await ensureProfessionalSession().catch(() => getProfessionalState());

  if (professionalState.authenticated) {
    return true;
  }

  pendingFavoriteSelectionKey = "";
  pendingFavoriteRedirectHref = redirectHref || "";
  pendingAuthReload = reloadAfterLogin === true;
  document.dispatchEvent(
    new CustomEvent(PROFESSIONAL_MODAL_REQUEST_EVENT, {
      detail: { productContext: true, redirectAfterLogin: false }
    })
  );
  return false;
}

async function resolvePendingProfessionalIntent() {
  const selectionKey = pendingFavoriteSelectionKey;
  const redirectHref = pendingFavoriteRedirectHref;
  const shouldReload = pendingAuthReload;

  pendingFavoriteSelectionKey = "";
  pendingFavoriteRedirectHref = "";
  pendingAuthReload = false;

  if (selectionKey && !hasFavoriteProduct(selectionKey)) {
    await toggleFavoriteProduct(selectionKey);
  }

  if (shouldReload) {
    window.location.reload();
    return true;
  }

  if (redirectHref) {
    window.location.assign(redirectHref);
    return true;
  }

  return false;
}

function clearPendingFavoriteIntent() {
  pendingFavoriteSelectionKey = "";
  pendingFavoriteRedirectHref = "";
  pendingAuthReload = false;
}

function professionalIconMarkup() {
  return `
    <span class="odc-home-user-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5.5 18.25a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </span>
  `;
}

function eyeIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/>
    </svg>
  `;
}

function favoriteIconMarkup(active = false) {
  return `
    <span class="odc-product-favorite__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M12 20.4 4.85 13.6a4.7 4.7 0 0 1 6.64-6.66L12 7.46l.51-.52a4.7 4.7 0 1 1 6.64 6.66L12 20.4Z"
          fill="${active ? "currentColor" : "none"}"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  `;
}

const root = document.querySelector("#odc-home-header-root");

if (root) {
  if (isContractAreaPath()) {
    root.innerHTML = `
      <header class="odc-home-header odc-contract-space-header">
        <div class="odc-home-header__inner odc-contract-space-header__inner">
          <a class="odc-home-brand odc-contract-space-brand" href="/contract/">
            <img src="${contractAreaLogo}" alt="Odyssee Contract" width="640" height="426" decoding="async" fetchpriority="high" />
          </a>
          <button class="odc-home-toggle" type="button" aria-expanded="false" aria-controls="odc-home-mobile-nav" aria-label="Ouvrir le menu">
            <span class="odc-home-toggle__label">Menu</span>
            <span class="odc-home-toggle__icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <nav class="odc-home-nav odc-contract-space-nav" aria-label="Navigation Contract">
            ${contractAreaNavMarkup()}
          </nav>
          ${contractAreaActionsMarkup()}
        </div>
        <div id="odc-home-mobile-nav" class="odc-home-mobile odc-contract-space-mobile">
          <nav aria-label="Navigation Contract mobile">
            <div class="odc-contract-space-mobile-layout">
              <div class="odc-contract-space-mobile-main">
                <div class="odc-contract-space-mobile-links">
                  ${contractAreaNavMarkup()}
                </div>
                <div class="odc-contract-space-mobile-actions">
                  <button class="odc-home-mobile-cta odc-contract-space-mobile-cta" type="button" data-contract-contact-open>Prendre contact</button>
                  <a class="odc-contract-space-mobile-return" href="/">Retour</a>
                </div>
              </div>
              <a class="odc-contract-space-mobile-brand" href="/contract/" aria-label="Accueil Odyssée Contract">
                <img src="${contractAreaLogo}" alt="Odyssee Contract" width="640" height="426" decoding="async" />
              </a>
            </div>
          </nav>
        </div>
      </header>
    `;
  } else {
    root.innerHTML = `
      <header class="odc-home-header">
        <div class="odc-home-header__inner">
          <a class="odc-home-brand" href="/">
            <img src="${logo}" alt="Logo Odyssée" width="640" height="426" decoding="async" fetchpriority="high" />
          </a>
          <a class="odc-home-favorite-link odc-home-favorite-link--mobile" href="/favoris.html" aria-label="Favoris" data-odc-favorite-nav>
            ${favoriteNavIconMarkup()}
          </a>
          <button class="odc-home-pro odc-home-pro--mobile" type="button" data-professional-open aria-label="Professionnel">
            ${professionalIconMarkup()}
          </button>
          <button class="odc-home-toggle" type="button" aria-expanded="false" aria-controls="odc-home-mobile-nav" aria-label="Ouvrir le menu">
            <span class="odc-home-toggle__label">Menu</span>
            <span class="odc-home-toggle__icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <nav class="odc-home-nav" aria-label="Navigation principale">
            ${navMarkup()}
          </nav>
          <div class="odc-home-header__actions">
            <a class="odc-home-favorite-link" href="/favoris.html" aria-label="Favoris" data-odc-favorite-nav>
              ${favoriteNavIconMarkup()}
            </a>
            <button class="odc-home-pro" type="button" data-professional-open aria-label="Professionnel">
              ${professionalIconMarkup()}
            </button>
            <button class="odc-home-cta" type="button" data-contract-contact-open>Prendre contact</button>
          </div>
        </div>
        <div id="odc-home-mobile-nav" class="odc-home-mobile">
          <nav aria-label="Navigation mobile">
            <div class="odc-home-mobile-layout">
              <div class="odc-home-mobile-main">
                <div class="odc-home-mobile-links">
                  ${navMarkup()}
                </div>
                <div class="odc-home-mobile-actions-group">
                  <button class="odc-home-mobile-cta" type="button" data-contract-contact-open>Prendre contact</button>
                </div>
              </div>
              <a class="odc-home-mobile-brand" href="/" aria-label="Accueil Odyssée">
                <img src="${logo}" alt="Logo Odyssée" width="640" height="426" decoding="async" />
              </a>
            </div>
          </nav>
        </div>
      </header>
    `;
  }

  const toggle = root.querySelector(".odc-home-toggle");
  const mobile = root.querySelector(".odc-home-mobile");
  const setMobileMenuOpen = (open) => {
    toggle?.setAttribute("aria-expanded", String(open));
    mobile?.classList.toggle("is-open", open);
  };

  toggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    setMobileMenuOpen(!expanded);
  });

  root.querySelectorAll("[data-odc-favorite-nav]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      if (getProfessionalState().authenticated) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (await requestProfessionalFavoriteAccess("", link.getAttribute("href") || "/favoris.html")) {
        window.location.assign(link.getAttribute("href") || "/favoris.html");
      }
      setMobileMenuOpen(false);
    });
  });

  mobile?.addEventListener("click", (event) => {
    const nav = mobile.querySelector("nav");
    if (nav && event.target instanceof Node && !nav.contains(event.target)) {
      setMobileMenuOpen(false);
      return;
    }

    event.stopPropagation();
    const actionTarget = event.target.closest("a, button");
    if (actionTarget && !actionTarget.closest(".odc-home-toggle")) {
      setMobileMenuOpen(false);
    }
  });

  document.addEventListener("click", async (event) => {
    if (!mobile?.classList.contains("is-open")) {
      return;
    }
    if (event.target instanceof Node && !root.contains(event.target)) {
      setMobileMenuOpen(false);
    }
  });

  bindProductsNavWarmup();
}

function ensureSharedContactModal() {
  if (document.querySelector(".odc-contract-modal")) {
    return;
  }

  const modal = document.createElement("div");
  modal.className = "odc-contract-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="odc-contract-modal__backdrop" data-contract-contact-close></div>
    <div class="odc-contract-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="odc-contract-modal-title">
      <button class="odc-contract-modal__close" type="button" aria-label="Fermer" data-contract-contact-close></button>
      <div class="odc-contract-modal__grid">
        <div class="odc-contract-modal__copy">
          <p class="odc-contract-kicker">Nous contacter</p>
          <h2 id="odc-contract-modal-title" class="odc-contract-section__title">Parlons de votre projet.</h2>
          <p class="odc-contract-modal__lede">Échangez avec notre équipe pour une visite showroom, un projet résidentiel ou une demande professionnelle.</p>
          <form id="odc-contract-contact-form" class="odc-contract-form">
            <label>
              Nom
              <input type="text" name="name" placeholder="Votre nom" required />
            </label>
            <label>
              Email
              <input type="email" name="email" placeholder="vous@exemple.com" required />
            </label>
            <label>
              Téléphone
              <input type="tel" name="phone" placeholder="+212 5223-69923" />
            </label>
            <label>
              Sujet
              <select name="subject">
                <option value="showroom">Visite showroom</option>
                <option value="residential">Projet résidentiel</option>
                <option value="professional">Projet professionel</option>
              </select>
            </label>
            <label class="odc-contract-form__conditional" data-contract-sector-field hidden>
              Secteur
              <select name="sector" data-contract-sector-select>
                <option value="">Sélectionner un secteur</option>
                <option value="hotellerie">Hôtellerie</option>
                <option value="restauration">Restauration</option>
                <option value="bureaux">Bureaux</option>
                <option value="medical">Médical</option>
                <option value="architecture">Architecture</option>
                <option value="immobilier">Immobilier</option>
                <option value="autre">Autre</option>
              </select>
            </label>
            <label>
              Message
              <textarea name="message" rows="5" placeholder="Décrivez votre besoin" required></textarea>
            </label>
            <button class="odc-contract-form__submit" type="submit">Envoyer</button>
            <p id="odc-contract-contact-feedback" class="odc-contract-form__feedback" aria-live="polite"></p>
          </form>
        </div>
        <aside class="odc-contract-modal__info">
          <h3>Coordonnées</h3>
          <ul class="odc-contract-modal__list">
            <li><strong>Email</strong><span>contact@odyssee.ma</span></li>
            <li><strong>Téléphone</strong><span>+212 5223-69923</span></li>
            <li><strong>Casablanca</strong><span>1, Avenue Dr Mohamed Sijelmassi</span></li>
            <li><strong>Rabat</strong><span>10, Avenue du 16 Novembre - Quartier Agdal</span></li>
            <li><strong>Tanger</strong><span>5-6 angle Rue Ibnou Zaidoune et rue Kortoba - Res. Dar Baida IV</span></li>
          </ul>
          <div class="odc-contract-modal__logo">
            <img src="${logo}" alt="Logo Odyssée" />
          </div>
        </aside>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function ensureProfessionalModal() {
  if (document.querySelector(".odc-professional-modal")) {
    return;
  }

  const modal = document.createElement("div");
  modal.className = "odc-professional-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="odc-professional-modal__backdrop" data-professional-close></div>
    <div class="odc-professional-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="odc-professional-title">
      <button class="odc-professional-modal__close" type="button" aria-label="Fermer" data-professional-close></button>
      <div class="odc-professional-modal__header">
        <p class="odc-professional-modal__eyebrow">Accès professionnel</p>
        <h2 id="odc-professional-title" class="odc-professional-modal__title">Connexion et création de compte</h2>
        <p class="odc-professional-modal__context" data-professional-context hidden>
        </p>
      </div>
      <div class="odc-professional-modal__tabs" role="tablist" aria-label="Accès professionnel">
        <button class="is-active" type="button" role="tab" aria-selected="true" data-professional-tab="login">Se connecter</button>
        <button type="button" role="tab" aria-selected="false" data-professional-tab="register">Créer un compte</button>
      </div>
      <div class="odc-professional-modal__panels">
        <section class="odc-professional-panel is-active" data-professional-panel="login">
          <form class="odc-professional-form" data-professional-login-form>
            <label>Email
              <input type="email" name="email" placeholder="vous@entreprise.com" required />
            </label>
            <label>Mot de passe
              <input type="password" name="password" placeholder="Votre mot de passe" required />
            </label>
            <button class="odc-professional-form__submit" type="submit">Se connecter</button>
            <p class="odc-professional-form__feedback" data-professional-login-feedback aria-live="polite"></p>
          </form>
        </section>
        <section class="odc-professional-panel" data-professional-panel="register" hidden>
          <form class="odc-professional-form" data-professional-register-form>
            <div class="odc-professional-form__grid">
              <label>Nom
                <input type="text" name="lastName" required />
              </label>
              <label>Prénom
                <input type="text" name="firstName" required />
              </label>
            </div>
            <label>Numéro de téléphone
              <input type="tel" name="phone" required />
            </label>
            <label>Email
              <input type="email" name="email" required />
            </label>
            <label>Profession
              <select name="profession" required>
                <option value="">Sélectionner</option>
                ${PROFESSIONAL_PROFESSIONS.map((item) => `<option value="${item}">${item}</option>`).join("")}
              </select>
            </label>
            <label>Mot de passe
              <span class="odc-professional-form__password-field">
                <input type="password" name="password" required />
                <button type="button" class="odc-professional-form__password-toggle" data-password-toggle aria-label="Afficher le mot de passe">
                  <span aria-hidden="true">${eyeIconMarkup()}</span>
                </button>
              </span>
            </label>
            <label>Confirmer le mot de passe
              <span class="odc-professional-form__password-field">
                <input type="password" name="passwordConfirm" required />
                <button type="button" class="odc-professional-form__password-toggle" data-password-toggle aria-label="Afficher le mot de passe">
                  <span aria-hidden="true">${eyeIconMarkup()}</span>
                </button>
              </span>
            </label>
            <button class="odc-professional-form__submit" type="submit">Créer un compte</button>
            <p class="odc-professional-form__feedback" data-professional-register-feedback aria-live="polite"></p>
          </form>
        </section>
        <section class="odc-professional-panel" data-professional-panel="account" hidden>
          <div class="odc-professional-account">
            <p class="odc-professional-account__status">Mode professionnel actif</p>
            <h3 data-professional-account-name></h3>
            <p data-professional-account-meta></p>
            <button class="odc-professional-form__submit odc-professional-form__submit--secondary" type="button" data-professional-logout>Se déconnecter</button>
          </div>
        </section>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function syncProfessionalModeUi() {
  const state = getProfessionalState();
  document.body.classList.toggle("odc-professional-mode", state.authenticated);
  document.body.classList.toggle("odc-public-mode", !state.authenticated);

  document.querySelectorAll("[data-professional-open]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const label = state.authenticated ? "Espace pro" : "Professionnel";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  updateCartIndicators();
}

function enableProfessionalAuth() {
  ensureProfessionalModal();

  const modal = document.querySelector(".odc-professional-modal");
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const loginForm = modal.querySelector("[data-professional-login-form]");
  const registerForm = modal.querySelector("[data-professional-register-form]");
  const loginFeedback = modal.querySelector("[data-professional-login-feedback]");
  const registerFeedback = modal.querySelector("[data-professional-register-feedback]");
  const accountName = modal.querySelector("[data-professional-account-name]");
  const accountMeta = modal.querySelector("[data-professional-account-meta]");
  const logoutButton = modal.querySelector("[data-professional-logout]");
  const title = modal.querySelector("#odc-professional-title");
  const contextMessage = modal.querySelector("[data-professional-context]");
  const tabs = modal.querySelector(".odc-professional-modal__tabs");
  const dialog = modal.querySelector(".odc-professional-modal__dialog");

  const setFeedback = (node, message, isError = false) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    node.textContent = message;
    node.classList.toggle("is-error", isError);
    node.classList.toggle("is-success", !isError && Boolean(message));
  };

  const syncPublicTitle = (name) => {
    if (!(title instanceof HTMLElement)) {
      return;
    }

    if (name === "register") {
      title.textContent = "Créer un compte";
      return;
    }

    if (name === "login") {
      title.textContent = "Se connecter";
    }
  };

  const activatePanel = (name) => {
    modal.querySelectorAll("[data-professional-tab]").forEach((button) => {
      const isActive = button.getAttribute("data-professional-tab") === name;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    modal.querySelectorAll("[data-professional-panel]").forEach((panel) => {
      const isActive = panel.getAttribute("data-professional-panel") === name;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    syncPublicTitle(name);
  };

  const renderPanels = () => {
    const state = getProfessionalState();
    if (state.authenticated) {
      activatePanel("account");
      if (title instanceof HTMLElement) {
        title.textContent = "Espace professionnel";
      }
      if (tabs instanceof HTMLElement) {
        tabs.hidden = true;
      }
      if (accountName instanceof HTMLElement) {
        accountName.textContent = `${state.user?.firstName || ""} ${state.user?.lastName || ""}`.trim();
      }
      if (accountMeta instanceof HTMLElement) {
        accountMeta.textContent = `${state.user?.email || ""} · ${state.user?.profession || ""}`;
      }
      return;
    }

    if (tabs instanceof HTMLElement) {
      tabs.hidden = false;
    }
    activatePanel("login");
  };

  const openModal = (options = {}) => {
    const modalOptions = options && !(options instanceof Event) ? options : {};
    modal.dataset.odcProfessionalRedirectAfterLogin = modalOptions.redirectAfterLogin === false ? "false" : "true";
    if (contextMessage instanceof HTMLElement) {
      const message = modalOptions.productContext
        ? "Connectez-vous pour consulter les fiches produits, accéder aux coloris et enregistrer vos sélections favorites."
        : modalOptions.favoriteContext
          ? "Connectez-vous pour enregistrer vos produits favoris et recevoir nos actualités."
          : "";
      contextMessage.textContent = message;
      contextMessage.hidden = !message;
    }
    renderPanels();
    modal.hidden = false;
    document.body.classList.add("odc-professional-modal-open");
  };

  const closeModal = (options = {}) => {
    if (options.clearPendingFavorite) {
      clearPendingFavoriteIntent();
    }
    modal.hidden = true;
    document.body.classList.remove("odc-professional-modal-open");
  };

  document.querySelectorAll("[data-professional-open]").forEach((button) => {
    if (button.dataset.odcProfessionalOpenReady === "true") {
      return;
    }
    button.dataset.odcProfessionalOpenReady = "true";
    button.addEventListener("click", () => openModal());
  });

  if (modal.dataset.odcProfessionalRequestReady !== "true") {
    modal.dataset.odcProfessionalRequestReady = "true";
    document.addEventListener(PROFESSIONAL_MODAL_REQUEST_EVENT, (event) => {
      openModal(event.detail || {});
    });
  }

  if (dialog instanceof HTMLElement && dialog.dataset.odcProfessionalDialogReady !== "true") {
    dialog.dataset.odcProfessionalDialogReady = "true";
    dialog.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  modal.querySelectorAll("[data-professional-close]").forEach((node) => {
    if (!(node instanceof HTMLElement) || node.dataset.odcProfessionalCloseReady === "true") {
      return;
    }
    node.dataset.odcProfessionalCloseReady = "true";
    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeModal({ clearPendingFavorite: true });
    });
  });

  if (modal.dataset.odcProfessionalBackdropReady !== "true") {
    modal.dataset.odcProfessionalBackdropReady = "true";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
          closeModal({ clearPendingFavorite: true });
      }
    });
  }

  modal.querySelectorAll("[data-professional-tab]").forEach((button) => {
    if (button.dataset.odcProfessionalTabReady === "true") {
      return;
    }
    button.dataset.odcProfessionalTabReady = "true";
    button.addEventListener("click", () => activatePanel(button.getAttribute("data-professional-tab")));
  });

  modal.querySelectorAll("[data-password-toggle]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement) || button.dataset.odcPasswordToggleReady === "true") {
      return;
    }

    button.dataset.odcPasswordToggleReady = "true";
    button.addEventListener("click", () => {
      const field = button.closest(".odc-professional-form__password-field");
      const input = field?.querySelector("input");
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const isVisible = input.type === "text";
      input.type = isVisible ? "password" : "text";
      button.classList.toggle("is-active", !isVisible);
      button.setAttribute("aria-label", isVisible ? "Afficher le mot de passe" : "Masquer le mot de passe");
    });
  });

  if (loginForm instanceof HTMLFormElement && loginForm.dataset.odcProfessionalReady !== "true") {
    loginForm.dataset.odcProfessionalReady = "true";
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      setFeedback(loginFeedback, "");

      try {
        await loginProfessionalAccount({
          email: formData.get("email"),
          password: formData.get("password")
        });
        const redirectHandled = await resolvePendingProfessionalIntent();
        closeModal();
        if (redirectHandled) {
          return;
        }
        if (modal.dataset.odcProfessionalRedirectAfterLogin === "false") {
          return;
        }
        window.location.assign("/");
      } catch (error) {
        setFeedback(loginFeedback, error.message || "Connexion impossible.", true);
      }
    });
  }

  if (registerForm instanceof HTMLFormElement && registerForm.dataset.odcProfessionalReady !== "true") {
    registerForm.dataset.odcProfessionalReady = "true";
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      setFeedback(registerFeedback, "");

      if (String(formData.get("password") || "") !== String(formData.get("passwordConfirm") || "")) {
        setFeedback(registerFeedback, "Les mots de passe doivent être identiques.", true);
        return;
      }

      try {
        const payload = await registerProfessionalAccount({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          profession: formData.get("profession"),
          password: formData.get("password"),
          passwordConfirm: formData.get("passwordConfirm")
        });
        registerForm.reset();
        setFeedback(
          registerFeedback,
          payload.verificationEmailSent
            ? "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter. Pensez aussi à regarder vos spams ou courriers indésirables."
            : "Compte créé. L’email de confirmation n’a pas pu être envoyé, contactez-nous pour activer votre compte."
        );
      } catch (error) {
        setFeedback(registerFeedback, error.message || "Création de compte impossible.", true);
      }
    });
  }

  if (logoutButton instanceof HTMLButtonElement && logoutButton.dataset.odcProfessionalReady !== "true") {
    logoutButton.dataset.odcProfessionalReady = "true";
    logoutButton.addEventListener("click", async () => {
      await logoutProfessionalAccount();
      closeModal();
      window.location.assign("/");
    });
  }

  if (!modal.dataset.odcProfessionalEscapeReady) {
    modal.dataset.odcProfessionalEscapeReady = "true";
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal({ clearPendingFavorite: true });
      }
    });
  }

  renderPanels();
  syncProfessionalModeUi();
  window.addEventListener(PROFESSIONAL_AUTH_EVENT, renderPanels);
  window.addEventListener(PROFESSIONAL_AUTH_EVENT, syncProfessionalModeUi);
  fetchProfessionalSession().catch(() => {});

  const params = new URLSearchParams(window.location.search);
  const emailVerified = params.get("emailVerified");
  if (emailVerified === "1" || emailVerified === "expired") {
    openModal({ redirectAfterLogin: false });
    activatePanel("login");
    setFeedback(
      loginFeedback,
      emailVerified === "1"
        ? "Votre email est confirmé. Vous pouvez maintenant vous connecter."
        : "Le lien de confirmation est expiré. Créez un nouveau compte ou contactez-nous pour recevoir un nouveau lien.",
      emailVerified !== "1"
    );
    params.delete("emailVerified");
    const nextQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`);
  }
}

function footerIcon(type) {
  switch (type) {
    case "mail":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.75h18v10.5H3z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 8.25 12 14.25l7.5-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "phone":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.7 3.75h3.1l1.05 4.2-1.9 1.9a15.6 15.6 0 0 0 5.2 5.2l1.9-1.9 4.2 1.05v3.1a1.5 1.5 0 0 1-1.67 1.5c-7.9-.8-14.15-7.05-14.95-14.95A1.5 1.5 0 0 1 6.7 3.75Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    case "pin":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.25s-5.25-5.5-5.25-9.45a5.25 5.25 0 1 1 10.5 0c0 3.95-5.25 9.45-5.25 9.45Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="10.75" r="1.7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    case "facebook":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.3 20v-6.7h2.3l.35-2.6H13.3V9.05c0-.75.2-1.25 1.28-1.25H16V5.48c-.68-.07-1.35-.1-2.03-.1-2 0-3.37 1.22-3.37 3.47v1.92H8.3v2.6h2.3V20h2.7Z" fill="currentColor"/></svg>`;
    case "instagram":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.25" y="4.25" width="15.5" height="15.5" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.1" cy="6.95" r="1" fill="currentColor"/></svg>`;
    case "x":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.25h3.25l3.95 5.56 4.67-5.56H19l-5.76 6.86 6.4 9.14h-3.25l-4.36-6.2-5.18 6.2H4.72l6.26-7.48L5 5.25Zm2.86 1.6h-.9l8.3 11.8h.9l-8.3-11.8Z" fill="currentColor"/></svg>`;
    case "linkedin":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.15 8.55a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Zm-1.3 1.9h2.6V19h-2.6v-8.55Zm4.9 0h2.5v1.17h.03c.35-.66 1.2-1.35 2.48-1.35 2.65 0 3.14 1.74 3.14 4V19h-2.6v-4.2c0-1-.02-2.29-1.4-2.29-1.4 0-1.62 1.09-1.62 2.22V19h-2.53v-8.55Z" fill="currentColor"/></svg>`;
    default:
      return "";
  }
}

function replaceFooter() {
  const footer = document.querySelector("#footer-sections");

  if (!footer || footer.dataset.odcLocalFooterReady === "true") {
    return;
  }

  footer.dataset.odcLocalFooterReady = "true";
  footer.innerHTML = `
    <div class="odc-footer">
      <div class="odc-footer__grid">
        <section class="odc-footer__column odc-footer__column--contacts" aria-labelledby="odc-footer-contacts-title">
          <h4 id="odc-footer-contacts-title" class="odc-footer__title">Contacts</h4>
          <ul class="odc-footer__list">
            <li>
              <span class="odc-footer__icon">${footerIcon("mail")}</span>
              <a href="mailto:contact@odyssee.ma">contact@odyssee.ma</a>
            </li>
            <li>
              <span class="odc-footer__icon">${footerIcon("phone")}</span>
              <a href="tel:+212522369923">+212 5223-69923</a>
            </li>
            <li>
              <span class="odc-footer__icon">${footerIcon("pin")}</span>
              <span>1, Avenue Dr Mohamed Sijelmassi - Casablanca, Maroc</span>
            </li>
            <li>
              <span class="odc-footer__icon">${footerIcon("pin")}</span>
              <span>10, Avenue du 16 Novembre - Quartier Agdal - Rabat, Maroc</span>
            </li>
            <li>
              <span class="odc-footer__icon">${footerIcon("pin")}</span>
              <span>5-6 angle Rue Ibnou Zaidoune et rue Kortoba - Tanger, Maroc</span>
            </li>
          </ul>
        </section>

        <section class="odc-footer__column odc-footer__column--social" aria-labelledby="odc-footer-social-title">
          <h4 id="odc-footer-social-title" class="odc-footer__title">Suivez-nous</h4>
          <div class="odc-footer__socials">
            <a href="https://m.facebook.com/www.odyssee.ma/" target="_blank" rel="noreferrer" aria-label="Facebook">
              ${footerIcon("facebook")}
            </a>
            <a href="https://www.instagram.com/odyssee_tissus_maroc?igsh=MTF3NjkxeWg5bDNyOQ==" target="_blank" rel="noreferrer" aria-label="Instagram">
              ${footerIcon("instagram")}
            </a>
            <a href="#" aria-label="X (lien à venir)">
              ${footerIcon("x")}
            </a>
            <a href="#" aria-label="LinkedIn (lien à venir)">
              ${footerIcon("linkedin")}
            </a>
          </div>
          <a class="odc-footer__logo" href="/" aria-label="Odyssée">
            <img src="${footerLogo}" alt="Logo Odyssée" />
          </a>
        </section>
      </div>
    </div>
  `;
}

function replaceShowroomsFacade() {
  if (!["/showrooms", "/showrooms/", "/showrooms.html", "/showroons", "/showroons/"].includes(window.location.pathname)) {
    return;
  }

  const localHeroImage = document.querySelector(".odc-showrooms-hero__image img");
  if (localHeroImage) {
    localHeroImage.src = siteContent.showrooms?.heroImage || showroomsFacade;
  }

  document
    .querySelectorAll('img[data-sqsp-image-block-image], img[elementtiming="system-image-block"]')
    .forEach((image) => {
      const source = image.getAttribute("data-image") || image.getAttribute("src") || "";
      if (!source.includes("d1f7037f-eed3-4195-b4d1-9cb4720142cf")) {
        return;
      }

      const heroImage = siteContent.showrooms?.heroImage || showroomsFacade;
      image.setAttribute("src", heroImage);
      image.setAttribute("data-src", heroImage);
      image.setAttribute("data-image", heroImage);
      image.setAttribute("srcset", heroImage);
      image.setAttribute("sizes", "(max-width: 767px) 100vw, 100vw");
      image.setAttribute("alt", "Showroom ODC");
    });
}

function replaceShowroomsAccordion() {
  if (!["/showrooms", "/showrooms/", "/showrooms.html", "/showroons", "/showroons/"].includes(window.location.pathname)) {
    return;
  }

  const localLinks = document.querySelector(".odc-showrooms-links");
  const modal = document.querySelector(".odc-showrooms-modal");
  if (localLinks && modal) {
    localLinks.querySelectorAll("[data-showroom-city]").forEach((button, index) => {
      if (siteContent.showrooms?.cities?.[index]) {
        button.textContent = siteContent.showrooms.cities[index];
      }
    });

    const title = modal.querySelector(".odc-showrooms-modal__title");
    const address = modal.querySelector("[data-showroom-address]");
    const phone = modal.querySelector("[data-showroom-phone]");
    const email = modal.querySelector("[data-showroom-email]");
    const map = modal.querySelector("[data-showroom-map]");
    const googleLink = modal.querySelector("[data-showroom-google]");
    const wazeLink = modal.querySelector("[data-showroom-waze]");
    const appleLink = modal.querySelector("[data-showroom-apple]");
    const closeButtons = modal.querySelectorAll("[data-showroom-close]");
    const body = document.body;

    const openShowroomModal = (item) => {
      if (title) title.textContent = item.city;
      if (address) address.textContent = item.address;
      if (phone) {
        phone.textContent = item.phoneLabel;
        phone.setAttribute("href", item.phoneHref);
      }
      if (email) {
        email.textContent = item.email;
        email.setAttribute("href", `mailto:${item.email}`);
      }
      if (map) {
        map.setAttribute("src", item.mapEmbed);
        map.setAttribute("title", `Carte ${item.city}`);
      }
      if (googleLink) googleLink.setAttribute("href", item.mapHref);
      if (wazeLink) wazeLink.setAttribute("href", item.wazeHref);
      if (appleLink) appleLink.setAttribute("href", item.appleHref);

      modal.hidden = false;
      body.classList.add("odc-showrooms-modal-open");
    };

    const closeShowroomModal = () => {
      modal.hidden = true;
      body.classList.remove("odc-showrooms-modal-open");
    };

    localLinks.querySelectorAll("[data-showroom-city]").forEach((button) => {
      if (button.dataset.odcShowroomReady === "true") {
        return;
      }

      button.dataset.odcShowroomReady = "true";
      button.addEventListener("click", () => {
        const item = showroomAccordionItems.find((entry) => entry.city === button.dataset.showroomCity);
        if (item) {
          openShowroomModal(item);
        }
      });
    });

    closeButtons.forEach((button) => {
      if (button.dataset.odcShowroomCloseReady === "true") {
        return;
      }

      button.dataset.odcShowroomCloseReady = "true";
      button.addEventListener("click", closeShowroomModal);
    });

    if (!modal.dataset.odcEscapeReady) {
      modal.dataset.odcEscapeReady = "true";
      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
          closeShowroomModal();
        }
      });
    }

    return;
  }

  const section = document.querySelector('[data-section-id="677ec6234f6cb47c166aec1f"]');
  const content = section?.querySelector(".content-wrapper .content");

  if (!content || content.dataset.odcShowroomsAccordionReady === "true") {
    return;
  }

  content.dataset.odcShowroomsAccordionReady = "true";
  content.innerHTML = `
    <div class="odc-showrooms-links" aria-label="Showrooms Odyssée">
      ${showroomAccordionItems
        .map(
          (item, index) => `
            <button class="odc-showrooms-links__item" type="button" data-showroom-city="${item.city}">${item.city}</button>
          `
        )
        .join("")}
    </div>
  `;
}

function isAmbiancesPath(pathname = window.location.pathname) {
  return pathname === "/ambiances" ||
    pathname === "/ambiances/" ||
    pathname === "/ambiances.html" ||
    pathname === "/mood-boards" ||
    pathname === "/mood-boards/" ||
    pathname === "/mood-boards.html";
}

function enableAmbiancesCarousel() {
  if (!isAmbiancesPath()) {
    return;
  }

  const viewport = document.querySelector("[data-odc-ambiances-carousel]");
  const prevButton = document.querySelector("[data-odc-ambiances-prev]");
  const nextButton = document.querySelector("[data-odc-ambiances-next]");

  if (!(viewport instanceof HTMLElement) || !(prevButton instanceof HTMLButtonElement) || !(nextButton instanceof HTMLButtonElement)) {
    return;
  }

  const getStep = () => Math.max(viewport.clientWidth * 0.82, 320);

  const syncButtons = () => {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    prevButton.disabled = viewport.scrollLeft <= 12;
    nextButton.disabled = viewport.scrollLeft >= maxScroll - 12;
  };

  const scrollByStep = (direction) => {
    viewport.scrollBy({
      left: getStep() * direction,
      behavior: "smooth"
    });
  };

  if (prevButton.dataset.odcReady !== "true") {
    prevButton.dataset.odcReady = "true";
    prevButton.addEventListener("click", () => scrollByStep(-1));
  }

  if (nextButton.dataset.odcReady !== "true") {
    nextButton.dataset.odcReady = "true";
    nextButton.addEventListener("click", () => scrollByStep(1));
  }

  if (viewport.dataset.odcReady !== "true") {
    viewport.dataset.odcReady = "true";
    viewport.addEventListener("scroll", syncButtons, { passive: true });
    window.addEventListener("resize", syncButtons);

    let pointerStartX = 0;
    let pointerStartScroll = 0;
    let dragging = false;

    viewport.addEventListener("pointerdown", (event) => {
      dragging = true;
      pointerStartX = event.clientX;
      pointerStartScroll = viewport.scrollLeft;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!dragging) {
        return;
      }
      viewport.scrollLeft = pointerStartScroll - (event.clientX - pointerStartX);
    });

    const stopDragging = (event) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      viewport.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      syncButtons();
    };

    viewport.addEventListener("pointerup", stopDragging);
    viewport.addEventListener("pointercancel", stopDragging);
  }

  syncButtons();
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
          <a class="odc-brand-strip__item" href="${item.href}" target="_blank" rel="noopener noreferrer" aria-label="${hidden ? "" : item.alt}" style="--odc-logo-width:${item.width};--odc-logo-height:${item.height};--odc-logo-basis:${item.basis};--odc-logo-scale:${item.scale};" ${hidden ? 'tabindex="-1" aria-hidden="true"' : ""}>
            <img class="odc-brand-strip__logo" src="${item.src}" alt="${hidden ? "" : item.alt}" loading="eager" decoding="async" />
          </a>
        `
      )
      .join("");

  marquee.innerHTML = `
    <div class="odc-brand-strip-wrap">
      <div class="odc-brand-strip" aria-label="Voir les marques">
        <div class="odc-brand-strip__track">
          ${logoItems(false)}
          ${logoItems(true)}
        </div>
      </div>
      <div class="odc-brand-strip-divider" aria-hidden="true"></div>
    </div>
  `;
}

function insertHomeShortcutCards() {
  if (!["/", "/home", "/home/"].includes(window.location.pathname)) {
    return;
  }

  const marquee = document.querySelector(".Marquee");

  if (!marquee || document.querySelector(".odc-home-shortcuts")) {
    return;
  }

  const section = document.createElement("section");
  section.className = "odc-home-shortcuts";
  section.setAttribute("aria-label", "Accès rapides");
  section.innerHTML = `
    <div class="odc-home-shortcuts__grid">
      ${(siteContent.home?.shortcuts || [])
        .map(
          (item) => `
            <a class="odc-home-shortcuts__card" href="${item.href}">
              <img src="${item.image}" alt="${escapeHtml(item.title.replaceAll("<br />", " ").replaceAll("<br/>", " ").replaceAll("<br>", " "))} Odyssée" />
              <span>${item.title}</span>
            </a>
          `
        )
        .join("")}
    </div>
  `;

  marquee.insertAdjacentElement("afterend", section);
}

function applyContractPageContent() {
  if (!["/contract", "/contract/", "/contract.html"].includes(window.location.pathname)) {
    return;
  }

  const contractContent = siteContent.contract;
  if (!contractContent) {
    return;
  }

  const heroImage = document.querySelector(".odc-contract-layout__image img");
  const heroLogo = document.querySelector(".odc-contract-hero__logo img");
  const heroButton = document.querySelector(".odc-contract-hero__button");
  const copyTitle = document.querySelector(".odc-contract-copy-section__title");
  const copyParagraphs = document.querySelectorAll(".odc-contract-copy-section__content p");
  const sideImage = document.querySelector(".odc-contract-copy-section__media img");
  const actionButtons = document.querySelectorAll(".odc-contract-copy-section__actions button");

  if (heroImage) {
    heroImage.src = contractContent.heroImage;
  }
  if (heroLogo && contractContent.heroLogo) {
    heroLogo.src = contractContent.heroLogo;
  }
  if (heroButton) {
    heroButton.textContent = contractContent.heroButtonLabel;
  }
  if (copyTitle) {
    copyTitle.textContent = contractContent.copyTitle;
  }
  copyParagraphs.forEach((node, index) => {
    if (contractContent.copyParagraphs[index]) {
      node.textContent = contractContent.copyParagraphs[index];
    }
  });
  if (sideImage) {
    sideImage.src = contractContent.sideImage;
  }
  if (actionButtons[0]) {
    actionButtons[0].textContent = contractContent.actionLabels.services;
  }
  if (actionButtons[1]) {
    actionButtons[1].textContent = contractContent.actionLabels.clients;
  }
  if (actionButtons[2]) {
    actionButtons[2].textContent = contractContent.actionLabels.contact;
  }
}


function enableContractContactModal() {
  ensureSharedContactModal();

  const modal = document.querySelector(".odc-contract-modal");
  const infoModals = document.querySelectorAll(".odc-contract-info-modal");
  const infoOpenButtons = document.querySelectorAll("[data-contract-modal-open]");
  const infoCloseButtons = document.querySelectorAll("[data-contract-modal-close]");
  const openButtons = document.querySelectorAll("[data-contract-contact-open]");
  const closeButtons = document.querySelectorAll("[data-contract-contact-close]");
  const form = document.querySelector("#odc-contract-contact-form");
  const feedback = document.querySelector("#odc-contract-contact-feedback");
  const subjectSelect = form?.querySelector('select[name="subject"]');
  const sectorField = form?.querySelector("[data-contract-sector-field]");
  const sectorSelect = form?.querySelector("[data-contract-sector-select]");

  if (!modal || !openButtons.length) {
    return;
  }

  const closeInfoModals = () => {
    infoModals.forEach((item) => {
      item.hidden = true;
    });
  };

  const syncSectorField = () => {
    if (!subjectSelect || !sectorField || !sectorSelect) {
      return;
    }

    const showSector = subjectSelect.value === "professional";
    sectorField.hidden = !showSector;
    sectorSelect.required = showSector;
    if (!showSector) {
      sectorSelect.value = "";
    }
  };

  syncSectorField();

  if (subjectSelect && subjectSelect.dataset.odcContractSubjectReady !== "true") {
    subjectSelect.dataset.odcContractSubjectReady = "true";
    subjectSelect.addEventListener("change", syncSectorField);
  }

  const openModal = () => {
    closeInfoModals();
    modal.hidden = false;
    document.body.classList.add("odc-contract-modal-open");
  };

  const closeModal = () => {
    modal.hidden = true;
    if (![...infoModals].some((item) => !item.hidden)) {
      document.body.classList.remove("odc-contract-modal-open");
    }
  };

  infoOpenButtons.forEach((button) => {
    if (button.dataset.odcInfoOpenReady === "true") {
      return;
    }

    button.dataset.odcInfoOpenReady = "true";
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-contract-modal-open");
      const target = document.querySelector(`.odc-contract-info-modal[data-contract-modal="${key}"]`);
      if (!target) {
        return;
      }
      modal.hidden = true;
      closeInfoModals();
      target.hidden = false;
      document.body.classList.add("odc-contract-modal-open");
    });
  });

  infoCloseButtons.forEach((button) => {
    if (button.dataset.odcInfoCloseReady === "true") {
      return;
    }

    button.dataset.odcInfoCloseReady = "true";
    button.addEventListener("click", () => {
      closeInfoModals();
      if (modal.hidden) {
        document.body.classList.remove("odc-contract-modal-open");
      }
    });
  });

  openButtons.forEach((button) => {
    if (button.dataset.odcContractOpenReady === "true") {
      return;
    }

    button.dataset.odcContractOpenReady = "true";
    button.addEventListener("click", openModal);
  });

  const contactParam = new URLSearchParams(window.location.search).get("contact");
  if (contactParam === "1" && modal.dataset.odcContactParamHandled !== "true") {
    modal.dataset.odcContactParamHandled = "true";
    openModal();
    const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, "", cleanUrl);
  }

  closeButtons.forEach((button) => {
    if (button.dataset.odcContractCloseReady === "true") {
      return;
    }

    button.dataset.odcContractCloseReady = "true";
    button.addEventListener("click", closeModal);
  });

  if (form && form.dataset.odcSubmitReady !== "true") {
    form.dataset.odcSubmitReady = "true";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        subject: String(formData.get("subject") || "").trim(),
        sector: String(formData.get("sector") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        source: "contract-modal"
      };

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
      }

      if (feedback) {
        feedback.textContent = "Envoi en cours…";
      }

      try {
        const response = await apiFetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const responseBody = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(responseBody?.error || "Impossible d’envoyer votre message.");
        }

        form.reset();
        syncSectorField();
        if (feedback) {
          feedback.textContent = responseBody?.message || "Merci. Votre message a bien été envoyé.";
        }
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || "Impossible d’envoyer votre message.";
        }
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    });
  }

  if (!modal.dataset.odcEscapeReady) {
    modal.dataset.odcEscapeReady = "true";
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && (!modal.hidden || [...infoModals].some((item) => !item.hidden))) {
        closeInfoModals();
        closeModal();
      }
    });
  }
}

function replaceHomeHeroWithVideo() {
  if (!["/", "/home", "/home/"].includes(window.location.pathname)) {
    return;
  }

  const section = document.querySelector('section[data-section-id="677ec64145753e46d6e80bb9"]');
  const page = document.querySelector("#page");

  if (!page) {
    return;
  }

  if (section instanceof HTMLElement) {
    section.style.display = "none";
  }

  let hero = page.querySelector(".odc-home-hero-local");
  if (!hero) {
    return;
  }

  const video = hero.querySelector(".odc-home-hero-video");
  const soundToggle = hero.querySelector(".odc-home-hero-sound");

  if (!video || !soundToggle) {
    return;
  }

  const primeVideoSource = () => {
    if (video.dataset.odcHeroVideoPrimed === "true") {
      return;
    }

    const source = video.querySelector("source[data-src]");
    if (source && !source.src) {
      source.src = source.dataset.src;
      video.load();
    }

    video.dataset.odcHeroVideoPrimed = "true";
  };

  soundToggle.setAttribute("aria-label", "Activer le son");
  soundToggle.setAttribute("aria-pressed", "false");

  const syncSoundState = () => {
    soundToggle.classList.toggle("is-unmuted", !video.muted);
    soundToggle.setAttribute("aria-pressed", String(!video.muted));
    soundToggle.setAttribute("aria-label", video.muted ? "Activer le son" : "Couper le son");
  };

  if (soundToggle.dataset.odcHeroSoundReady !== "true") {
    soundToggle.dataset.odcHeroSoundReady = "true";
    soundToggle.addEventListener("click", () => {
      video.muted = !video.muted;
      syncSoundState();
      const nextPlay = video.play();
      if (nextPlay?.catch) {
        nextPlay.catch(() => {});
      }
    });
  }

  syncSoundState();

  primeVideoSource();

  if (video.paused) {
    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  }
}

function replaceHomeMosaicHeadline() {
  if (!["/", "/home", "/home/"].includes(window.location.pathname)) {
    return;
  }

  const section = document.querySelector('[data-section-id="67d2ce62b0b3cc780fef5ea0"]');

  if (!section || section.dataset.odcMosaicHeadlineReady === "true") {
    return;
  }

  section.dataset.odcMosaicHeadlineReady = "true";
  section.remove();
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
            <a class="odc-brand-grid__item" href="${item.href}" target="_blank" rel="noopener noreferrer" aria-label="Voir le site ${item.alt}">
              <img
                class="odc-brand-grid__logo"
                src="${item.src}"
                alt="${item.alt}"
                loading="eager"
                decoding="async"
                style="--odc-grid-width:${item.gridWidth};--odc-grid-height:${item.gridHeight};"
              />
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

function isCommercePath() {
  return window.location.pathname.startsWith("/produits");
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
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

function isLocalCartPath(pathname = window.location.pathname) {
  return [
    "/cart",
    "/cart/",
    "/cart.html",
    "/panier",
    "/panier/",
    "/panier.html"
  ].includes(pathname);
}

function isFavoritesPath(pathname = window.location.pathname) {
  return [
    "/favoris",
    "/favoris/",
    "/favoris.html"
  ].includes(pathname);
}

function getProductActivePrice(product, colorway = null) {
  const resolvedColorway = colorway || getProductActiveColorway(product, 0);
  return resolvedColorway?.salePrice || resolvedColorway?.price || product?.salePrice || product?.price || null;
}

function getProductPriceLabel(product) {
  const activePrice = getProductActivePrice(product);
  return activePrice ? formatMoney(activePrice) : "Prix sur demande";
}

function getCartLineKey(productId, variantId = "") {
  return `${productId}::${variantId}`;
}

function updateCartIndicators() {
  const count = getCartCount();

  document.querySelectorAll(".sqs-cart-quantity").forEach((node) => {
    node.textContent = String(count);
  });

  document.querySelectorAll(".sqs-custom-cart, .header-actions-action--cart a[href='/cart']").forEach((link) => {
    link.classList.toggle("cart-quantity-zero", count === 0);
    link.classList.toggle("show-empty-cart-state", count === 0);
    link.classList.toggle("show-cart-count", count > 0);
  });
}

function updateFavoriteIndicators() {
  const count = getFavoriteProductIds().length;

  document.querySelectorAll("[data-odc-favorite-count]").forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    node.textContent = String(count);
    node.hidden = count <= 0;
  });
}

function flashAddToCartState(button) {
  if (!(button instanceof HTMLElement)) {
    return;
  }

  button.classList.remove("is-added");
  button.classList.add("is-loading");

  window.setTimeout(() => {
    button.classList.remove("is-loading");
    button.classList.add("is-added");

    window.setTimeout(() => {
      button.classList.remove("is-added");
    }, 1400);
  }, 180);
}

function buildLocalCartMarkup() {
  const professionalState = getProfessionalState();
  const lines = getCartLines()
    .map((line) => {
      const product = getProductCatalogItemById(line.productId);
      if (!product) {
        return null;
      }

      const price = getProductActivePrice(product);

      return {
        ...line,
        key: getCartLineKey(line.productId, line.variantId),
        product,
        price
      };
    })
    .filter(Boolean);

  const totalItems = lines.reduce((total, line) => total + line.quantity, 0);

  if (lines.length === 0) {
    return `
      <section class="odc-cart-page">
        <header class="odc-cart-page__header">
          <p class="odc-cart-page__eyebrow">Panier</p>
          <h1 class="odc-cart-page__title">Votre sélection est vide</h1>
          <p class="odc-cart-page__intro">Retrouvez ici les références ajoutées depuis les fiches produit.</p>
        </header>
        <div class="odc-cart-empty">
          <p>Aucun tissu n’a encore été ajouté.</p>
          <a class="odc-cart-button odc-cart-button--primary" href="/produits">Voir les produits</a>
        </div>
      </section>
    `;
  }

  return `
    <section class="odc-cart-page">
      <header class="odc-cart-page__header">
        <p class="odc-cart-page__eyebrow">Panier</p>
        <h1 class="odc-cart-page__title">Votre sélection</h1>
        <p class="odc-cart-page__intro">${totalItems} article${totalItems > 1 ? "s" : ""} enregistré${totalItems > 1 ? "s" : ""}.</p>
      </header>

      <div class="odc-cart-layout">
        <div class="odc-cart-items">
          ${lines
            .map((line) => `
              <article class="odc-cart-item" data-odc-cart-line="${line.key}">
                <a class="odc-cart-item__media" href="${getProductDetailHref(line.product)}">
                  <img src="${line.product.mainImage?.assetUrl || line.product.images?.[0]?.assetUrl || ""}" alt="${escapeHtml(line.product.title)}" />
                </a>
                <div class="odc-cart-item__meta">
                  <div class="odc-cart-item__top">
                    <div>
                      <p class="odc-cart-item__eyebrow">${line.product.onSale ? "Promotion" : "Collection"}</p>
                      <a class="odc-cart-item__title" href="${getProductDetailHref(line.product)}">${escapeHtml(line.product.title)}</a>
                    </div>
                    <button class="odc-cart-item__remove" type="button" data-odc-cart-remove="${line.key}">Supprimer</button>
                  </div>
                  ${
                    professionalState.authenticated
                      ? `<div class="odc-cart-item__price"><strong>${formatMoney(line.price)}</strong></div>`
                      : `<div class="odc-cart-item__note">Tarif communique sur demande.</div>`
                  }
                  <div class="odc-cart-item__controls">
                    <div class="odc-cart-quantity" role="group" aria-label="Quantité">
                      <button type="button" aria-label="Réduire la quantité" data-odc-cart-quantity="decrease" data-odc-cart-line-key="${line.key}">−</button>
                      <input type="number" min="1" max="9999" value="${line.quantity}" data-odc-cart-input="${line.key}" />
                      <button type="button" aria-label="Augmenter la quantité" data-odc-cart-quantity="increase" data-odc-cart-line-key="${line.key}">+</button>
                    </div>
                  </div>
                </div>
              </article>
            `)
            .join("")}
        </div>

        <aside class="odc-cart-summary">
          <p class="odc-cart-summary__eyebrow">Résumé</p>
          <div class="odc-cart-summary__row">
            <span>Articles</span>
            <strong>${totalItems}</strong>
          </div>
          <p class="odc-cart-summary__note">${professionalState.authenticated ? "Les prix sont visibles dans votre espace professionnel. La finalisation se fait ensuite avec l’équipe Odyssée." : "Les tarifs sont communiques sur demande. La finalisation se fait ensuite avec l’equipe Odyssée."}</p>
          <div class="odc-cart-summary__actions">
            <button class="odc-cart-button odc-cart-button--primary" type="button" data-contract-contact-open>Prendre contact</button>
            <a class="odc-cart-button" href="/produits">Continuer mes achats</a>
            <button class="odc-cart-button odc-cart-button--ghost" type="button" data-odc-cart-clear>Vider le panier</button>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function enableLocalCartPage() {
  if (!isLocalCartPath()) {
    return;
  }

  const root = document.querySelector("#odc-local-cart-root");

  if (!root || root.dataset.odcCartReady === "true") {
    return;
  }

  root.dataset.odcCartReady = "true";
  document.title = "Panier — Odyssée";

  const render = () => {
    root.innerHTML = buildLocalCartMarkup();
    updateCartIndicators();
  };

  render();

  root.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) {
      return;
    }

    const removeButton = target.closest("[data-odc-cart-remove]");
    if (removeButton) {
      event.preventDefault();
      const [productId, variantId = ""] = (removeButton.getAttribute("data-odc-cart-remove") || "").split("::");
      if (productId) {
        removeCartLine({ productId, variantId });
      }
      return;
    }

    const quantityButton = target.closest("[data-odc-cart-quantity]");
    if (quantityButton) {
      event.preventDefault();
      const [productId, variantId = ""] = (quantityButton.getAttribute("data-odc-cart-line-key") || "").split("::");
      const currentLine = getCartLines().find((line) => line.productId === productId && line.variantId === variantId);
      if (!currentLine) {
        return;
      }

      const direction = quantityButton.getAttribute("data-odc-cart-quantity") === "increase" ? 1 : -1;
      const nextQuantity = Math.max(1, Math.min(9999, currentLine.quantity + direction));
      updateCartLineQuantity({ productId, variantId, quantity: nextQuantity });
      return;
    }

    const clearButton = target.closest("[data-odc-cart-clear]");
    if (clearButton) {
      event.preventDefault();
      clearCart();
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (!target) {
      return;
    }

    const key = target.getAttribute("data-odc-cart-input");
    if (!key) {
      return;
    }

    const [productId, variantId = ""] = key.split("::");
    const quantity = Number.parseInt(target.value || "", 10);
    updateCartLineQuantity({
      productId,
      variantId,
      quantity: Number.isFinite(quantity) ? quantity : 1
    });
  });

  window.addEventListener(CART_CHANGE_EVENT, render);
  window.addEventListener(PROFESSIONAL_AUTH_EVENT, render);
}

function buildFavoritesMarkup() {
  const favoriteSelections = getFavoriteProductIds()
    .map((selectionKey) => resolveProductSelection(selectionKey))
    .filter(Boolean);
  const totalVisible = favoriteSelections.length;

  if (!totalVisible) {
    return `
      <section class="odc-cart-page">
        <header class="odc-cart-page__header">
          <p class="odc-cart-page__eyebrow">Favoris</p>
          <h1 class="odc-cart-page__title">Aucun favori enregistré</h1>
          <p class="odc-cart-page__intro">Ajoutez des coloris depuis la modale produit pour les retrouver ici.</p>
        </header>
        <div class="odc-cart-empty">
          <a class="odc-cart-button odc-cart-button--primary" href="/produits">Voir les produits</a>
        </div>
      </section>
    `;
  }

  return `
    <section class="odc-cart-page">
      <header class="odc-cart-page__header">
        <p class="odc-cart-page__eyebrow">Favoris</p>
        <h1 class="odc-cart-page__title">Vos favoris</h1>
        <p class="odc-cart-page__intro">${totalVisible} coloris favori${totalVisible > 1 ? "s" : ""} enregistré${totalVisible > 1 ? "s" : ""}.</p>
      </header>
      <div class="odc-cart-layout">
        <div class="odc-cart-items">
          ${favoriteSelections.map((selection) => `
            <article class="odc-cart-item" data-odc-favorite-line="${selection.selectionKey}">
              <a class="odc-cart-item__media" href="${getProductDetailHref(selection.product, selection.colorway)}">
                <img src="${selection.colorway?.mainImage?.assetUrl || selection.product.mainImage?.assetUrl || selection.product.images?.[0]?.assetUrl || ""}" alt="${escapeHtml(selection.product.title)}" />
              </a>
              <div class="odc-cart-item__meta">
                <div class="odc-cart-item__top">
                  <div>
                    <p class="odc-cart-item__eyebrow">Favori</p>
                    <a class="odc-cart-item__title" href="${getProductDetailHref(selection.product, selection.colorway)}">${escapeHtml(selection.product.title)}</a>
                  </div>
                  <button class="odc-cart-item__remove odc-cart-item__remove--icon" type="button" aria-label="Retirer des favoris" data-odc-favorite-remove="${selection.selectionKey}">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div class="odc-cart-item__note">Coloris : ${escapeHtml(selection.colorway?.label || "Par défaut")}</div>
              </div>
            </article>
          `).join("")}
        </div>
        <aside class="odc-cart-summary">
          <p class="odc-cart-summary__eyebrow">Résumé</p>
          <div class="odc-cart-summary__row">
            <span>Coloris favoris</span>
            <strong>${totalVisible}</strong>
          </div>
          <p class="odc-cart-summary__note">Vos favoris sont enregistrés par coloris pour faciliter votre sélection.</p>
          <div class="odc-cart-summary__actions">
            <a class="odc-cart-button odc-cart-button--primary" href="/produits">Continuer la sélection</a>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function enableFavoritesPage() {
  if (!isFavoritesPath()) {
    return;
  }

  const root = document.querySelector("#odc-favorites-root");
  if (!root || root.dataset.odcFavoritesPageReady === "true") {
    return;
  }

  root.dataset.odcFavoritesPageReady = "true";
  document.title = "Favoris — Odyssée";

  const render = () => {
    root.innerHTML = buildFavoritesMarkup();
    updateFavoriteIndicators();
  };

  render();

  root.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const removeButton = target.closest("[data-odc-favorite-remove]");
    if (!removeButton) {
      return;
    }

    event.preventDefault();
    const selectionKey = removeButton.getAttribute("data-odc-favorite-remove") || "";

    try {
      await toggleFavoriteProduct(selectionKey);
      render();
    } catch (error) {
      console.error(error);
    }
  });

  window.addEventListener(FAVORITES_CHANGE_EVENT, render);
  window.addEventListener(PROFESSIONAL_AUTH_EVENT, render);
}

window.addEventListener(CART_CHANGE_EVENT, updateCartIndicators);
window.addEventListener(FAVORITES_CHANGE_EVENT, updateFavoriteIndicators);

function getDecodedProductDescription(product, fallback = false) {
  const normalized = product?.description ? decodeHtmlEntities(product.description).trim() : "";

  if (normalized) {
    return normalized;
  }

  return fallback
    ? "<p>Découvrez les textures, teintes et finitions de cette référence dans sa fiche complète.</p>"
    : "";
}

function getProductColorways(product) {
  return Array.isArray(product?.colorways) ? product.colorways : [];
}

function getProductActiveColorway(product, colorwayIndex = 0) {
  const colorways = getProductColorways(product);
  if (!colorways.length) {
    return null;
  }

  const safeIndex = Math.max(0, Math.min(colorwayIndex, colorways.length - 1));
  return colorways[safeIndex] || colorways[0] || null;
}

function getProductSelectionKey(product, colorway = null) {
  return buildProductSelectionKey(product?.id, colorway?.id || "");
}

function getProductDetailHref(product, colorway = null) {
  const productId = typeof product?.id === "string" ? product.id.trim() : "";
  if (!productId) {
    return "/produits";
  }

  const params = new URLSearchParams({ product: productId });
  if (colorway?.id) {
    params.set("colorway", colorway.id);
  }

  return `/product.html?${params.toString()}`;
}

function resolveProductSelection(selectionKey) {
  const { productId, colorwayId, selectionKey: normalizedSelectionKey } = parseProductSelectionKey(selectionKey);
  const product = getProductCatalogItemById(productId);

  if (!product) {
    return null;
  }

  const colorway = getProductColorwayById(product, colorwayId);
  const resolvedSelectionKey = getProductSelectionKey(product, colorway);

  return {
    selectionKey: resolvedSelectionKey || normalizedSelectionKey,
    productId: product.id,
    colorwayId: colorway?.id || "",
    product,
    colorway
  };
}

function getProductImages(product, colorway = null) {
  if (Array.isArray(colorway?.images) && colorway.images.length) {
    return colorway.images;
  }

  if (Array.isArray(product?.images) && product.images.length) {
    return product.images;
  }

  return product?.mainImage ? [product.mainImage] : [];
}

function getProductMainImage(product, colorway = null) {
  return colorway?.mainImage || product?.mainImage || getProductImages(product, colorway)[0] || null;
}

function getProductColorwayPreviewImage(colorway) {
  return colorway?.mainImage || colorway?.images?.[0] || null;
}

function getCatalogThumbnailUrl(assetUrl, size = "768x768") {
  if (!assetUrl || typeof assetUrl !== "string") {
    return "";
  }

  const [basePart, hashPart = ""] = assetUrl.split("#");
  const [pathPart, queryPart = ""] = basePart.split("?");
  const match = pathPart.match(/\.(avif|webp|png|jpe?g)$/i);

  if (!match || !/\/wp-content\/uploads\//i.test(pathPart)) {
    return assetUrl;
  }

  if (new RegExp(`-${size}\\.${match[1]}$`, "i").test(pathPart)) {
    return assetUrl;
  }

  const nextPath = pathPart.replace(new RegExp(`\\.${match[1]}$`, "i"), `-${size}.${match[1]}`);
  const nextQuery = queryPart ? `?${queryPart}` : "";
  const nextHash = hashPart ? `#${hashPart}` : "";

  return `${nextPath}${nextQuery}${nextHash}`;
}

function getProductCardThumbnailUrl(image, size = "768x768") {
  return getCatalogThumbnailUrl(image?.assetUrl || "", size);
}

function isHomePath(pathname = window.location.pathname) {
  return pathname === "/" || pathname === "/index.html" || pathname === "/home/" || pathname === "/home/index.html";
}

const productGridPrefetchCache = new Set();
let productListingWarmupStarted = false;
let productListingWarmupBoosted = false;

function prefetchImageAsset(src) {
  if (!src || productGridPrefetchCache.has(src)) {
    return;
  }

  productGridPrefetchCache.add(src);
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

function getProductGridWarmupEntries(limit = 12) {
  return productCatalogItems
    .flatMap((product) => {
      const colorways = getProductColorways(product);
      return (colorways.length ? colorways : [null]).map((colorway) => ({
        primary: getProductCardThumbnailUrl(getProductMainImage(product, colorway)),
        hover: getProductCardThumbnailUrl(getProductImages(product, colorway)?.[1])
      }));
    })
    .slice(0, limit);
}

function warmProductListingAssets(limit = 12) {
  getProductGridWarmupEntries(limit).forEach(({ primary }) => {
    prefetchImageAsset(primary);
  });
}

function prefetchDocumentAsset(href) {
  if (!href || document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "document";
  link.href = href;
  document.head.appendChild(link);
}

function warmProductsListingFromHome({ boosted = false } = {}) {
  if (!isHomePath()) {
    return;
  }

  if (!productListingWarmupStarted) {
    productListingWarmupStarted = true;
    prefetchDocumentAsset("/produits");
    warmProductListingAssets(12);
  }

  if (boosted && !productListingWarmupBoosted) {
    productListingWarmupBoosted = true;
    prefetchDocumentAsset("/produits/");
    warmProductListingAssets(32);
  }
}

function bindProductsNavWarmup() {
  if (!isHomePath()) {
    return;
  }

  const scheduleWarmup = window.requestIdleCallback
    ? (callback) => window.requestIdleCallback(callback, { timeout: 1800 })
    : (callback) => window.setTimeout(callback, 900);

  scheduleWarmup(() => warmProductsListingFromHome());

  document.querySelectorAll('a[href="/produits"]').forEach((link) => {
    const boost = () => warmProductsListingFromHome({ boosted: true });
    link.addEventListener("pointerenter", boost, { passive: true });
    link.addEventListener("focus", boost, { passive: true });
    link.addEventListener("touchstart", boost, { passive: true, once: true });
  });
}

function getProductResolvedDescription(product, colorway = null) {
  const segments = [];

  if (colorway?.description) {
    segments.push(decodeHtmlEntities(colorway.description).trim());
  }

  if (product?.description) {
    segments.push(decodeHtmlEntities(product.description).trim());
  }

  return segments.filter(Boolean).join("");
}

const PRODUCT_COLORWAYS_PER_PAGE = 4;
const PRODUCT_GRID_INITIAL_LIMIT = 48;
const PRODUCT_GRID_LOAD_MORE_STEP = 48;
const PRODUCT_COLORWAY_SWIPE_THRESHOLD = 36;
const PRODUCT_IMAGE_SWIPE_THRESHOLD = 36;
const PRODUCT_STATUS_CHANGE_EVENT = "odc:product-statuses-change";

function applyProductStatusOverrides(statuses = []) {
  const productItems = Array.isArray(statuses) ? statuses : [];

  productItems.forEach((item) => {
    const product = getProductCatalogItemById(item?.productId);
    if (!product) {
      return;
    }

    const unavailable = item.status === "unavailable";
    product.soldOut = unavailable;
    product.qtyInStock = unavailable ? 0 : Number.MAX_SAFE_INTEGER;
  });
}

function applyProductColorwayStatusOverrides(statuses = []) {
  const items = Array.isArray(statuses) ? statuses : [];

  items.forEach((item) => {
    const product = getProductCatalogItemById(item?.productId);
    const colorway = getProductColorwayById(product, item?.colorwayId);
    if (!product || !colorway || colorway.id !== item?.colorwayId) {
      return;
    }

    colorway.soldOut = item.status === "unavailable";
  });
}

async function loadProductStatusOverrides() {
  try {
    const response = await apiFetch("/api/catalog/product-statuses");
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    applyProductStatusOverrides(payload.statuses);
    applyProductColorwayStatusOverrides(payload.colorwayStatuses);
    document.dispatchEvent(new CustomEvent(PRODUCT_STATUS_CHANGE_EVENT));
  } catch {
    // La disponibilité reste lisible depuis le catalogue statique si l'API est indisponible.
  }
}

function isProductSelectionUnavailable(product, colorway = null) {
  return Boolean(product?.soldOut || colorway?.soldOut);
}

function getProductAvailabilityLabel(product, colorway = null) {
  if (isProductSelectionUnavailable(product, colorway)) {
    return "Indisponible";
  }

  return product?.onSale ? "Disponible en promotion" : "Disponible";
}

async function getProductDiscoveryState() {
  const productList = document.querySelector(".product-list");

  if (!productList) {
    return null;
  }

  const items = getProductCatalogItemsForPath(window.location.pathname);

  return {
    root: productList,
    items,
    availableTypes: getAvailableProductTypes(items),
    selectedType: getSelectedProductTypeFromLocation(),
    selectedSubtype: getSelectedProductSubtypeFromLocation(),
    availableSubtypes: [],
    itemsByType: [],
    itemsBySubtype: new Map(),
    filteredItems: getFilteredProductItems(
      items,
      getSelectedProductTypeFromLocation(),
      getSelectedProductSubtypeFromLocation()
    ),
    currentIndex: -1,
    currentColorwayIndex: 0,
    currentColorwayPage: 0,
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
      <button class="odc-product-discovery__favorite" type="button" aria-label="Ajouter aux favoris" aria-pressed="false" data-odc-favorite-request>
        ${favoriteIconMarkup(false)}
      </button>
      <button class="odc-product-discovery__close" type="button" aria-label="Fermer" data-odc-close></button>
      <button class="odc-product-discovery__edge odc-product-discovery__edge--prev" type="button" aria-label="Produit précédent" data-odc-product-nav="prev"></button>
      <button class="odc-product-discovery__edge odc-product-discovery__edge--next" type="button" aria-label="Produit suivant" data-odc-product-nav="next"></button>
      <div class="odc-product-discovery__panel">
        <div class="odc-product-discovery__media">
          <div class="odc-product-discovery__gallery-row">
            <div class="odc-product-discovery__thumbs" aria-label="Galerie produit"></div>
            <div class="odc-product-discovery__stage">
              <button class="odc-product-discovery__stage-arrow odc-product-discovery__stage-arrow--prev" type="button" aria-label="Image précédente" data-odc-image-nav="prev"></button>
              <div class="odc-product-discovery__image-wrap">
                <img class="odc-product-discovery__image" alt="" decoding="async" fetchpriority="high" />
              </div>
              <button class="odc-product-discovery__stage-arrow odc-product-discovery__stage-arrow--next" type="button" aria-label="Image suivante" data-odc-image-nav="next"></button>
            </div>
          </div>
          <div class="odc-product-discovery__colorways"></div>
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
  const colorway = getProductActiveColorway(product, 0);
  return getProductMainImage(product, colorway)?.assetUrl || "";
}

function getProductHoverImage(product) {
  const colorway = getProductActiveColorway(product, 0);
  return getProductImages(product, colorway)?.[1]?.assetUrl || getProductPrimaryImage(product);
}

function getProductPriceLabelForColorway(product, colorway = null) {
  const activePrice = getProductActivePrice(product, colorway);
  return activePrice ? formatMoney(activePrice) : "Prix sur demande";
}

function slugifyFilterKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProductTypeLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (["fabrics", "fabric", "tissu", "textile"].includes(normalized)) {
    return "Tissu";
  }

  if (["wallpaper", "wallpapers", "papier peint", "papier-peint"].includes(normalized)) {
    return "Papier peint";
  }

  return "";
}

function getProductTypeLabel(product) {
  const tagMatch = (product?.tags || [])
    .map((tag) => normalizeProductTypeLabel(tag))
    .find(Boolean);

  if (tagMatch) {
    return tagMatch;
  }

  const description = decodeHtmlEntities(product?.description || "");
  const descriptionMatch = description.match(
    /<strong>\s*(?:Type de produit|Product type)\s*:\s*<\/strong>\s*([^<]+)/i
  );

  return (
    normalizeProductTypeLabel(descriptionMatch?.[1] || "") ||
    String(descriptionMatch?.[1] || "").trim()
  );
}

function normalizeProductSubtypeLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "jacquard") {
    return "Jacquard";
  }

  if (["velvet", "velour", "velours"].includes(normalized)) {
    return "Velours";
  }

  if (["tapiceria con dibujo", "prints", "print", "printed"].includes(normalized)) {
    return "Tissu avec dessins";
  }

  if (["plains", "plain", "uni"].includes(normalized)) {
    return "Uni";
  }

  if (["embroidery", "broderie"].includes(normalized)) {
    return "Broderie";
  }

  return String(value).trim();
}

function getProductSubtypeLabel(product) {
  if (slugifyFilterKey(getProductTypeLabel(product)) !== "tissu") {
    return "";
  }

  const description = decodeHtmlEntities(product?.description || "");
  const descriptionMatch = description.match(/<strong>\s*Type\s*:\s*<\/strong>\s*([^<]+)/i);

  return normalizeProductSubtypeLabel(descriptionMatch?.[1] || "");
}

function getAvailableProductSubtypes(items) {
  const merged = items.map((item) => getProductSubtypeLabel(item)).filter(Boolean);
  const seen = new Set();

  return merged.filter((subtype) => {
    const key = slugifyFilterKey(subtype);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getAvailableProductTypes(items = productCatalogItems) {
  const merged = items.map((item) => getProductTypeLabel(item)).filter(Boolean);
  const seen = new Set();

  return merged.filter((type) => {
    const key = slugifyFilterKey(type);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getSelectedProductTypeFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return slugifyFilterKey(params.get("type") || "");
}

function getSelectedProductSubtypeFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return slugifyFilterKey(params.get("subtype") || "");
}

function updateProductTypeFilterInLocation(typeKey, subtypeKey = "") {
  const url = new URL(window.location.href);

  if (typeKey) {
    url.searchParams.set("type", typeKey);
  } else {
    url.searchParams.delete("type");
  }

  if (subtypeKey) {
    url.searchParams.set("subtype", subtypeKey);
  } else {
    url.searchParams.delete("subtype");
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function getFilteredProductItems(items, selectedType, selectedSubtype = "") {
  if (!selectedType) {
    return items;
  }

  const byType = items.filter((item) => slugifyFilterKey(getProductTypeLabel(item)) === selectedType);

  if (!selectedSubtype || selectedType !== "tissu") {
    return byType;
  }

  return byType.filter((item) => slugifyFilterKey(getProductSubtypeLabel(item)) === selectedSubtype);
}

function getDisplayCountForProduct(product) {
  return product ? 1 : 0;
}

function getDisplayCountForProducts(products) {
  return products.reduce((total, product) => total + getDisplayCountForProduct(product), 0);
}

function getMobileFirstFilterOptions(options, selectedKey) {
  if (!window.matchMedia("(max-width: 640px)").matches || !selectedKey) {
    return options;
  }

  const selectedIndex = options.findIndex((option) => slugifyFilterKey(option) === selectedKey);
  if (selectedIndex <= 0) {
    return options;
  }

  const nextOptions = options.slice();
  const [selectedOption] = nextOptions.splice(selectedIndex, 1);
  nextOptions.unshift(selectedOption);
  return nextOptions;
}

function buildProductTypeFilterMarkup(state) {
  const counts = new Map();
  state.items.forEach((item) => {
    const key = slugifyFilterKey(getProductTypeLabel(item));
    if (!key) {
      return;
    }
    counts.set(key, (counts.get(key) || 0) + getDisplayCountForProduct(item));
  });
  const totalVisible = getDisplayCountForProducts(state.filteredItems);
  const totalItems = getDisplayCountForProducts(state.items);
  const orderedTypes = getMobileFirstFilterOptions(state.availableTypes, state.selectedType);
  const orderedSubtypes = getMobileFirstFilterOptions(state.availableSubtypes, state.selectedSubtype);

  return `
    <section class="odc-product-brand-filter" aria-label="Filtrer par type de produit">
      <div class="odc-product-brand-filter__header">
        <p class="odc-product-brand-filter__eyebrow">Types de produit</p>
        <p class="odc-product-brand-filter__summary">${totalVisible} produit${totalVisible > 1 ? "s" : ""}</p>
      </div>
      <div class="odc-product-brand-filter__list" role="list">
        <button
          class="odc-product-brand-filter__chip ${state.selectedType ? "" : "is-active"}"
          type="button"
          data-odc-type-filter=""
          aria-pressed="${state.selectedType ? "false" : "true"}"
        >
          <span>Tous les types</span>
          <small>${totalItems}</small>
        </button>
        ${orderedTypes
          .map((type) => {
            const key = slugifyFilterKey(type);
            const count = counts.get(key) || 0;

            return `
              <button
                class="odc-product-brand-filter__chip ${state.selectedType === key ? "is-active" : ""}"
                type="button"
                data-odc-type-filter="${key}"
                aria-pressed="${state.selectedType === key ? "true" : "false"}"
              >
                <span>${escapeHtml(type)}</span>
                <small>${count}</small>
              </button>
            `;
          })
          .join("")}
      </div>
      ${
        state.selectedType === "tissu" && state.availableSubtypes.length
          ? `
            <div class="odc-product-brand-filter__subgroup">
              <p class="odc-product-brand-filter__subeyebrow">Sous-types</p>
              <div class="odc-product-brand-filter__list odc-product-brand-filter__list--subtypes" role="list">
                <button
                  class="odc-product-brand-filter__chip ${state.selectedSubtype ? "" : "is-active"}"
                  type="button"
                  data-odc-subtype-filter=""
                  aria-pressed="${state.selectedSubtype ? "false" : "true"}"
                >
                  <span>Tous les sous-types</span>
                  <small>${getDisplayCountForProducts(state.itemsByType)}</small>
                </button>
                ${orderedSubtypes
                  .map((subtype) => {
                    const key = slugifyFilterKey(subtype);
                    const count = state.itemsBySubtype.get(key) || 0;

                    return `
                      <button
                        class="odc-product-brand-filter__chip ${state.selectedSubtype === key ? "is-active" : ""}"
                        type="button"
                        data-odc-subtype-filter="${key}"
                        aria-pressed="${state.selectedSubtype === key ? "true" : "false"}"
                      >
                        <span>${escapeHtml(subtype)}</span>
                        <small>${count}</small>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderCustomProductGrid(state) {
  const layout = state.root.querySelector(".product-list-layout-container");

  if (!layout) {
    return null;
  }

  const flattenedItems = state.filteredItems.map((product) => {
    const colorways = getProductColorways(product);
    const sourceIndex = state.items.findIndex((item) => item.id === product.id);
    const colorway = colorways[0] || null;

    return {
      product,
      colorway,
      colorwayIndex: 0,
      sourceIndex
    };
  });
  const totalVisibleCount = flattenedItems.length;
  const visibleLimit = Math.min(
    totalVisibleCount,
    Math.max(PRODUCT_GRID_INITIAL_LIMIT, state.visibleProductLimit || PRODUCT_GRID_INITIAL_LIMIT)
  );
  state.visibleProductLimit = visibleLimit;
  const visibleItems = flattenedItems.slice(0, visibleLimit);

  layout.innerHTML = `
    <div class="odc-product-grid">
      ${visibleItems.length
        ? visibleItems
          .map(({ product, colorway, colorwayIndex, sourceIndex }, visibleIndex) => {
              const primary = getProductCardThumbnailUrl(getProductMainImage(product, colorway));
              const primaryFallback = getProductMainImage(product, colorway)?.assetUrl || "";
              const secondary = getProductCardThumbnailUrl(getProductImages(product, colorway)?.[1]);
              const secondaryFallback = getProductImages(product, colorway)?.[1]?.assetUrl || "";
              const selectionKey = getProductSelectionKey(product, colorway);
              const isFavorite = hasFavoriteProduct(selectionKey);
              const colorwayCount = getProductColorways(product).length;
              const title = product.title;
              const imageLoading = visibleIndex < 8 ? "eager" : "lazy";
              return `
                <article class="odc-product-card ${product.onSale ? "is-on-sale" : ""} ${secondary ? "has-secondary-image" : ""}" data-product-index="${sourceIndex}" data-colorway-index="${colorwayIndex}">
                  <button class="odc-product-card__favorite ${isFavorite ? "is-active" : ""}" type="button" aria-label="${isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-pressed="${isFavorite ? "true" : "false"}" data-odc-card-favorite="${selectionKey}">
                    ${favoriteIconMarkup(isFavorite)}
                  </button>
                  <button class="odc-product-card__quick-view" type="button" aria-pressed="false" data-product-index="${sourceIndex}" data-colorway-index="${colorwayIndex}">
                    Vue rapide
                  </button>
                  <button class="odc-product-card__open" type="button" aria-label="Voir ${title}" data-product-index="${sourceIndex}" data-colorway-index="${colorwayIndex}">
                    <div class="odc-product-card__media">
                      <img class="odc-product-card__image odc-product-card__image--primary" src="${primary}" data-fallback-src="${escapeHtml(primaryFallback)}" alt="${escapeHtml(title)}" loading="${imageLoading}" decoding="async" ${visibleIndex < 8 ? 'fetchpriority="high"' : ""} />
                      ${
                        secondary
                          ? `<img class="odc-product-card__image odc-product-card__image--secondary" data-secondary-src="${secondary}" data-fallback-src="${escapeHtml(secondaryFallback)}" alt="" decoding="async" />`
                          : ""
                      }
                    </div>
                    <div class="odc-product-card__meta">
                      <div class="odc-product-card__copy">
                        <div class="odc-product-card__title">${escapeHtml(product.title)}</div>
                        <div class="odc-product-card__subtitle">${colorwayCount > 1 ? `${colorwayCount} coloris disponibles` : escapeHtml(colorway?.label || "Coloris unique")}</div>
                      </div>
                      <div class="odc-product-card__aside">
                        <div class="odc-product-card__price">${getProductPriceLabelForColorway(product, colorway)}</div>
                      </div>
                    </div>
                  </button>
                </article>
              `;
          })
          .join("")
        : `
          <div class="odc-product-grid__empty">
            <p>Aucun produit ne correspond a ce type pour le moment.</p>
          </div>
        `}
    </div>
    ${
      totalVisibleCount
        ? `
          <div class="odc-product-grid__footer">
            <p class="odc-product-grid__count">${visibleItems.length} / ${totalVisibleCount} produit${totalVisibleCount > 1 ? "s" : ""} affiché${visibleItems.length > 1 ? "s" : ""}</p>
            ${
              visibleItems.length < totalVisibleCount
                ? `<button class="odc-product-grid__more" type="button" data-odc-load-more-products>Voir plus</button>`
                : ""
            }
          </div>
        `
        : ""
    }
  `;

  return layout;
}

function bindProductGridFavoriteInteractions(state) {
  if (state.root.dataset.odcFavoritesRenderBound !== "true") {
    state.root.dataset.odcFavoritesRenderBound = "true";
    window.addEventListener(FAVORITES_CHANGE_EVENT, () => {
      state.renderProductGrid?.();
    });
    document.addEventListener(PRODUCT_STATUS_CHANGE_EVENT, () => {
      state.renderProductGrid?.();
    });
    window.addEventListener(PROFESSIONAL_AUTH_EVENT, () => {
      state.renderProductGrid?.();
    });
  }

  if (state.root.dataset.odcFavoriteClickBound === "true") {
    return;
  }

  state.root.dataset.odcFavoriteClickBound = "true";
  state.root.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const favoriteButton = target?.closest("[data-odc-card-favorite]");
    if (!(favoriteButton instanceof HTMLButtonElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const selectionKey = favoriteButton.getAttribute("data-odc-card-favorite") || "";
    if (!selectionKey || favoriteButton.disabled) {
      return;
    }

    if (!(await requestProfessionalFavoriteAccess(selectionKey))) {
      return;
    }

    favoriteButton.disabled = true;
    toggleFavoriteProduct(selectionKey)
      .catch(() => {})
      .finally(() => {
        favoriteButton.disabled = false;
      });
  });
}

function enableProductTypeFilter(state) {
  const navAndFilters = state.root.querySelector(".product-list-nav-and-filters");

  if (!navAndFilters) {
    state.renderProductGrid = () => renderCustomProductGrid(state);
    state.renderProductGrid();
    ensureProductGridImageFallback(state);
    bindProductGridFavoriteInteractions(state);
    return;
  }

  navAndFilters.dataset.odcBrandFilterReady = "true";

  let mount = navAndFilters.querySelector(".odc-product-brand-filter-mount");
  if (!mount) {
    mount = document.createElement("div");
    mount.className = "odc-product-brand-filter-mount";
    navAndFilters.prepend(mount);
  }

  const render = () => {
    state.itemsByType = state.selectedType
      ? getFilteredProductItems(state.items, state.selectedType, "")
      : state.items;
    state.availableSubtypes =
      state.selectedType === "tissu" ? getAvailableProductSubtypes(state.itemsByType) : [];
    state.itemsBySubtype = new Map();
    state.itemsByType.forEach((item) => {
      const key = slugifyFilterKey(getProductSubtypeLabel(item));
      if (!key) {
        return;
      }
      state.itemsBySubtype.set(key, (state.itemsBySubtype.get(key) || 0) + getDisplayCountForProduct(item));
    });
    if (state.selectedType !== "tissu") {
      state.selectedSubtype = "";
    }
    if (state.selectedSubtype && !state.availableSubtypes.some((item) => slugifyFilterKey(item) === state.selectedSubtype)) {
      state.selectedSubtype = "";
    }
    state.filteredItems = getFilteredProductItems(state.items, state.selectedType, state.selectedSubtype);
    mount.innerHTML = buildProductTypeFilterMarkup(state);
    renderCustomProductGrid(state);
  };

  state.renderProductGrid = render;

  render();
  ensureProductGridImageFallback(state);
  bindProductGridFavoriteInteractions(state);

  if (navAndFilters.dataset.odcBrandFilterViewportBound !== "true") {
    navAndFilters.dataset.odcBrandFilterViewportBound = "true";
    let wasMobileViewport = window.matchMedia("(max-width: 640px)").matches;
    window.addEventListener("resize", () => {
      const isMobileViewport = window.matchMedia("(max-width: 640px)").matches;
      if (isMobileViewport === wasMobileViewport) {
        return;
      }
      wasMobileViewport = isMobileViewport;
      render();
    });
  }

  if (navAndFilters.dataset.odcBrandFilterBound === "true") {
    return;
  }

  navAndFilters.dataset.odcBrandFilterBound = "true";
  state.root.addEventListener("click", (event) => {
    const loadMoreTarget = event.target instanceof Element ? event.target.closest("[data-odc-load-more-products]") : null;
    const target = event.target instanceof Element ? event.target.closest("[data-odc-type-filter]") : null;
    const subtypeTarget = event.target instanceof Element ? event.target.closest("[data-odc-subtype-filter]") : null;

    if (loadMoreTarget) {
      event.preventDefault();
      state.visibleProductLimit = (state.visibleProductLimit || PRODUCT_GRID_INITIAL_LIMIT) + PRODUCT_GRID_LOAD_MORE_STEP;
      render();
      return;
    }

    if (subtypeTarget) {
      event.preventDefault();
      state.selectedSubtype = slugifyFilterKey(subtypeTarget.getAttribute("data-odc-subtype-filter") || "");
      state.visibleProductLimit = PRODUCT_GRID_INITIAL_LIMIT;
      updateProductTypeFilterInLocation(state.selectedType, state.selectedSubtype);
      render();
      return;
    }

    if (!target) {
      return;
    }

    event.preventDefault();
    state.selectedType = slugifyFilterKey(target.getAttribute("data-odc-type-filter") || "");
    state.selectedSubtype = "";
    state.visibleProductLimit = PRODUCT_GRID_INITIAL_LIMIT;
    updateProductTypeFilterInLocation(state.selectedType, state.selectedSubtype);
    render();
  });

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

function toggleProductCardSecondaryImage(card) {
  if (!(card instanceof HTMLElement) || !card.classList.contains("has-secondary-image")) {
    return;
  }

  const secondaryImage = card.querySelector(".odc-product-card__image--secondary[data-secondary-src]");
  if (secondaryImage instanceof HTMLImageElement && !secondaryImage.src) {
    const secondarySrc = secondaryImage.dataset.secondarySrc;
    if (secondarySrc) {
      secondaryImage.src = secondarySrc;
    }
  }

  const nextExpanded = !card.classList.contains("is-showing-secondary-image");
  card.classList.toggle("is-showing-secondary-image", nextExpanded);
  const quickViewButton = card.querySelector(".odc-product-card__quick-view");
  if (quickViewButton instanceof HTMLButtonElement) {
    quickViewButton.setAttribute("aria-pressed", nextExpanded ? "true" : "false");
    quickViewButton.textContent = nextExpanded ? "Vue globale" : "Vue rapide";
  }
}

function ensureProductGridImageFallback(state) {
  if (state.root.dataset.odcProductGridImageFallbackBound === "true") {
    return;
  }

  state.root.dataset.odcProductGridImageFallbackBound = "true";
  state.root.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) {
        return;
      }

      const fallbackSrc = image.dataset.fallbackSrc;
      if (!fallbackSrc || image.dataset.fallbackApplied === "true" || image.src === fallbackSrc) {
        return;
      }

      image.dataset.fallbackApplied = "true";
      image.src = fallbackSrc;
    },
    true
  );
}

function sanitizeProductDescription(description) {
  return getDecodedProductDescription({ description }, true);
}

const productDiscoveryImagePreloadCache = new Map();

function preloadProductDiscoveryImage(src) {
  if (!src) {
    return null;
  }

  if (productDiscoveryImagePreloadCache.has(src)) {
    return productDiscoveryImagePreloadCache.get(src);
  }

  const image = new Image();
  image.decoding = "async";
  image.src = src;
  productDiscoveryImagePreloadCache.set(src, image);
  return image;
}

function updateProductDiscoveryThumbs(thumbs, images, imageIndex) {
  if (!(thumbs instanceof HTMLElement)) {
    return;
  }

  const signature = images.map((image) => image.assetUrl).join("|");
  if (thumbs.dataset.odcThumbsSignature !== signature) {
    thumbs.dataset.odcThumbsSignature = signature;
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
    return;
  }

  thumbs.querySelectorAll(".odc-product-discovery__thumb").forEach((thumb, index) => {
    thumb.classList.toggle("is-active", index === imageIndex);
  });
}

function renderProductDiscoveryImage(state, overlay, product) {
  const colorway = getProductActiveColorway(product, state.currentColorwayIndex);
  const images = getProductImages(product, colorway);
  const imageIndex = Math.max(0, Math.min(state.currentImageIndex, images.length - 1));
  state.currentImageIndex = imageIndex;

  const stageImage = overlay.querySelector(".odc-product-discovery__image");
  const thumbs = overlay.querySelector(".odc-product-discovery__thumbs");
  const current = images[imageIndex];
  const previous = images[(imageIndex - 1 + images.length) % images.length];
  const next = images[(imageIndex + 1) % images.length];

  if (stageImage && current) {
    if (stageImage.getAttribute("src") !== current.assetUrl) {
      preloadProductDiscoveryImage(current.assetUrl);
      stageImage.src = current.assetUrl;
    }
    stageImage.alt = colorway ? `${product.title} ${colorway.label}` : product.title;
  }

  preloadProductDiscoveryImage(previous?.assetUrl);
  preloadProductDiscoveryImage(next?.assetUrl);

  const imageWrap = overlay.querySelector(".odc-product-discovery__image-wrap");
  if (imageWrap instanceof HTMLElement) {
    imageWrap.classList.remove("is-zoomed");
    imageWrap.style.setProperty("--odc-zoom-x", "50%");
    imageWrap.style.setProperty("--odc-zoom-y", "50%");
  }

  updateProductDiscoveryThumbs(thumbs, images, imageIndex);

  overlay
    .querySelectorAll("[data-odc-image-nav]")
    .forEach((button) => {
      button.disabled = images.length <= 1;
    });
}

function syncProductDiscoveryColorwayViewport(state, overlay) {
  const strip = overlay.querySelector("[data-odc-colorways-strip]");

  if (!(strip instanceof HTMLElement)) {
    return;
  }

  const targetIndex = Math.max(
    0,
    state.currentColorwayPage * PRODUCT_COLORWAYS_PER_PAGE,
    state.currentColorwayIndex
  );
  const target =
    strip.querySelector(`[data-odc-colorway-index="${targetIndex}"]`) ||
    strip.querySelector(`[data-odc-colorway-index="${state.currentColorwayIndex}"]`);

  if (!(target instanceof HTMLElement)) {
    return;
  }

  strip.scrollTo({
    left: Math.max(0, target.offsetLeft - strip.offsetLeft),
    behavior: "auto"
  });
}

function isMobileProductDiscoveryViewport() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function renderProductDiscovery(state, overlay) {
  const product = state.items[state.currentIndex];
  const colorway = getProductActiveColorway(product, state.currentColorwayIndex);

  if (!product) {
    return;
  }

  const title = overlay.querySelector(".odc-product-discovery__title");
  const colorwaysNode = overlay.querySelector(".odc-product-discovery__colorways");
  const description = overlay.querySelector(".odc-product-discovery__description");
  const details = overlay.querySelector(".odc-product-discovery__details");
  const link = overlay.querySelector(".odc-product-discovery__link");
  const eyebrow = overlay.querySelector(".odc-product-discovery__eyebrow");
  const priceNode = overlay.querySelector(".odc-product-discovery__price");
  const favoriteButton = overlay.querySelector("[data-odc-favorite-request]");
  const professionalState = getProfessionalState();
  const activeSelectionKey = getProductSelectionKey(product, colorway);

  if (title) {
    title.textContent = product.title || "";
  }

  if (colorwaysNode) {
    const colorways = getProductColorways(product);
    const totalPages = Math.max(1, Math.ceil(colorways.length / PRODUCT_COLORWAYS_PER_PAGE));
    const currentPage = Math.max(0, Math.min(state.currentColorwayPage, totalPages - 1));
    const isMobileViewport = isMobileProductDiscoveryViewport();
    const visibleColorways = isMobileViewport
      ? colorways
      : colorways.slice(
          currentPage * PRODUCT_COLORWAYS_PER_PAGE,
          (currentPage + 1) * PRODUCT_COLORWAYS_PER_PAGE
        );
    state.currentColorwayPage = currentPage;
    colorwaysNode.innerHTML = colorways.length
      ? `
          <div class="odc-product-colorways__group">
            <p class="odc-product-colorways__label">Coloris disponibles</p>
            <div class="odc-product-colorways" data-odc-colorways-strip>
            ${visibleColorways
              .map(
                (item, index) => {
                  const absoluteIndex = isMobileViewport
                    ? index
                    : currentPage * PRODUCT_COLORWAYS_PER_PAGE + index;
                  return `
                  <button
                    class="odc-product-colorways__button ${absoluteIndex === state.currentColorwayIndex ? "is-active" : ""}"
                    type="button"
                    data-odc-colorway-index="${absoluteIndex}"
                    aria-pressed="${absoluteIndex === state.currentColorwayIndex ? "true" : "false"}"
                  >
                    <span class="odc-product-colorways__media">
                      ${
                        getProductColorwayPreviewImage(item)?.assetUrl
                          ? `<img src="${escapeHtml(getProductColorwayPreviewImage(item).assetUrl)}" alt="${escapeHtml(`${product.title} ${item.label}`)}" loading="lazy">`
                          : ""
                      }
                    </span>
                  </button>
                `;
                }
              )
              .join("")}
            </div>
            <div class="odc-product-colorways__pager" ${isMobileViewport ? "hidden" : ""}>
              <button class="odc-product-colorways__pager-button" type="button" data-odc-colorway-page="prev" ${currentPage === 0 ? "disabled" : ""}>Prec</button>
              <span class="odc-product-colorways__pager-label">${currentPage + 1} / ${totalPages}</span>
              <button class="odc-product-colorways__pager-button" type="button" data-odc-colorway-page="next" ${currentPage === totalPages - 1 ? "disabled" : ""}>Suiv</button>
            </div>
          </div>
        `
      : "";

    if (isMobileViewport) {
      syncProductDiscoveryColorwayViewport(state, overlay);
    }
  }

  if (description) {
    description.innerHTML = sanitizeProductDescription(getProductResolvedDescription(product, colorway));
  }

  if (link) {
    const resolvedUrl = new URL(getProductDetailHref(product, colorway), window.location.origin).toString();
    link.dataset.odcTargetHref = resolvedUrl;
  }

  if (priceNode) {
    const activePrice = getProductActivePrice(product, colorway);
    priceNode.innerHTML =
      professionalState.authenticated
        ? activePrice
          ? `<strong>${formatMoney(activePrice)}</strong>${product.onSale && product.price ? `<span>${formatMoney(product.price)}</span>` : ""}`
          : "<strong>Prix sur demande</strong>"
        : "";
  }

  if (eyebrow) {
    eyebrow.textContent = colorway?.sku || (product.onSale ? "Produit en promotion" : "Collection");
  }

  if (details) {
    const summary = [];

    summary.push(getProductAvailabilityLabel(product, colorway));

    details.innerHTML = summary.map((item) => `<span>${item}</span>`).join("");
  }

  if (favoriteButton instanceof HTMLButtonElement) {
    const isFavorite = hasFavoriteProduct(activeSelectionKey);
    favoriteButton.innerHTML = favoriteIconMarkup(isFavorite);
    favoriteButton.setAttribute("aria-label", isFavorite ? "Retirer des favoris" : "Ajouter aux favoris");
    favoriteButton.setAttribute("aria-pressed", isFavorite ? "true" : "false");
  }

  renderProductDiscoveryImage(state, overlay, product);

  overlay
    .querySelectorAll("[data-odc-product-nav]")
    .forEach((button) => {
      button.disabled = state.items.length <= 1;
    });
}

function stepProductDiscoveryColorwayPage(state, overlay, direction) {
  const product = state.items[state.currentIndex];

  if (!product) {
    return;
  }

  const totalPages = Math.max(1, Math.ceil(getProductColorways(product).length / PRODUCT_COLORWAYS_PER_PAGE));
  const nextPage =
    direction < 0
      ? Math.max(0, state.currentColorwayPage - 1)
      : Math.min(totalPages - 1, state.currentColorwayPage + 1);

  if (nextPage === state.currentColorwayPage) {
    return;
  }

  state.currentColorwayPage = nextPage;
  renderProductDiscovery(state, overlay);
}

function stepProductDiscoveryImage(state, overlay, direction) {
  const product = state.items[state.currentIndex];

  if (!product) {
    return;
  }

  const total = getProductImages(product, getProductActiveColorway(product, state.currentColorwayIndex)).length;
  if (total <= 1) {
    return;
  }

  state.currentImageIndex = (state.currentImageIndex + direction + total) % total;
  renderProductDiscoveryImage(state, overlay, product);
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
  state.currentColorwayIndex = 0;
  state.currentColorwayPage = 0;
  state.currentImageIndex = 0;
  state.activeTrigger = null;
  state.isAnimating = false;
}

async function openProductDiscovery(state, overlay, index, trigger, colorwayIndex = 0) {
  if (index < 0 || index >= state.items.length) {
    return;
  }

  if (!(await requestProfessionalProductAccess())) {
    return;
  }

  state.currentIndex = index;
  state.currentColorwayIndex = Math.max(0, colorwayIndex);
  state.currentColorwayPage = Math.floor(Math.max(0, colorwayIndex) / PRODUCT_COLORWAYS_PER_PAGE);
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
  const colorwaySwipe = {
    identifier: null,
    startX: 0,
    startY: 0,
    active: false
  };
  const imageSwipe = {
    identifier: null,
    startX: 0,
    startY: 0,
    active: false
  };
  const setProductDiscoveryZoom = (imageWrap, clientX, clientY) => {
    if (!(imageWrap instanceof HTMLElement)) {
      return;
    }

    const rect = imageWrap.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    imageWrap.style.setProperty("--odc-zoom-x", `${Math.max(0, Math.min(100, x))}%`);
    imageWrap.style.setProperty("--odc-zoom-y", `${Math.max(0, Math.min(100, y))}%`);
    imageWrap.classList.add("is-zoomed");
    imageWrap.querySelector(".odc-product-discovery__image")?.style.setProperty("transform", "scale(3.2)");
  };
  const resetProductDiscoveryZoom = (imageWrap) => {
    if (!(imageWrap instanceof HTMLElement)) {
      return;
    }

    imageWrap.classList.remove("is-zoomed");
    imageWrap.style.setProperty("--odc-zoom-x", "50%");
    imageWrap.style.setProperty("--odc-zoom-y", "50%");
    imageWrap.querySelector(".odc-product-discovery__image")?.style.removeProperty("transform");
  };
  enableProductTypeFilter(state);

  const openFromElement = (element) => {
    const card = element?.closest(".odc-product-card, .product-list-item");
    const indexValue =
      element?.getAttribute("data-product-index") ||
      card?.getAttribute("data-product-index");
    const colorwayIndexValue =
      element?.getAttribute("data-colorway-index") ||
      card?.getAttribute("data-colorway-index") ||
      "0";
    const index = Number.parseInt(indexValue || "", 10);
    const colorwayIndex = Number.parseInt(colorwayIndexValue || "0", 10);

    if (!Number.isInteger(index) || index < 0 || index >= state.items.length) {
      return;
    }

    openProductDiscovery(state, overlay, index, element, Number.isInteger(colorwayIndex) ? colorwayIndex : 0);
  };

  state.root.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const quickViewButton = target.closest(".odc-product-card__quick-view");
    if (quickViewButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleProductCardSecondaryImage(quickViewButton.closest(".odc-product-card"));
      return;
    }

    const opener = target.closest(".odc-product-card__open");
    if (!opener) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openFromElement(opener);
  }, true);

  overlay.addEventListener("mousemove", (event) => {
    if (!overlay.classList.contains("is-open")) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const imageWrap = target?.closest(".odc-product-discovery__image-wrap");

    if (!(imageWrap instanceof HTMLElement) || window.matchMedia("(hover: none)").matches) {
      return;
    }
    setProductDiscoveryZoom(imageWrap, event.clientX, event.clientY);
  });

  overlay.addEventListener("mouseleave", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const imageWrap = target?.closest(".odc-product-discovery__image-wrap");

    if (!(imageWrap instanceof HTMLElement) || window.matchMedia("(hover: none)").matches) {
      return;
    }

    resetProductDiscoveryZoom(imageWrap);
  }, true);

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

  document.addEventListener("click", async (event) => {
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
      if (!(await requestProfessionalProductAccess(href || "/produits"))) {
        return;
      }
      if (href) {
        window.location.assign(href);
      }
      return;
    }

    const favoriteRequest = target.closest("[data-odc-favorite-request]");
    if (favoriteRequest && overlay.classList.contains("is-open")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const product = state.items[state.currentIndex];
      const colorway = getProductActiveColorway(product, state.currentColorwayIndex);
      const selectionKey = getProductSelectionKey(product, colorway);

      if (selectionKey) {
        if (!(await requestProfessionalFavoriteAccess(selectionKey))) {
          return;
        }

        toggleFavoriteProduct(selectionKey)
          .then(() => renderProductDiscovery(state, overlay))
          .catch((error) => console.error(error));
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

    const colorwayButton = target.closest("[data-odc-colorway-index]");
    if (colorwayButton && overlay.classList.contains("is-open")) {
      const index = Number(colorwayButton.getAttribute("data-odc-colorway-index"));
      if (Number.isInteger(index)) {
        state.currentColorwayIndex = index;
        state.currentColorwayPage = Math.floor(index / PRODUCT_COLORWAYS_PER_PAGE);
        state.currentImageIndex = 0;
        renderProductDiscovery(state, overlay);
      }
      return;
    }

    const colorwayPageButton = target.closest("[data-odc-colorway-page]");
    if (colorwayPageButton && overlay.classList.contains("is-open")) {
      const direction = colorwayPageButton.getAttribute("data-odc-colorway-page");
      if (direction === "prev") {
        stepProductDiscoveryColorwayPage(state, overlay, -1);
      } else if (direction === "next") {
        stepProductDiscoveryColorwayPage(state, overlay, 1);
      }
      return;
    }

    const imageNav = target.closest("[data-odc-image-nav]");
    if (imageNav && overlay.classList.contains("is-open")) {
      const direction = imageNav.getAttribute("data-odc-image-nav") === "next" ? 1 : -1;
      stepProductDiscoveryImage(state, overlay, direction);
      return;
    }

    const productNav = target.closest("[data-odc-product-nav]");
    if (productNav && overlay.classList.contains("is-open")) {
      const direction = productNav.getAttribute("data-odc-product-nav") === "next" ? 1 : -1;
      const nextIndex = (state.currentIndex + direction + state.items.length) % state.items.length;
      state.currentColorwayIndex = 0;
      state.currentColorwayPage = 0;
      state.currentImageIndex = 0;
      state.currentIndex = nextIndex;
      renderProductDiscovery(state, overlay);
      return;
    }
  }, true);

  overlay.addEventListener("touchstart", (event) => {
    if (!overlay.classList.contains("is-open") || event.touches.length !== 1) {
      colorwaySwipe.active = false;
      imageSwipe.active = false;
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const touch = event.touches[0];

    if (target?.closest(".odc-product-discovery__colorways")) {
      colorwaySwipe.identifier = touch.identifier;
      colorwaySwipe.startX = touch.clientX;
      colorwaySwipe.startY = touch.clientY;
      colorwaySwipe.active = true;
      imageSwipe.active = false;
      return;
    }

    colorwaySwipe.active = false;

    if (target?.closest(".odc-product-discovery__stage, .odc-product-discovery__image-wrap")) {
      imageSwipe.identifier = touch.identifier;
      imageSwipe.startX = touch.clientX;
      imageSwipe.startY = touch.clientY;
      imageSwipe.active = true;
      return;
    }

    imageSwipe.active = false;
  }, { passive: true });

  overlay.addEventListener("touchend", (event) => {
    if (!overlay.classList.contains("is-open")) {
      return;
    }

    if (colorwaySwipe.active) {
      colorwaySwipe.active = false;
      const touch = [...event.changedTouches].find((item) => item.identifier === colorwaySwipe.identifier);

      if (touch) {
        const deltaX = touch.clientX - colorwaySwipe.startX;
        const deltaY = touch.clientY - colorwaySwipe.startY;

        if (
          !window.matchMedia("(max-width: 640px)").matches &&
          Math.abs(deltaX) >= PRODUCT_COLORWAY_SWIPE_THRESHOLD &&
          Math.abs(deltaX) > Math.abs(deltaY)
        ) {
          stepProductDiscoveryColorwayPage(state, overlay, deltaX < 0 ? 1 : -1);
          return;
        }
      }
    }

    if (imageSwipe.active) {
      imageSwipe.active = false;
      const touch = [...event.changedTouches].find((item) => item.identifier === imageSwipe.identifier);

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - imageSwipe.startX;
      const deltaY = touch.clientY - imageSwipe.startY;
      const imageWrap = event.target instanceof Element ? event.target.closest(".odc-product-discovery__image-wrap") : null;

      if (imageWrap instanceof HTMLElement && Math.abs(deltaX) < PRODUCT_IMAGE_SWIPE_THRESHOLD && Math.abs(deltaY) < PRODUCT_IMAGE_SWIPE_THRESHOLD) {
        event.preventDefault();
        if (imageWrap.classList.contains("is-zoomed")) {
          resetProductDiscoveryZoom(imageWrap);
        } else {
          setProductDiscoveryZoom(imageWrap, touch.clientX, touch.clientY);
        }
        return;
      }

      if (Math.abs(deltaX) < PRODUCT_IMAGE_SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      stepProductDiscoveryImage(state, overlay, deltaX < 0 ? 1 : -1);
    }
  }, { passive: false });

  overlay.addEventListener("touchmove", (event) => {
    if (!overlay.classList.contains("is-open") || event.touches.length !== 1) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const imageWrap = target?.closest(".odc-product-discovery__image-wrap");

    if (!(imageWrap instanceof HTMLElement) || !imageWrap.classList.contains("is-zoomed")) {
      return;
    }

    const touch = event.touches[0];
    setProductDiscoveryZoom(imageWrap, touch.clientX, touch.clientY);
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      closeProductDiscovery(state, overlay);
    }

    if (event.key === "ArrowRight") {
      stepProductDiscoveryImage(state, overlay, 1);
    }

    if (event.key === "ArrowLeft") {
      stepProductDiscoveryImage(state, overlay, -1);
    }
  });

  window.addEventListener(PROFESSIONAL_AUTH_EVENT, () => {
    if (overlay.classList.contains("is-open")) {
      renderProductDiscovery(state, overlay);
    }
    renderCustomProductGrid(state);
  });
}

function isProductDetailPath() {
  return window.location.pathname === "/product.html" ||
    /^\/produits\/p\/[^/]+\/?$/.test(window.location.pathname) ||
    /^\/produits\/p\/[^/]+\.html$/.test(window.location.pathname);
}

function getProductDetailTarget() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("product") || "";
  const colorwayId = params.get("colorway") || "";

  if (window.location.pathname === "/product.html") {
    const product = getProductCatalogItemById(productId);
    return product ? { product, colorwayId } : null;
  }

  const product = getProductCatalogItemForPath(window.location.pathname);
  if (!product) {
    return null;
  }

  return { product, colorwayId };
}

function buildLocalProductDetailMarkup(product, state) {
  const colorway = getProductActiveColorway(product, state.currentColorwayIndex);
  const images = getProductImages(product, colorway);
  const activePrice = getProductActivePrice(product, colorway);
  const activeImage = images[state.currentImageIndex] || images[0] || getProductMainImage(product, colorway);
  const description = getDecodedProductDescription({ description: getProductResolvedDescription(product, colorway) }, false);
  const descriptionDesktop = description
    ? `<div class="product-description hidden-down-md">${description}</div>`
    : "";
  const descriptionMobile = description
    ? `<div class="product-description hidden-up-md product-description-spacing-mobile">${description}</div>`
    : "";
  const detailColorwaysMarkup = getProductColorways(product).length
    ? `
        <div class="odc-product-colorways__group odc-product-colorways__group--detail">
          <p class="odc-product-colorways__label">Coloris disponibles</p>
          <div class="odc-product-colorways odc-product-colorways--detail">
            ${getProductColorways(product)
              .map(
                (item, index) => `
                  <button
                    class="odc-product-colorways__button ${index === state.currentColorwayIndex ? "is-active" : ""}"
                    type="button"
                    data-odc-detail-colorway-index="${index}"
                    aria-pressed="${index === state.currentColorwayIndex ? "true" : "false"}"
                  >
                    <span class="odc-product-colorways__media">
                      ${
                        getProductColorwayPreviewImage(item)?.assetUrl
                          ? `<img src="${escapeHtml(getProductColorwayPreviewImage(item).assetUrl)}" alt="${escapeHtml(`${product.title} ${item.label}`)}" loading="lazy">`
                          : ""
                      }
                    </span>
                    <span class="odc-product-colorways__meta">
                      <span class="odc-product-colorways__name">${escapeHtml(item.label)}</span>
                      <span class="odc-product-colorways__code">${escapeHtml(item.sku || "")}</span>
                    </span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="odc-product-colorways__sku">${escapeHtml(colorway?.sku || "")}</div>
      `
    : "";
  const productPriceMarkup = activePrice
    ? `
          <div class="product-price">
            <strong>${formatMoney(activePrice)}</strong>
            ${product.onSale && product.price ? `<span>${formatMoney(product.price)}</span>` : ""}
          </div>
        `
    : `
          <div class="product-price">
            <strong>Prix sur demande</strong>
          </div>
        `;
  const productPurchaseMarkup = `
        <div class="product-add-to-cart">
          <div class="product-add-to-cart-layout-wrapper">
            <div class="product-purchase-controls-wrapper">
              <div class="odc-local-product-detail__availability ${isProductSelectionUnavailable(product, colorway) ? "is-unavailable" : ""}">
                ${escapeHtml(getProductAvailabilityLabel(product, colorway))}
              </div>
              ${activePrice
                ? `
                    <div class="sqs-site-style-form product-quantity-input-wrapper" data-animation-role="content">
                      <div class="form-item">
                        <div class="effects-positioning-wrapper">
                          <div class="product-quantity-input custom-form-element" role="group" aria-label="Quantity">
                            <button class="decrease-button" type="button" aria-label="Decrease quantity by 1" data-odc-quantity="decrease">
                              <span class="decrease-icon">
                                <svg fill="currentColor" height="17" viewBox="0 0 22 22" width="17" xmlns="http://www.w3.org/2000/svg">
                                  <path clip-rule="evenodd" d="M3 10v2h17v-2H3z" fill-rule="evenodd"></path>
                                </svg>
                              </span>
                            </button>
                            <input name="quantity-input" type="number" value="${state.quantity}" min="1" max="9999" size="4" autocomplete="off" data-odc-quantity-input>
                            <button class="increase-button" type="button" aria-label="Increase quantity by 1" data-odc-quantity="increase">
                              <span class="increase-icon">
                                <svg fill="currentColor" height="17" viewBox="0 0 22 22" width="17" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 3h-2v7H3v2h7v7h2v-7h7v-2h-7V3z"></path>
                                </svg>
                              </span>
                            </button>
                          </div>
                          <span class="form-input-effects" aria-hidden="true">
                            <span class="form-input-effects-border"></span>
                            <span class="form-input-effects-highlight form-field-highlight-single-trace"></span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="sqs-add-to-cart-button-wrapper product-add-to-cart-button-wrapper" data-animation-role="button">
                      <button class="sqs-add-to-cart-button sqs-suppress-edit-mode sqs-editable-button sqs-button-element--primary" type="button" data-odc-add-to-cart>
                        <div class="sqs-add-to-cart-button-inner">
                          <span class="add-to-cart-text">Add To Cart</span>
                          <span class="cart-loader"></span>
                          <span class="cart-added-text">Added!</span>
                        </div>
                      </button>
                    </div>
                  `
                : ""}
              <div class="odc-local-product-detail__actions">
                <button class="odc-local-product-detail__contact-button" type="button" data-odc-detail-contact>Nous contacter</button>
              </div>
            </div>
          </div>
        </div>
      `;

  return `
    <div
      class="odc-local-product-detail"
      data-product-detail-layout="simple"
      data-section-width="full"
      data-gallery-placement="left"
      data-gallery-design="slideshow"
      data-gallery-thumbnail-placement="side"
      style="--product-gallery-arrow-size: 2vw;--product-gallery-aspect-ratio: 1 / 1;--product-gallery-width: 50%;--product-content-horizontal-spacing: 4vw;--product-content-form-width: 50%;"
    >
      <nav class="product-nav" data-animation-role="content">
        <a href="/produits" class="product-nav-breadcrumb-link">Produits</a>
        <span>&rsaquo;</span>
        <a href="${getProductDetailHref(product, colorway)}" class="product-nav-breadcrumb-link">${escapeHtml(product.title)}</a>
      </nav>

      <div class="product-content-wrapper">
        <div class="odc-local-product-detail__gallery-column">
          <div class="odc-local-product-gallery" aria-label="Gallery">
            <div class="odc-local-product-gallery__thumbs-column">
              <div class="odc-local-product-gallery__thumbs" aria-label="Gallery thumbnails" role="group">
                ${images
                  .map(
                    (image, index) => `
                      <button
                        class="odc-local-product-gallery__thumb ${index === state.currentImageIndex ? "is-active" : ""}"
                        type="button"
                        aria-label="Image ${index + 1} of ${images.length}"
                        data-odc-detail-thumb-index="${index}"
                      >
                        <img
                          class="odc-local-product-gallery__thumb-image"
                          src="${image.assetUrl}"
                          alt=""
                        />
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>

            <div class="odc-local-product-gallery__stage">
              <div class="odc-local-product-gallery__controls">
                <button
                  class="odc-local-product-gallery__control odc-local-product-gallery__control--prev"
                  type="button"
                  aria-label="Previous"
                  data-odc-detail-nav="prev"
                  ${images.length <= 1 ? "disabled" : ""}
                ></button>
                <button
                  class="odc-local-product-gallery__control odc-local-product-gallery__control--next"
                  type="button"
                  aria-label="Next"
                  data-odc-detail-nav="next"
                  ${images.length <= 1 ? "disabled" : ""}
                ></button>
              </div>
              <button class="odc-local-product-detail__favorite" type="button" aria-label="Ajouter aux favoris" aria-pressed="false" data-odc-detail-favorite>
                ${favoriteIconMarkup(false)}
              </button>
              <div class="odc-local-product-gallery__frame">
                <img
                  class="odc-local-product-gallery__image"
                  src="${activeImage?.assetUrl || ""}"
                  alt="${escapeHtml(product.title)}"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
          ${detailColorwaysMarkup}
        </div>

        <div class="product-meta">
          <h1 class="product-title">${escapeHtml(product.title)}</h1>
          ${productPriceMarkup}

          ${descriptionDesktop}

          ${productPurchaseMarkup}

          ${descriptionMobile}
        </div>
      </div>
    </div>
  `;
}

function renderLocalProductDetail(root, product, state) {
  root.innerHTML = buildLocalProductDetailMarkup(product, state);
}

async function enableLocalProductDetail() {
  if (!isProductDetailPath()) {
    return;
  }

  const detailTarget = getProductDetailTarget();
  const product = detailTarget?.product || null;
  const root = document.querySelector(".product-detail");

  if (!product || !root || root.dataset.odcLocalDetailReady === "true") {
    return;
  }

  const professionalState = await ensureProfessionalSession().catch(() => getProfessionalState());

  if (!professionalState.authenticated) {
    root.dataset.odcLocalDetailReady = "true";
    root.innerHTML = `
      <section class="odc-product-access-wall" aria-live="polite">
        <p class="odc-product-access-wall__eyebrow">Accès réservé</p>
        <h1>Connectez-vous pour consulter cette fiche produit.</h1>
        <p>Les fiches détaillées, les coloris et les favoris sont accessibles après connexion.</p>
        <button class="odc-product-access-wall__button" type="button" data-product-access-login>Se connecter</button>
      </section>
    `;
    root.querySelector("[data-product-access-login]")?.addEventListener("click", () => {
      requestProfessionalProductAccess("", true);
    });
    requestProfessionalProductAccess("", true);
    return;
  }

  const initialColorwayIndex = Math.max(
    0,
    getProductColorways(product).findIndex((colorway) => colorway.id === detailTarget?.colorwayId)
  );

  const state = {
    currentColorwayIndex: initialColorwayIndex,
    currentImageIndex: Math.max(
      0,
      getProductImages(product, getProductActiveColorway(product, initialColorwayIndex)).findIndex(
        (image) => image.assetUrl === getProductMainImage(product, getProductActiveColorway(product, initialColorwayIndex))?.assetUrl
      )
    ),
    quantity: 1
  };

  if (state.currentImageIndex < 0) {
    state.currentImageIndex = 0;
  }

  root.dataset.odcLocalDetailReady = "true";
  root.removeAttribute("data-controller");
  root.removeAttribute("data-context");
  root.setAttribute("data-product-id", product.id);
  document.title = `${product.title} — Odyssée`;

  const setLocalDetailZoom = (imageWrap, clientX, clientY) => {
    if (!(imageWrap instanceof HTMLElement)) {
      return;
    }

    const rect = imageWrap.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    imageWrap.style.setProperty("--odc-zoom-x", `${Math.max(0, Math.min(100, x))}%`);
    imageWrap.style.setProperty("--odc-zoom-y", `${Math.max(0, Math.min(100, y))}%`);
    imageWrap.classList.add("is-zoomed");
    imageWrap.querySelector(".odc-local-product-gallery__image")?.style.setProperty("transform", "scale(3.2)");
  };

  const resetLocalDetailZoom = (imageWrap) => {
    if (!(imageWrap instanceof HTMLElement)) {
      return;
    }

    imageWrap.classList.remove("is-zoomed");
    imageWrap.style.setProperty("--odc-zoom-x", "50%");
    imageWrap.style.setProperty("--odc-zoom-y", "50%");
    imageWrap.querySelector(".odc-local-product-gallery__image")?.style.removeProperty("transform");
  };

  const syncProfessionalProductDetail = () => {
    renderLocalProductDetail(root, product, state);
    const favoriteButton = root.querySelector("[data-odc-detail-favorite]");
    const activeColorway = getProductActiveColorway(product, state.currentColorwayIndex);
    const activeSelectionKey = getProductSelectionKey(product, activeColorway);

    if (favoriteButton instanceof HTMLButtonElement) {
      const isFavorite = hasFavoriteProduct(activeSelectionKey);
      favoriteButton.innerHTML = favoriteIconMarkup(isFavorite);
      favoriteButton.setAttribute("aria-label", isFavorite ? "Retirer des favoris" : "Ajouter aux favoris");
      favoriteButton.setAttribute("aria-pressed", isFavorite ? "true" : "false");
    }
  };

  syncProfessionalProductDetail();

  root.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) {
      return;
    }

    const thumb = target.closest("[data-odc-detail-thumb-index]");
    if (thumb) {
      event.preventDefault();
      const index = Number.parseInt(thumb.getAttribute("data-odc-detail-thumb-index") || "", 10);
      if (Number.isInteger(index)) {
        state.currentImageIndex = index;
        syncProfessionalProductDetail();
      }
      return;
    }

    const colorwayButton = target.closest("[data-odc-detail-colorway-index]");
    if (colorwayButton) {
      event.preventDefault();
      const index = Number.parseInt(colorwayButton.getAttribute("data-odc-detail-colorway-index") || "", 10);
      if (Number.isInteger(index)) {
        state.currentColorwayIndex = index;
        state.currentImageIndex = 0;
        syncProfessionalProductDetail();
      }
      return;
    }

    const nav = target.closest("[data-odc-detail-nav]");
    if (nav) {
      event.preventDefault();
      const total = getProductImages(product, getProductActiveColorway(product, state.currentColorwayIndex)).length;
      if (total > 1) {
        const direction = nav.getAttribute("data-odc-detail-nav") === "next" ? 1 : -1;
        state.currentImageIndex = (state.currentImageIndex + direction + total) % total;
        syncProfessionalProductDetail();
      }
      return;
    }

    const quantityButton = target.closest("[data-odc-quantity]");
    if (quantityButton) {
      event.preventDefault();
      const direction = quantityButton.getAttribute("data-odc-quantity") === "increase" ? 1 : -1;
      state.quantity = Math.max(1, Math.min(9999, state.quantity + direction));
      const input = root.querySelector("[data-odc-quantity-input]");
      if (input instanceof HTMLInputElement) {
        input.value = String(state.quantity);
      }
      return;
    }

    const addToCart = target.closest("[data-odc-add-to-cart]");
    if (addToCart) {
      event.preventDefault();
      addCartLine({
        productId: product.id,
        variantId: product.firstInStockVariant?.id || product.variants?.[0]?.id || "",
        quantity: state.quantity
      });
      flashAddToCartState(addToCart);
      updateCartIndicators();
      return;
    }

    const favoriteButton = target.closest("[data-odc-detail-favorite]");
    if (favoriteButton) {
      event.preventDefault();
      const colorway = getProductActiveColorway(product, state.currentColorwayIndex);
      const selectionKey = getProductSelectionKey(product, colorway);
      if (!(await requestProfessionalFavoriteAccess(selectionKey))) {
        return;
      }

      toggleFavoriteProduct(selectionKey)
        .then(() => syncProfessionalProductDetail())
        .catch((error) => console.error(error));
      return;
    }

    const contactButton = target.closest("[data-odc-detail-contact]");
    if (contactButton) {
      event.preventDefault();
      document.querySelector("[data-contract-contact-open]")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      return;
    }

  });

  root.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;

    if (!target || target.getAttribute("data-odc-quantity-input") == null) {
      return;
    }

    const value = Number.parseInt(target.value || "", 10);
    state.quantity = Number.isFinite(value) ? Math.max(1, Math.min(9999, value)) : 1;
    target.value = String(state.quantity);
  });

  root.addEventListener("mousemove", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const imageWrap = target?.closest(".odc-local-product-gallery__frame");

    if (!(imageWrap instanceof HTMLElement) || window.matchMedia("(hover: none)").matches) {
      return;
    }

    setLocalDetailZoom(imageWrap, event.clientX, event.clientY);
  });

  root.addEventListener("mouseleave", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const imageWrap = target?.closest(".odc-local-product-gallery__frame");

    if (!(imageWrap instanceof HTMLElement) || window.matchMedia("(hover: none)").matches) {
      return;
    }

    resetLocalDetailZoom(imageWrap);
  }, true);

  root.addEventListener("touchend", (event) => {
    if (!window.matchMedia("(hover: none)").matches || event.changedTouches.length !== 1) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const imageWrap = target?.closest(".odc-local-product-gallery__frame");

    if (!(imageWrap instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    const touch = event.changedTouches[0];

    if (imageWrap.classList.contains("is-zoomed")) {
      resetLocalDetailZoom(imageWrap);
      return;
    }

    setLocalDetailZoom(imageWrap, touch.clientX, touch.clientY);
  }, { passive: false, capture: true });

  root.addEventListener("touchmove", (event) => {
    if (!window.matchMedia("(hover: none)").matches || event.touches.length !== 1) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const imageWrap = target?.closest(".odc-local-product-gallery__frame");

    if (!(imageWrap instanceof HTMLElement) || !imageWrap.classList.contains("is-zoomed")) {
      return;
    }

    const touch = event.touches[0];
    setLocalDetailZoom(imageWrap, touch.clientX, touch.clientY);
  }, { passive: true });

  window.addEventListener(PROFESSIONAL_AUTH_EVENT, syncProfessionalProductDetail);
  window.addEventListener(FAVORITES_CHANGE_EVENT, syncProfessionalProductDetail);
  document.addEventListener(PRODUCT_STATUS_CHANGE_EVENT, syncProfessionalProductDetail);
}

function initializeOdcSite() {
  loadProductStatusOverrides();
  updateCartIndicators();
  updateFavoriteIndicators();
  replaceFooter();
  replaceHomeHeroWithVideo();
  applyContractPageContent();
  replaceHomeMarqueeWithLogos();
  insertHomeShortcutCards();
  replaceHomeMosaicHeadline();
  replaceMarquesGridWithLogos();
  replaceShowroomsFacade();
  replaceShowroomsAccordion();
  enableAmbiancesCarousel();
  enableContractContactModal();
  normalizeProductCategoryLinks();
  enableProfessionalAuth();
  enableProductDiscoveryOverlay();
  enableLocalProductDetail();
  enableLocalCartPage();
  enableFavoritesPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeOdcSite, { once: true });
} else {
  initializeOdcSite();
}
