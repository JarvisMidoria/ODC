import { westV2Products } from "./product-catalog-west-v2.js";

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

function colorway({ id, label, sku, images, description, price = null, salePrice = null }) {
  return {
    id,
    label,
    sku,
    price,
    salePrice,
    description,
    images,
    mainImage: images[0] || null
  };
}

const products = [
  {
    id: "import-alaior",
    title: "ALAIOR",
    brand: "Lorenzo Castillo",
    fullUrl: "/produits/p/alaior",
    urlSlug: "alaior",
    price: null,
    salePrice: null,
    soldOut: false,
    onSale: false,
    description:
      "<p><strong>Marque:</strong> Lorenzo Castillo</p><p><strong>Type de produit:</strong> Tissu</p><p><strong>Type:</strong> Jacquard</p><p><strong>Dessin:</strong> Geometric, Punto de Hungria</p><p><strong>Martindale:</strong> 25.000</p><p><strong>Usage:</strong> Upholstery</p><p><strong>Code de lavage:</strong> 08, 11, 21, 30, 44</p><p><strong>Repeat horizontal (cm):</strong> 7</p><p><strong>Repeat vertical (cm):</strong> 40</p><p><strong>Largeur (cm):</strong> 138</p><p><strong>Composition:</strong> 26% Viscosa, 28% Poliester, 46% Algodon</p>",
    variants: [],
    firstInStockVariant: null,
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/08/alaior_azul_lorenzo_castillo_gastonydaniela_decoracion_casa_tapizado_mueble.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/11/alaior_azul_blanco_hesperia_tela_lorenzo_castillo_gastonydaniela_decoracion_tapiceria_colores.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/02/sofa_aliaor_azul_decoracion_gastonydaniela_telas_puntohungria_zigzag_tapizado.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2023/06/Tela_gastonydaniela_numantia_alaior_hesperia_botanico_zigzag_hotel_son_net_mallorca_butaca_sofa_tapizado_decoracion_lorenzo_castillo.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/09/Tela_alaior_lorenzo_castillo_gastonydaniela_azul_blanco_decoracion_casa_tapizado_ancho.jpg")
    ],
    mainImage: image(
      "https://gastonydaniela.com/catalogo/wp-content/uploads/2022/08/alaior_azul_lorenzo_castillo_gastonydaniela_decoracion_casa_tapizado_mueble.jpg",
      "ALAIOR AZUL/BLANCO"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: ["Lorenzo Castillo", "Jacquard", "Geometric", "Tapicerie"],
    mightHavePaymentPlan: false,
    collections: ["all"],
    colorways: [
      colorway({
        id: "alaior-azul-blanco",
        label: "Azul/Blanco",
        sku: "LCT-1106-001",
        description: "<p><strong>Reference:</strong> LCT-1106-001</p><p><strong>Couleur:</strong> Azul/Blanco</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/08/alaior_azul_lorenzo_castillo_gastonydaniela_decoracion_casa_tapizado_mueble.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/11/alaior_azul_blanco_hesperia_tela_lorenzo_castillo_gastonydaniela_decoracion_tapiceria_colores.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/02/sofa_aliaor_azul_decoracion_gastonydaniela_telas_puntohungria_zigzag_tapizado.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2023/06/Tela_gastonydaniela_numantia_alaior_hesperia_botanico_zigzag_hotel_son_net_mallorca_butaca_sofa_tapizado_decoracion_lorenzo_castillo.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/09/Tela_alaior_lorenzo_castillo_gastonydaniela_azul_blanco_decoracion_casa_tapizado_ancho.jpg")
        ]
      }),
      colorway({
        id: "alaior-ocre",
        label: "Ocre",
        sku: "LCT-1106-005",
        description: "<p><strong>Reference:</strong> LCT-1106-005</p><p><strong>Couleur:</strong> Ocre</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/08/alaior_ocre_lorenzo_castillo_gastonydaniela_decoracion_casa_tapizado_mueble.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/11/alaior_ocre_hesperia_tela_lorenzo_castillo_gastonydaniela_decoracion_tapiceria_colores.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/02/sofa_aliaor_ocre_decoracion_gastonydaniela_telas_puntohungria_zigzag_tapizado.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/06/Tela_alaior_geometrico_ocre_gastonydaniela_lorenzo_castillo_hesperia_mesa_LCT_1106_005-scaled.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/09/Tela_alaior_lorenzo_castillo_gastonydaniela_ocre_decoracion_casa_tapizado_ancho.jpg")
        ]
      }),
      colorway({
        id: "alaior-azul-verde",
        label: "Azul/Verde",
        sku: "LCT-1106-002",
        description: "<p><strong>Reference:</strong> LCT-1106-002</p><p><strong>Couleur:</strong> Azul/Verde</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/08/alaior_verde_lorenzo_castillo_gastonydaniela_decoracion_casa_tapizado_mueble.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/11/alaior_verde_hesperia_tela_lorenzo_castillo_gastonydaniela_decoracion_tapiceria_colores.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/02/sofa_aliaor_verde_azul_decoracion_gastonydaniela_telas_puntohungria_zigzag_tapizado.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2023/06/Tela_gastonydaniela_numantia_alaior_hesperia_botanico_zigzag_hotel_son_net_mallorca_butaca_sofa_tapizado_decoracion_lorenzo_castillo.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/09/Tela_alaior_lorenzo_castillo_gastonydaniela_azul_verde_decoracion_casa_tapizado_ancho.jpg")
        ]
      }),
      colorway({
        id: "alaior-azul-ocre",
        label: "Azul/Ocre",
        sku: "LCT-1106-003",
        description: "<p><strong>Reference:</strong> LCT-1106-003</p><p><strong>Couleur:</strong> Azul/Ocre</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/08/alaior_azul_ocre_lorenzo_castillo_gastonydaniela_decoracion_casa_tapizado_mueble.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/11/alaior_azul_ocre_hesperia_tela_lorenzo_castillo_gastonydaniela_decoracion_tapiceria_colores.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/02/sofa_aliaor_azul_ocre_decoracion_gastonydaniela_telas_puntohungria_zigzag_tapizado.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2023/06/Tela_gastonydaniela_numantia_alaior_hesperia_botanico_zigzag_hotel_son_net_mallorca_butaca_sofa_tapizado_decoracion_lorenzo_castillo.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/09/Tela_alaior_lorenzo_castillo_gastonydaniela_azul_ocre_decoracion_casa_tapizado_ancho.jpg")
        ]
      }),
      colorway({
        id: "alaior-rojo",
        label: "Rojo",
        sku: "LCT-1106-004",
        description: "<p><strong>Reference:</strong> LCT-1106-004</p><p><strong>Couleur:</strong> Rojo</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/08/alaior_rojo_lorenzo_castillo_gastonydaniela_decoracion_casa_tapizado_mueble.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/11/alaior_rojo_hesperia_tela_lorenzo_castillo_gastonydaniela_decoracion_tapiceria_colores.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/02/sofa_aliaor_rojo_decoracion_gastonydaniela_telas_puntohungria_zigzag_tapizado.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2023/06/Tela_gastonydaniela_numantia_alaior_hesperia_botanico_zigzag_hotel_son_net_mallorca_butaca_sofa_tapizado_decoracion_lorenzo_castillo.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2022/09/Tela_alaior_lorenzo_castillo_gastonydaniela_naranja_rojo_decoracion_casa_tapizado_ancho.jpg")
        ]
      })
    ]
  },
  {
    id: "import-acebuche",
    title: "ACEBUCHE",
    brand: "Lorenzo Castillo",
    fullUrl: "/produits/p/acebuche",
    urlSlug: "acebuche",
    price: null,
    salePrice: null,
    soldOut: false,
    onSale: false,
    description:
      "<p><strong>Marque:</strong> Lorenzo Castillo</p><p><strong>Type de produit:</strong> Tissu</p><p><strong>Type:</strong> Velvet</p><p><strong>Dessin:</strong> Geometric</p><p><strong>Martindale:</strong> 50.000</p><p><strong>Usage:</strong> Upholstery</p><p><strong>Code de lavage:</strong> 08, 11, 24, 31, 44</p><p><strong>Repeat horizontal (cm):</strong> 6.5</p><p><strong>Repeat vertical (cm):</strong> 7</p><p><strong>Largeur (cm):</strong> 139</p><p><strong>Composition:</strong> 28% Viscosa, 72% Algodon</p>",
    variants: [],
    firstInStockVariant: null,
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_006_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_006_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_006_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
    ],
    mainImage: image(
      "https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_006_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg",
      "ACEBUCHE AZUL/NAVY"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: ["Lorenzo Castillo", "Tapicerie", "Velvet", "Geometric"],
    mightHavePaymentPlan: false,
    collections: ["all"],
    colorways: [
      colorway({
        id: "acebuche-azul-navy",
        label: "Azul/Navy",
        sku: "LCT-1165-006",
        description: "<p><strong>Reference:</strong> LCT-1165-006</p><p><strong>Couleur:</strong> Azul/Navy</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_006_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_006_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_006_tela_acebuche_azul_navy_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      }),
      colorway({
        id: "acebuche-navy-azul",
        label: "Navy/Azul",
        sku: "LCT-1165-007",
        description: "<p><strong>Reference:</strong> LCT-1165-007</p><p><strong>Couleur:</strong> Navy/Azul</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_007_tela_acebuche_navy_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_007_tela_acebuche_navy_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_navy_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_007_tela_acebuche_navy_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      }),
      colorway({
        id: "acebuche-oro-azul",
        label: "Oro/Azul",
        sku: "LCT-1165-008",
        description: "<p><strong>Reference:</strong> LCT-1165-008</p><p><strong>Couleur:</strong> Oro/Azul</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_008_tela_acebuche_oro_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_008_tela_acebuche_oro_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_oro_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_008_tela_acebuche_oro_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      }),
      colorway({
        id: "acebuche-chocolate-naranja",
        label: "Chocolate/Naranja",
        sku: "LCT-1165-004",
        description: "<p><strong>Reference:</strong> LCT-1165-004</p><p><strong>Couleur:</strong> Chocolate/Naranja</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_004_tela_acebuche_chocolate_naranja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_004_tela_acebuche_chocolate_naranja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_chocolate_naranja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_004_tela_acebuche_chocolate_naranja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      }),
      colorway({
        id: "acebuche-topo-beige",
        label: "Topo/Beige",
        sku: "LCT-1165-005",
        description: "<p><strong>Reference:</strong> LCT-1165-005</p><p><strong>Couleur:</strong> Topo/Beige</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_005_tela_acebuche_topo_beige_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_005_tela_acebuche_topo_beige_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_topo_beige_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_005_tela_acebuche_topo_beige_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      }),
      colorway({
        id: "acebuche-burdeos-verde",
        label: "Burdeos/Verde",
        sku: "LCT-1165-002",
        description: "<p><strong>Reference:</strong> LCT-1165-002</p><p><strong>Couleur:</strong> Burdeos/Verde</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_002_tela_acebuche_verde_burdeos_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_002_tela_acebuche_verde_burdeos_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_verde_burdeos_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_002_tela_acebuche_verde_burdeos_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      }),
      colorway({
        id: "acebuche-verde-teja",
        label: "Verde/Teja",
        sku: "LCT-1165-003",
        description: "<p><strong>Reference:</strong> LCT-1165-003</p><p><strong>Couleur:</strong> Verde/Teja</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_003_tela_acebuche_verde_teja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_003_tela_acebuche_verde_teja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_verde_teja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Telas_banqueta_acebuche_verde_lorenzocastillo_gastonydaniela_terciopelo_geometrico_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_003_tela_acebuche_verde_teja_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      }),
      colorway({
        id: "acebuche-verde-azul",
        label: "Verde/Azul",
        sku: "LCT-1165-001",
        description: "<p><strong>Reference:</strong> LCT-1165-001</p><p><strong>Couleur:</strong> Verde/Azul</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_001_tela_acebuche_verde_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/LCT_1165_001_tela_acebuche_verde_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_detalle.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/06/Sofa_tela_acebuche_verde_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/09/Sofa_tapizado_tela_algendar_puffs_tapizados_lorenzocastillo_gastonydaniela_terciopelo_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2024/07/LCT_1165_001_tela_acebuche_verde_azul_gastonydaniela_lorenzocastillo_geometrico_tapiceria_algodon_decoracion_ancho.jpg")
        ]
      })
    ]
  },
  {
    id: "import-wyatt",
    title: "WYATT",
    brand: "Gaston y Daniela",
    fullUrl: "/produits/p/wyatt",
    urlSlug: "wyatt",
    price: null,
    salePrice: null,
    soldOut: false,
    onSale: false,
    description:
      "<p><strong>Marque:</strong> Gaston y Daniela</p><p><strong>Type de produit:</strong> Tissu</p><p><strong>Type:</strong> Tapiceria con dibujo</p><p><strong>Dessin:</strong> Geometrique</p><p><strong>Martindale:</strong> 30.000</p><p><strong>Usage:</strong> Tapicerie</p><p><strong>Code de lavage:</strong> 08, 11, 21, 31, 44, 60</p><p><strong>Repeat horizontal (cm):</strong> 52.5</p><p><strong>Repeat vertical (cm):</strong> 25.5</p><p><strong>Largeur (cm):</strong> 140</p><p><strong>Composition:</strong> 6% Poliester, 7% Lana, 9% Acrilico, 28% Algodon recycle, 50% Yute</p>",
    variants: [],
    firstInStockVariant: null,
    userDefinedVariantOptions: [],
    productType: 1,
    images: [
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/GDT_5864_001_wyatt_verde_tela_west_gastonydaniela_raya_cortinas_algodon_lino_decoracion.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_verde.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/11/wyatt_verde.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2026/01/mesa_wyatt_salon_almohadon_decoracion_gaston_y_daniela-scaled.jpg"),
      image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_verde_ancho.jpg")
    ],
    mainImage: image(
      "https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/GDT_5864_001_wyatt_verde_tela_west_gastonydaniela_raya_cortinas_algodon_lino_decoracion.jpg",
      "WYATT VERDE"
    ),
    qtyInStock: Number.MAX_SAFE_INTEGER,
    allowMultiplePurchase: true,
    scarce: false,
    published: true,
    tags: ["Gaston y Daniela", "West", "El Dorado", "Tapicerie"],
    mightHavePaymentPlan: false,
    collections: ["all"],
    colorways: [
      colorway({
        id: "wyatt-verde",
        label: "Verde",
        sku: "GDT-5864-001",
        description:
          "<p><strong>Reference:</strong> GDT-5864-001</p><p><strong>Couleur:</strong> Gama verdes</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/GDT_5864_001_wyatt_verde_tela_west_gastonydaniela_raya_cortinas_algodon_lino_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_verde.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/11/wyatt_verde.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2026/01/mesa_wyatt_salon_almohadon_decoracion_gaston_y_daniela-scaled.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_verde_ancho.jpg")
        ]
      }),
      colorway({
        id: "wyatt-amarillo",
        label: "Amarillo",
        sku: "GDT-5864-004",
        description:
          "<p><strong>Reference:</strong> GDT-5864-004</p><p><strong>Couleur:</strong> Amarillo</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/GDT_5864_004_wyatt_amarillo_tela_west_gastonydaniela_raya_cortinas_algodon_lino_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_amarillo.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/11/wyatt_amarillo.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2026/01/mesa_wyatt_salon_almohadon_decoracion_gaston_y_daniela-scaled.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_amarillo_ancho.jpg")
        ]
      }),
      colorway({
        id: "wyatt-azul",
        label: "Azul",
        sku: "GDT-5864-003",
        description:
          "<p><strong>Reference:</strong> GDT-5864-003</p><p><strong>Couleur:</strong> Azul</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/GDT_5864_003_wyatt_azul_tela_west_gastonydaniela_raya_cortinas_algodon_lino_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_azul.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/11/wyatt_azul.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2026/01/mesa_wyatt_salon_almohadon_decoracion_gaston_y_daniela-scaled.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_azul_ancho.jpg")
        ]
      }),
      colorway({
        id: "wyatt-naranja",
        label: "Naranja",
        sku: "GDT-5864-002",
        description:
          "<p><strong>Reference:</strong> GDT-5864-002</p><p><strong>Couleur:</strong> Naranja</p>",
        images: [
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/GDT_5864_002_wyatt_naranja_tela_west_gastonydaniela_raya_cortinas_algodon_lino_decoracion.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_naranja.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/11/wyatt_naranja.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2026/01/mesa_wyatt_salon_almohadon_decoracion_gaston_y_daniela-scaled.jpg"),
          image("https://gastonydaniela.com/catalogo/wp-content/uploads/2025/12/Wyatt_naranja_ancho.jpg")
        ]
      })
    ]
  },
  ...westV2Products
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

const productByPath = new Map(
  productCatalogItems.flatMap((product) => [
    [product.fullUrl, product],
    [`${product.fullUrl}/`, product],
    [`${product.fullUrl}.html`, product]
  ])
);

const productById = new Map(
  productCatalogItems.map((product) => [product.id, product])
);

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

export function getProductCatalogItemForPath(pathname) {
  return (
    productByPath.get(pathname) ||
    productByPath.get(pathname.replace(/\/$/, "")) ||
    null
  );
}

export function getProductCatalogItemById(productId) {
  return productById.get(productId) || null;
}
