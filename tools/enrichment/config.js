/* ────────────────────────────────────────────────────────────────
   Configuración del módulo de enriquecimiento de catálogo.
   No confundir con /src/config.js (ese es del sitio público).
   ──────────────────────────────────────────────────────────────── */

export const CONFIG = {
  // Umbrales de decisión sobre el puntaje de confianza (0-100)
  thresholds: {
    autoAssign: 90, // >= esto: asignación automática (Etapa 3+)
    manualReview: 70, // >= esto (y < autoAssign): cola de revisión manual
    // < manualReview: rechazado
  },

  // Pesos de cada señal en el puntaje de confianza (deben sumar 100)
  weights: {
    gtinExactMatch: 30, // todo o nada
    nameSimilarity: 20, // proporcional (0-1) * peso
    brandMatch: 20, // todo o nada
    presentationMatch: 15, // todo o nada
    sourceAuthority: 10, // según domainType, ver sourceAuthorityScores
    imageQuality: 5, // proporcional (0-1) * peso
  },

  // Puntaje según el tipo de dominio de origen de la imagen encontrada
  sourceAuthorityScores: {
    manufacturer: 10, // sitio oficial de marca/laboratorio/fabricante
    distributor: 6, // droguería, farmacia online, distribuidor mayorista
    marketplace: 3, // MercadoLibre y similares
    unknown: 0,
  },

  // Proveedor de búsqueda de imágenes (Etapa 3+). Sin API key configurada,
  // el runner solo puede operar en modo manual/reporte (Etapa 1).
  imageSearchProvider: {
    type: null, // 'google-custom-search' | 'bing-image-search' | 'serpapi' | null
    apiKey: null,
    endpoint: null,
  },

  // Rutas relativas a este directorio
  paths: {
    products: '../../src/products.json',
    manualSearchResults: './data/manual-search-results.json',
    report: './data/enrichment-report.json',
  },
};
