/* ────────────────────────────────────────────────────────────────
   Traduce la respuesta cruda de Barcode Lookup API v3 al formato
   interno ProductImageCandidate. Ningún componente del frontend ni
   ningún otro módulo del backend debe leer la forma de la respuesta
   de Barcode Lookup directamente — solo este adaptador.
   ──────────────────────────────────────────────────────────────── */

function dedupeByImageUrl(candidates) {
  const seen = new Set();
  const result = [];
  for (const c of candidates) {
    if (!c.imageUrl || seen.has(c.imageUrl)) continue;
    seen.add(c.imageUrl);
    result.push(c);
  }
  return result;
}

/**
 * @param {any} rawResponse Respuesta JSON cruda de api.barcodelookup.com/v3/products
 * @returns {import('./product-image-provider.js').ProductImageCandidate[]}
 */
export function adaptBarcodeLookupResponse(rawResponse) {
  const products = Array.isArray(rawResponse?.products) ? rawResponse.products : [];
  const candidates = [];

  for (const product of products) {
    const baseCandidate = {
      title: product.title || product.model || 'Sin título',
      brand: product.brand || undefined,
      manufacturer: product.manufacturer || undefined,
      barcode: product.barcode_number || undefined,
      category: product.category || undefined,
      description: product.description || undefined,
      sourceName: 'Barcode Lookup',
    };

    // Imágenes propias del producto (galería principal)
    const images = Array.isArray(product.images) ? product.images : [];
    for (const imageUrl of images) {
      if (!imageUrl) continue;
      candidates.push({
        ...baseCandidate,
        externalId: product.asin || product.mpn || undefined,
        imageUrl,
        thumbnailUrl: imageUrl,
        sourcePageUrl: undefined,
        confidenceScore: 0, // se completa en el scorer
        matchReasons: [],
      });
    }

    // Imágenes de listados de tiendas/distribuidores asociados al mismo producto
    const stores = Array.isArray(product.stores) ? product.stores : [];
    for (const store of stores) {
      if (!store?.image) continue;
      candidates.push({
        ...baseCandidate,
        title: store.title || baseCandidate.title,
        externalId: undefined,
        imageUrl: store.image,
        thumbnailUrl: store.image,
        sourceName: store.store_name ? `Barcode Lookup · ${store.store_name}` : 'Barcode Lookup',
        sourcePageUrl: store.link || undefined,
        confidenceScore: 0,
        matchReasons: [],
      });
    }
  }

  return dedupeByImageUrl(candidates);
}
