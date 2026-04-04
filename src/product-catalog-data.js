function image(assetUrl, title = "") {
  return {
    title,
    originalSize: "834x834",
    assetUrl,
    mediaFocalPoint: {
      x: 0.5,
      y: 0.5,
      source: 3
    }
  };
}

function variant({ id, sku, price, salePrice }) {
  return {
    id,
    sku,
    price: {
      currency: "USD",
      value: price
    },
    ...(salePrice
      ? {
          salePrice: {
            currency: "USD",
            value: salePrice
          }
        }
      : {}),
    unlimited: true,
    qtyInStock: 0,
    soldOut: false,
    scarce: false,
    attributes: {}
  };
}

const products = [
  {
    id: "67929aba399b17595f2f1795",
    title: "1830 col. 09",
    fullUrl: "/produits/p/1830-col-01-d79r9",
    urlSlug: "1830-col-01-d79r9",
    price: { currency: "USD", value: "245.00" },
    soldOut: false,
    onSale: false,
    description:
      '&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Tissu obtenu à partir du traitement des résidus de production textile sans agents chimiques nocifs pour l\'homme et l\'environnement (REAC&nbsp;cl1).&lt;/p&gt;&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Ne pas utiliser de détergents contenant des agents oxydants ou éclaircissants.&lt;/p&gt;',
    variants: [variant({ id: "f6ab7e2b-ee36-43e3-889c-b31badca41e9", sku: "SQ1248762", price: "245.00" })],
    firstInStockVariant: variant({
      id: "f6ab7e2b-ee36-43e3-889c-b31badca41e9",
      sku: "SQ1248762",
      price: "245.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-f811cd2a-5899-4678-b631-78c84d5bfb3c-saba_1830_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-588baafd-10a1-4657-aad3-147ae13abf87-saba_1830_col.04.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-2df149c0-6599-4d37-a364-9342f59a2a54-saba_1830_col.02.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-56f71f82-ce72-4429-a2e8-147010c9612a-saba_1830_col.03.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-588baafd-10a1-4657-aad3-147ae13abf87-saba_1830_col.04.jpg",
      "1830 col. 09"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all", "recycl"]
  },
  {
    id: "67929a85f4658b422813cdfb",
    title: "2319 col. 12",
    fullUrl: "/produits/p/at192-col-16-xgkbt-z6y7l",
    urlSlug: "at192-col-16-xgkbt-z6y7l",
    price: { currency: "USD", value: "450.00" },
    salePrice: { currency: "USD", value: "320.00" },
    soldOut: false,
    onSale: true,
    description: "",
    variants: [
      variant({
        id: "84cf696e-ebc5-44ec-a12a-4b84596a2562",
        sku: "SQ4145854",
        price: "450.00",
        salePrice: "320.00"
      })
    ],
    firstInStockVariant: variant({
      id: "84cf696e-ebc5-44ec-a12a-4b84596a2562",
      sku: "SQ4145854",
      price: "450.00",
      salePrice: "320.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-7bcb165f-7b91-4958-af8f-9eac272ee39b-saba_at192_col.13.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-332de297-fee7-4c0a-9863-6793bcab54c2-saba_at192_col.16.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-442c1dc5-bcf9-4c0a-8dc2-65c011fe740c-saba_at192_col.14.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-e9571a75-83dd-4378-b112-fc84112ddfdb-saba_at192_col.03.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-79adb995-59c5-4fc7-b74b-52c313043a67-saba_at192_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-70a213a9-d248-4721-b53a-64b1ce9ccf0e-saba_at192_col.17.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-c15310e0-48a0-4658-8803-95c9d68f81f0-saba_at192_col.02.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-70a213a9-d248-4721-b53a-64b1ce9ccf0e-saba_at192_col.17.jpg",
      "2319 col. 12"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all", "lin"]
  },
  {
    id: "6792987f8cc47759d6486e12",
    title: "1830 col. 06",
    fullUrl: "/produits/p/1830-col-01-sj7b9",
    urlSlug: "1830-col-01-sj7b9",
    price: { currency: "USD", value: "245.00" },
    soldOut: false,
    onSale: false,
    description:
      '&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Tissu obtenu à partir du traitement des résidus de production textile sans agents chimiques nocifs pour l\'homme et l\'environnement (REAC&nbsp;cl1).&lt;/p&gt;&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Ne pas utiliser de détergents contenant des agents oxydants ou éclaircissants.&lt;/p&gt;',
    variants: [variant({ id: "7214de33-3763-4a09-b1d2-f420b7a0f500", sku: "SQ4872142", price: "245.00" })],
    firstInStockVariant: variant({
      id: "7214de33-3763-4a09-b1d2-f420b7a0f500",
      sku: "SQ4872142",
      price: "245.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-f811cd2a-5899-4678-b631-78c84d5bfb3c-saba_1830_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-588baafd-10a1-4657-aad3-147ae13abf87-saba_1830_col.04.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-2df149c0-6599-4d37-a364-9342f59a2a54-saba_1830_col.02.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-56f71f82-ce72-4429-a2e8-147010c9612a-saba_1830_col.03.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-2df149c0-6599-4d37-a364-9342f59a2a54-saba_1830_col.02.jpg",
      "1830 col. 06"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all"]
  },
  {
    id: "679298469fa4d3550f9f6abe",
    title: "2319 col. 17",
    fullUrl: "/produits/p/at192-col-16-xgkbt",
    urlSlug: "at192-col-16-xgkbt",
    price: { currency: "USD", value: "450.00" },
    salePrice: { currency: "USD", value: "320.00" },
    soldOut: false,
    onSale: true,
    description: "",
    variants: [
      variant({
        id: "7ad6cc06-d12f-4b37-ba1d-4b20b6ed5bac",
        sku: "SQ6463557",
        price: "450.00",
        salePrice: "320.00"
      })
    ],
    firstInStockVariant: variant({
      id: "7ad6cc06-d12f-4b37-ba1d-4b20b6ed5bac",
      sku: "SQ6463557",
      price: "450.00",
      salePrice: "320.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-7bcb165f-7b91-4958-af8f-9eac272ee39b-saba_at192_col.13.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-332de297-fee7-4c0a-9863-6793bcab54c2-saba_at192_col.16.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-442c1dc5-bcf9-4c0a-8dc2-65c011fe740c-saba_at192_col.14.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-e9571a75-83dd-4378-b112-fc84112ddfdb-saba_at192_col.03.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-79adb995-59c5-4fc7-b74b-52c313043a67-saba_at192_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-70a213a9-d248-4721-b53a-64b1ce9ccf0e-saba_at192_col.17.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-c15310e0-48a0-4658-8803-95c9d68f81f0-saba_at192_col.02.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-332de297-fee7-4c0a-9863-6793bcab54c2-saba_at192_col.16.jpg",
      "2319 col. 17"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all"]
  },
  {
    id: "679296c8a165a16c98b57438",
    title: "2319 col. 16",
    fullUrl: "/produits/p/at192-col-16",
    urlSlug: "at192-col-16",
    price: { currency: "USD", value: "450.00" },
    salePrice: { currency: "USD", value: "320.00" },
    soldOut: false,
    onSale: true,
    description: "",
    variants: [
      variant({
        id: "2150f13b-69e7-4ff6-bbbe-4a1f79be1965",
        sku: "SQ6667825",
        price: "450.00",
        salePrice: "320.00"
      })
    ],
    firstInStockVariant: variant({
      id: "2150f13b-69e7-4ff6-bbbe-4a1f79be1965",
      sku: "SQ6667825",
      price: "450.00",
      salePrice: "320.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-79adb995-59c5-4fc7-b74b-52c313043a67-saba_at192_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-c15310e0-48a0-4658-8803-95c9d68f81f0-saba_at192_col.02.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-e9571a75-83dd-4378-b112-fc84112ddfdb-saba_at192_col.03.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-70a213a9-d248-4721-b53a-64b1ce9ccf0e-saba_at192_col.17.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-7bcb165f-7b91-4958-af8f-9eac272ee39b-saba_at192_col.13.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-442c1dc5-bcf9-4c0a-8dc2-65c011fe740c-saba_at192_col.14.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-332de297-fee7-4c0a-9863-6793bcab54c2-saba_at192_col.16.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-79adb995-59c5-4fc7-b74b-52c313043a67-saba_at192_col.01.jpg",
      "2319 col. 16"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all"]
  },
  {
    id: "67929649a165a16c98b5736b",
    title: "1835 col. 02",
    fullUrl: "/produits/p/1835-col-02",
    urlSlug: "1835-col-02",
    price: { currency: "USD", value: "260.00" },
    soldOut: false,
    onSale: false,
    description:
      '&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Tissu obtenu avec des pourcentages élevés de fils écologiques provenant de déchets de production (TNT, FILS SYNTHÉTIQUES). Résistant au chlore et à l\'eau de mer.&lt;/p&gt;&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Ne pas blanchir, ne pas utiliser de détergents contenant des agents oxydants ou éclaircissants.&lt;/p&gt;',
    variants: [variant({ id: "a33be549-ed7c-4bf7-be67-9e19094103e4", sku: "SQ1774665", price: "260.00" })],
    firstInStockVariant: variant({
      id: "a33be549-ed7c-4bf7-be67-9e19094103e4",
      sku: "SQ1774665",
      price: "260.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-5a66919a-4dfd-49d8-a755-580b6277c3b4-saba_1835_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-6da45a3e-7fe9-4e22-8ff9-62a27664a006-saba_1835_col.02.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-79f80c81-694e-423c-b112-5942fbc18d31-saba_1835_col.07.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-4a132a65-c7dd-4c5a-b184-0c5dbf589e16-saba_1835_col.08.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-5a66919a-4dfd-49d8-a755-580b6277c3b4-saba_1835_col.01.jpg",
      "1835 col. 02"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all"]
  },
  {
    id: "679295d96c9a8e41d1c23f24",
    title: "1830 col. 01",
    fullUrl: "/produits/p/1830-col-01",
    urlSlug: "1830-col-01",
    price: { currency: "USD", value: "245.00" },
    soldOut: false,
    onSale: false,
    description:
      '&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Tissu obtenu à partir du traitement des résidus de production textile sans agents chimiques nocifs pour l\'homme et l\'environnement (REAC&nbsp;cl1).&lt;/p&gt;&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Ne pas utiliser de détergents contenant des agents oxydants ou éclaircissants.&lt;/p&gt;',
    variants: [variant({ id: "1b591933-b0c6-4584-b623-203a14867f07", sku: "SQ8791352", price: "245.00" })],
    firstInStockVariant: variant({
      id: "1b591933-b0c6-4584-b623-203a14867f07",
      sku: "SQ8791352",
      price: "245.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-f811cd2a-5899-4678-b631-78c84d5bfb3c-saba_1830_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-2df149c0-6599-4d37-a364-9342f59a2a54-saba_1830_col.02.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-56f71f82-ce72-4429-a2e8-147010c9612a-saba_1830_col.03.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-588baafd-10a1-4657-aad3-147ae13abf87-saba_1830_col.04.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-f811cd2a-5899-4678-b631-78c84d5bfb3c-saba_1830_col.01.jpg",
      "1830 col. 01"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all"]
  },
  {
    id: "67928f786c9a8e41d1c23645",
    title: "1807 col. 1",
    fullUrl: "/produits/p/1807-col-1",
    urlSlug: "1807-col-1",
    price: { currency: "USD", value: "220.00" },
    salePrice: { currency: "USD", value: "180.00" },
    soldOut: false,
    onSale: true,
    description:
      '&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Tissu obtenu à partir du traitement des déchets plastiques sans agents chimiques nocifs pour l\'homme et l\'environnement (REAC&nbsp;cl1).&lt;/p&gt;&lt;p style="white-space:pre-wrap;" data-rte-preserve-empty="true"&gt;Ne pas utiliser de détergents contenant des agents oxydants ou éclaircissants.&lt;/p&gt;',
    variants: [
      variant({
        id: "fa4379f4-77dd-4a15-8ebb-d4d1cc2d9145",
        sku: "SQ8778882",
        price: "220.00",
        salePrice: "180.00"
      })
    ],
    firstInStockVariant: variant({
      id: "fa4379f4-77dd-4a15-8ebb-d4d1cc2d9145",
      sku: "SQ8778882",
      price: "220.00",
      salePrice: "180.00"
    }),
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-a8ee61eb-3537-4d85-b27e-1f8744e561b1-saba_1807_col.01.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-4a49590b-1be6-499c-bff8-d629285efe5c-saba_1807_col.02-1.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-b76f249c-07c2-4b24-b11f-284e30c2251a-saba_1807_col.17.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-b2d14bc4-abd8-4d62-b6e1-26f45679f997-saba_1807_col.13.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-b6cc69d2-04d9-4dc8-b671-c109ca632db6-saba_1807_col.09.jpg"),
      image("/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-34b1e9aa-38b6-48ef-b469-64b79e8fb6a5-saba_1807_col.85.jpg")
    ],
    mainImage: image(
      "/mirrored-assets/images-squarespace-cdn-com-677ec6234f6cb47c166aec02-a8ee61eb-3537-4d85-b27e-1f8744e561b1-saba_1807_col.01.jpg",
      "1807 col. 1"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: [],
    mightHavePaymentPlan: false,
    collections: ["all"]
  }
];

export const productCollections = [
  { id: "all", path: "/produits", title: "Produits" },
  { id: "jacquard", path: "/produits/jacquard", title: "Promotions" },
  { id: "recycl", path: "/produits/recycl", title: "Recyclé" },
  { id: "tissu-enduit", path: "/produits/tissu-enduit", title: "Tissu enduit" },
  { id: "lin", path: "/produits/lin", title: "Lin" },
  { id: "cuir", path: "/produits/cuir", title: "Cuir" },
  { id: "coton", path: "/produits/coton", title: "Coton" }
];

const collectionByPath = new Map(
  productCollections.flatMap((collection) => [
    [collection.path, collection],
    [`${collection.path}/`, collection],
    [`${collection.path}.html`, collection]
  ])
);

export const productCatalogItems = products;

export function getProductCollectionForPath(pathname) {
  return collectionByPath.get(pathname) || collectionByPath.get(pathname.replace(/\/$/, ""));
}

export function getProductCatalogItemsForPath(pathname) {
  const collection = getProductCollectionForPath(pathname);

  if (!collection || collection.id === "all") {
    return productCatalogItems;
  }

  return productCatalogItems.filter((item) => item.collections.includes(collection.id));
}
