import { findProductBySku } from '../../../../_lib/products.js';
import { sniffMimeType } from '../../../../_lib/image/download.js';
import { normalizeProductImage } from '../../../../_lib/image/normalize.js';
import { sourcePath, catalogPath, thumbnailPath, putObject } from '../../../../_lib/storage/r2.js';
import { insertProductImage, updateProductImage } from '../../../../_lib/db/queries.js';
import { json, errorResponse } from '../../../../_lib/http.js';

/** Carga manual de imagen: el admin sube un archivo directo desde su computadora, sin pasar por un proveedor externo. */
export async function onRequestPost(context) {
  const { env, request } = context;
  const { sku } = context.params;
  const product = findProductBySku(sku);
  if (!product) return errorResponse(404, 'product_not_found');

  const maxSizeBytes = Number(env.PRODUCT_IMAGE_MAX_SIZE_MB || 10) * 1024 * 1024;
  const minWidth = Number(env.PRODUCT_IMAGE_MIN_WIDTH || 600);
  const minHeight = Number(env.PRODUCT_IMAGE_MIN_HEIGHT || 600);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength && contentLength > maxSizeBytes) return errorResponse(400, 'imagen_demasiado_grande');

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) return errorResponse(400, 'validation_error');
  if (bytes.byteLength > maxSizeBytes) return errorResponse(400, 'imagen_demasiado_grande');

  const mimeType = sniffMimeType(bytes);
  if (!mimeType) return errorResponse(400, 'formato_no_permitido');

  const imageId = await insertProductImage(env.DB, {
    productId: sku,
    sourceName: 'Carga manual',
    sourceImageUrl: '',
    searchType: 'manual',
    searchQuery: 'carga manual',
    confidenceScore: 100,
    matchReasons: [],
  });
  await updateProductImage(env.DB, imageId, { status: 'processing' });

  try {
    const normalized = normalizeProductImage(bytes, { minWidth, minHeight });

    const uuid = crypto.randomUUID();
    const originalPath = sourcePath(sku, uuid, mimeType);
    const catalogStoragePath = catalogPath(sku, uuid);
    const thumbnailStoragePath = thumbnailPath(sku, uuid);

    await putObject(env.IMAGES, originalPath, bytes, mimeType);
    await putObject(env.IMAGES, catalogStoragePath, normalized.catalogWebp, 'image/webp');
    await putObject(env.IMAGES, thumbnailStoragePath, normalized.thumbnailWebp, 'image/webp');

    await updateProductImage(env.DB, imageId, {
      status: 'pending_review',
      originalStoragePath: originalPath,
      catalogStoragePath,
      thumbnailStoragePath,
      originalWidth: normalized.originalWidth,
      originalHeight: normalized.originalHeight,
      lowResWarning: normalized.lowResWarning,
    });

    return json({
      imageId,
      status: 'pending_review',
      originalWidth: normalized.originalWidth,
      originalHeight: normalized.originalHeight,
      lowResWarning: normalized.lowResWarning,
      originalUrl: `/img/${originalPath}`,
      catalogUrl: `/img/${catalogStoragePath}`,
      thumbnailUrl: `/img/${thumbnailStoragePath}`,
    });
  } catch (e) {
    const code = e.code || 'unknown_error';
    await updateProductImage(env.DB, imageId, { status: 'failed', errorMessage: code });
    return errorResponse(502, code);
  }
}
