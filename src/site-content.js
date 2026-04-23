export const SITE_CONTENT_STORAGE_KEY = "odc-site-content-v1";

export const ADMIN_ASSET_OPTIONS = [
  { id: "sierra-cam-2", label: "SIERRA CAM 2", src: "/custom-assets/sierra-cam-2.jpg" },
  { id: "savannah-cam-5", label: "SAVANNAH CAM 5", src: "/custom-assets/savannah-cam-5.jpg" },
  { id: "savannah-cam-3", label: "SAVANNAH CAM 3", src: "/custom-assets/savannah-cam-3.jpg" },
  { id: "savannah-cam-9", label: "SAVANNAH CAM 9", src: "/custom-assets/savannah-cam-9.jpg" },
  { id: "contract-bed", label: "Contract Hotel Bed", src: "/custom-assets/contract-hotel-bed-66040964.jpg" },
  { id: "contract-hero", label: "Contract Hero", src: "/custom-assets/contract-hotel-bed-66040964.jpg" },
  { id: "wallpapers", label: "Papiers peints", src: "/custom-assets/chatgpt-image-2026-04-15-143127.png" },
  { id: "press-book", label: "Press Book", src: "/custom-assets/press-book-2026-04-15-144532.png" },
  { id: "showrooms", label: "Showrooms", src: "/custom-assets/showrooms-chatgpt-06042026-010433.png" },
  { id: "showrooms-facade-v2", label: "ODC Devanture v2", src: "/custom-assets/odc-devanture-v2.png" },
  { id: "logo-white", label: "Logo ODC White", src: "/custom-assets/logo-odc-white.png" }
];

export const DEFAULT_SITE_CONTENT = {
  assets: clone(ADMIN_ASSET_OPTIONS),
  products: {
    importLinks: []
  },
  home: {
    shortcuts: [
      { id: "catalogue", title: "Catalogue", href: "/produits/", image: "/custom-assets/sierra-cam-2.jpg" },
      { id: "ambiances", title: "Ambiances", href: "/ambiances/", image: "/custom-assets/savannah-cam-5.jpg" },
      { id: "contract", title: "Contract", href: "/contract/", image: "/custom-assets/contract-hotel-bed-66040964.jpg" },
      { id: "mood-boards", title: "Mood<br />Boards", href: "/mood-boards/", image: "/custom-assets/savannah-cam-3.jpg" },
      { id: "wallpapers", title: "Papiers<br />peints", href: "/produits/?type=papier-peint", image: "/custom-assets/chatgpt-image-2026-04-15-143127.png" },
      { id: "press-book", title: "Press<br />Book", href: "/press-book/", image: "/custom-assets/press-book-2026-04-15-144532.png" }
    ]
  },
  contract: {
    heroImage: "/custom-assets/contract-hotel-bed-66040964.jpg",
    heroLogo: "/custom-assets/odyssee-contract-white.png",
    heroTitle: "Contrats pour professionels",
    heroButtonLabel: "Nous contacter",
    copyTitle: "Contrats pour professionels",
    copyParagraphs: [
      "La protection contre l’incendie est un enjeu essentiel dans le secteur de l’hôtellerie et de la restauration. Un simple incident, comme une nappe qui s’enflamme ou des cendres de cigarette incandescentes sur un lit, peut rapidement dégénérer en catastrophe.",
      "Les éléments de décoration en Trevira CS offrent une solution efficace pour réduire ce risque, tout en préservant l’esthétique et le confort. Ces tissus innovants allient sécurité et élégance, répondant aux normes européennes les plus strictes en matière de protection incendie. Ainsi, vous garantissez à vos clients un environnement à la fois raffiné et sécurisé, sans compromis sur la qualité et l’ambiance de votre établissement."
    ],
    sideImage: "/custom-assets/contract-hotel-bed-66040964.jpg",
    actionLabels: {
      services: "Nos services",
      clients: "Nos client",
      contact: "Nous contacter"
    }
  },
  showrooms: {
    heroImage: "/custom-assets/showrooms-chatgpt-06042026-010433.png",
    cities: ["Casablanca", "Rabat", "Tanger"]
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeContent(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }

  if (base && typeof base === "object") {
    const output = { ...base };
    const source = override && typeof override === "object" ? override : {};

    Object.keys(base).forEach((key) => {
      output[key] = mergeContent(base[key], source[key]);
    });

    Object.keys(source).forEach((key) => {
      if (!(key in output)) {
        output[key] = source[key];
      }
    });

    return output;
  }

  return override ?? base;
}

export function loadSiteContent() {
  if (typeof window === "undefined") {
    return clone(DEFAULT_SITE_CONTENT);
  }

  try {
    const raw = window.localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (!raw) {
      return clone(DEFAULT_SITE_CONTENT);
    }

    const merged = mergeContent(clone(DEFAULT_SITE_CONTENT), JSON.parse(raw));
    if (merged.contract?.heroImage === "/custom-assets/contract-chatgpt-06042026-022226.png") {
      merged.contract.heroImage = "/custom-assets/contract-hotel-bed-66040964.jpg";
    }
    if (Array.isArray(merged.home?.shortcuts)) {
      merged.home.shortcuts = merged.home.shortcuts.map((item) => {
        if (item.id === "mood-boards") {
          return { ...item, href: "/mood-boards/" };
        }
        if (item.id === "wallpapers") {
          return { ...item, href: "/produits/?type=papier-peint" };
        }
        if (item.id === "press-book") {
          return { ...item, href: "/press-book/" };
        }
        return item;
      });
    }
    return merged;
  } catch {
    return clone(DEFAULT_SITE_CONTENT);
  }
}

export function saveSiteContent(content) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(content));
}

export function resetSiteContent() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SITE_CONTENT_STORAGE_KEY);
}
