/* ────────────────────────────────────────────────────────────────
   Contrato que debe cumplir cualquier fuente de imágenes de producto.
   Proyecto en JS plano (sin build step ni TypeScript) — la interfaz
   se documenta con JSDoc en vez de un `interface` de TS, pero el
   contrato es el mismo: cualquier proveedor nuevo (Go-UPC, UPCitemdb,
   fuentes de fabricantes, carga manual) implementa esta clase.
   ──────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} ProductImageCandidate
 * @property {string} [externalId]
 * @property {string} title
 * @property {string} [brand]
 * @property {string} [manufacturer]
 * @property {string} [barcode]
 * @property {string} [category]
 * @property {string} [description]
 * @property {string} imageUrl
 * @property {string} [thumbnailUrl]
 * @property {string} sourceName
 * @property {string} [sourcePageUrl]
 * @property {number} confidenceScore
 * @property {string[]} matchReasons
 */

/**
 * @typedef {Object} ProductImageSearchQuery
 * @property {string} [title]
 * @property {string} [brand]
 * @property {string} [manufacturer]
 * @property {string} [presentation]
 */

export class ProductImageProvider {
  /**
   * @param {string} barcode
   * @returns {Promise<ProductImageCandidate[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async searchByBarcode(barcode) {
    throw new Error('not_implemented');
  }

  /**
   * @param {ProductImageSearchQuery} query
   * @returns {Promise<ProductImageCandidate[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async searchByText(query) {
    throw new Error('not_implemented');
  }
}
