/* ────────────────────────────────────────────────────────────────
   Acceso a D1 (binding `DB`) sin ORM — SQL crudo con statements
   preparados, en línea con el resto del proyecto (JS plano, sin
   frameworks agregados sin necesidad).
   ──────────────────────────────────────────────────────────────── */

function rowToProductImage(row) {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    sourceName: row.source_name,
    sourceImageUrl: row.source_image_url,
    sourcePageUrl: row.source_page_url || undefined,
    originalStoragePath: row.original_storage_path || undefined,
    catalogStoragePath: row.catalog_storage_path || undefined,
    thumbnailStoragePath: row.thumbnail_storage_path || undefined,
    searchType: row.search_type,
    searchQuery: row.search_query,
    matchedBarcode: row.matched_barcode || undefined,
    confidenceScore: row.confidence_score,
    matchReasons: JSON.parse(row.match_reasons || '[]'),
    status: row.status,
    isPrimary: !!row.is_primary,
    isIllustrative: !!row.is_illustrative,
    suggestedTitle: row.suggested_title || undefined,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    rejectedBy: row.rejected_by || undefined,
    rejectedAt: row.rejected_at || undefined,
    errorMessage: row.error_message || undefined,
    originalWidth: row.original_width ?? undefined,
    originalHeight: row.original_height ?? undefined,
    lowResWarning: !!row.low_res_warning,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @param {D1Database} db
 * @param {object} candidate Campos de ProductImage a insertar (status inicial: 'candidate')
 */
export async function insertProductImage(db, candidate) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO product_images
        (id, product_id, source_name, source_image_url, source_page_url,
         search_type, search_query, matched_barcode, confidence_score, match_reasons, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate')`
    )
    .bind(
      id,
      candidate.productId,
      candidate.sourceName,
      candidate.sourceImageUrl,
      candidate.sourcePageUrl || null,
      candidate.searchType,
      candidate.searchQuery,
      candidate.matchedBarcode || null,
      candidate.confidenceScore,
      JSON.stringify(candidate.matchReasons || [])
    )
    .run();
  return id;
}

/** @param {D1Database} db */
export async function getProductImageById(db, id) {
  const row = await db.prepare('SELECT * FROM product_images WHERE id = ?').bind(id).first();
  return rowToProductImage(row);
}

/** @param {D1Database} db */
export async function getProductImagesForProduct(db, productId) {
  const { results } = await db
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY created_at DESC')
    .bind(productId)
    .all();
  return results.map(rowToProductImage);
}

/** Miniatura de la imagen aprobada/primaria por producto — para el filtro y la grilla "con/sin imagen" del admin. */
export async function getApprovedPrimaryThumbnails(db) {
  const { results } = await db
    .prepare("SELECT product_id, thumbnail_storage_path FROM product_images WHERE status = 'approved' AND is_primary = 1")
    .all();
  return new Map(results.map((r) => [r.product_id, r.thumbnail_storage_path]));
}

/** Todas las imágenes esperando revisión humana, sin importar el producto — para el panel global de pendientes. */
export async function getPendingReviewImages(db, limit = 300) {
  const { results } = await db
    .prepare("SELECT * FROM product_images WHERE status = 'pending_review' ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all();
  return results.map(rowToProductImage);
}

/** @param {D1Database} db */
export async function updateProductImage(db, id, fields) {
  const columns = [];
  const values = [];
  const map = {
    originalStoragePath: 'original_storage_path',
    catalogStoragePath: 'catalog_storage_path',
    thumbnailStoragePath: 'thumbnail_storage_path',
    status: 'status',
    isPrimary: 'is_primary',
    isIllustrative: 'is_illustrative',
    approvedBy: 'approved_by',
    approvedAt: 'approved_at',
    rejectedBy: 'rejected_by',
    rejectedAt: 'rejected_at',
    errorMessage: 'error_message',
    originalWidth: 'original_width',
    originalHeight: 'original_height',
    lowResWarning: 'low_res_warning',
  };
  for (const [jsKey, column] of Object.entries(map)) {
    if (!(jsKey in fields)) continue;
    columns.push(`${column} = ?`);
    const value = fields[jsKey];
    values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
  }
  if (columns.length === 0) return;
  columns.push("updated_at = datetime('now')");
  values.push(id);
  await db
    .prepare(`UPDATE product_images SET ${columns.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}

/**
 * Desmarca cualquier otra imagen primaria del producto y marca esta.
 * @param {D1Database} db
 */
export async function setPrimaryImage(db, productId, id) {
  await db.batch([
    db.prepare('UPDATE product_images SET is_primary = 0, updated_at = datetime(\'now\') WHERE product_id = ? AND is_primary = 1').bind(productId),
    db.prepare('UPDATE product_images SET is_primary = 1, updated_at = datetime(\'now\') WHERE id = ?').bind(id),
  ]);
}

/** @param {D1Database} db */
export async function deleteProductImage(db, id) {
  await db.prepare('DELETE FROM product_images WHERE id = ?').bind(id).run();
}

function rowToProductOverride(row) {
  if (!row) return null;
  return {
    productId: row.product_id,
    name: row.name || undefined,
    brand: row.brand || undefined,
    manufacturer: row.manufacturer || undefined,
    presentation: row.presentation || undefined,
    description: row.description || undefined,
    minMultiple: row.min_multiple ?? undefined,
    disponibilidad: row.disponibilidad || undefined,
    isHidden: !!row.is_hidden,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

/** @param {D1Database} db */
export async function getProductOverride(db, productId) {
  const row = await db.prepare('SELECT * FROM product_overrides WHERE product_id = ?').bind(productId).first();
  return rowToProductOverride(row);
}

/**
 * Crea o reemplaza la ficha editada de un producto. Campos vacíos/omitidos
 * se guardan como NULL (sin override para ese campo puntual). isHidden
 * siempre se guarda explícito (no tiene estado "sin override").
 * @param {D1Database} db
 */
export async function upsertProductOverride(db, productId, fields, updatedBy) {
  await db
    .prepare(
      `INSERT INTO product_overrides
        (product_id, name, brand, manufacturer, presentation, description, min_multiple, disponibilidad, is_hidden, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(product_id) DO UPDATE SET
         name = excluded.name,
         brand = excluded.brand,
         manufacturer = excluded.manufacturer,
         presentation = excluded.presentation,
         description = excluded.description,
         min_multiple = excluded.min_multiple,
         disponibilidad = excluded.disponibilidad,
         is_hidden = excluded.is_hidden,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    )
    .bind(
      productId,
      fields.name || null,
      fields.brand || null,
      fields.manufacturer || null,
      fields.presentation || null,
      fields.description || null,
      fields.minMultiple || null,
      fields.disponibilidad || null,
      fields.isHidden ? 1 : 0,
      updatedBy
    )
    .run();
}

/** @param {D1Database} db */
export async function getCachedBarcodeSearch(db, barcode, maxAgeSeconds) {
  const row = await db
    .prepare(
      `SELECT * FROM barcode_search_cache
       WHERE barcode = ? AND (strftime('%s','now') - strftime('%s', fetched_at)) < ?`
    )
    .bind(barcode, maxAgeSeconds)
    .first();
  if (!row) return null;
  return JSON.parse(row.candidates_json);
}

/** @param {D1Database} db */
export async function setCachedBarcodeSearch(db, barcode, provider, candidates) {
  await db
    .prepare(
      `INSERT INTO barcode_search_cache (barcode, provider, candidates_json, fetched_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(barcode) DO UPDATE SET
         provider = excluded.provider,
         candidates_json = excluded.candidates_json,
         fetched_at = excluded.fetched_at`
    )
    .bind(barcode, provider, JSON.stringify(candidates))
    .run();
}

/** @param {D1Database} db */
export async function insertSearchLog(db, entry) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO search_log
        (id, user_email, query_type, query_value, provider, results_count, image_found, response_time_ms, error_message, from_cache)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      entry.userEmail,
      entry.queryType,
      entry.queryValue,
      entry.provider,
      entry.resultsCount,
      entry.imageFound ? 1 : 0,
      entry.responseTimeMs ?? null,
      entry.errorMessage || null,
      entry.fromCache ? 1 : 0
    )
    .run();
  return id;
}

/** Cuenta de consultas al proveedor externo hechas hoy (día calendario UTC). No cuenta hits de caché. */
export async function countSearchesToday(db) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM search_log
       WHERE date(created_at) = date('now') AND from_cache = 0`
    )
    .first();
  return row?.total || 0;
}

/** @param {D1Database} db */
export async function getUsageStats(db) {
  const row = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN image_found = 1 THEN 1 ELSE 0 END) AS found,
         SUM(CASE WHEN image_found = 0 THEN 1 ELSE 0 END) AS notFound
       FROM search_log
       WHERE date(created_at) = date('now')`
    )
    .first();
  return {
    total: row?.total || 0,
    found: row?.found || 0,
    notFound: row?.notFound || 0,
  };
}
