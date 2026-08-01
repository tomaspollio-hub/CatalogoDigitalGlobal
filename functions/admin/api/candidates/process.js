import { findProductBySku } from '../../../_lib/products.js';
import { downloadImageSafely } from '../../../_lib/image/download.js';
import { normalizeProductImage } from '../../../_lib/image/normalize.js';
import { checkUrlIsSafe } from '../../../_lib/image/ssrf-guard.js';
import { putObject } from '../../../_lib/storage/r2.js';
import { sourcePath, catalogPath, thumbnailPath } from '../../../_lib/storage/r2.js';
import { insertProductImage, updateProductImage } from '../../../_lib/db/queries.js';
import { json, errorResponse, readJsonBody } from '../../../_lib/http.js';

export async function onRequestPost(context) {
  const { env } = context;
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch (e) {
    return errorResponse(400, e.code);
  }

  const { productId, candidate } = body;
  if (!productId || !candidate?.imageUrl || !candidate?.title || !candidate?.sourceName) {
    return errorResponse(400, 'validation_error');
  }

  const product = findProductBySku(productId);
  if (!product) return errorResponse(404, 'product_not_found');

  const urlCheck = checkUrlIsSafe(candidate.imageUrl);
  if (!urlCheck.safe) return errorResponse(400, 'url_no_permitida');

  const imageId = await insertProductImage(env.DB, {
    productId,
    sourceName: candidate.sourceName,
    sourceImageUrl: candidate.imageUrl,
    sourcePageUrl: candidate.sourcePageUrl,
    searchType: candidate.searchType || 'text',
    searchQuery: candidate.searchQuery || '',
    matchedBarcode: candidate.barcode,
    confidenceScore: candidate.confidenceScore || 0,
    matchReasons: candidate.matchReasons || [],
  });

  await updateProductImage(env.DB, imageId, { status: 'processing' });

  const maxSizeBytes = Number(env.PRODUCT_IMAGE_MAX_SIZE_MB || 10) * 1024 * 1024;
  const minWidth = Number(env.PRODUCT_IMAGE_MIN_WIDTH || 600);
  const minHeight = Number(env.PRODUCT_IMAGE_MIN_HEIGHT || 600);

  try {
    const { bytes, mimeType } = await downloadImageSafely(candidate.imageUrl, { maxSizeBytes });
    const normalized = normalizeProductImage(bytes, { minWidth, minHeight });

    const uuid = crypto.randomUUID();
    const originalPath = sourcePath(productId, uuid, mimeType);
    const catalogStoragePath = catalogPath(productId, uuid);
    const thumbnailStoragePath = thumbnailPath(productId, uuid);

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
      catalogUrl: `/img/${catalogStoragePath}`,
      thumbnailUrl: `/img/${thumbnailStoragePath}`,
    });
  } catch (e) {
    const code = e.code || 'unknown_error';
    await updateProductImage(env.DB, imageId, { status: 'failed', errorMessage: code });
    return errorResponse(code === 'imagen_demasiado_grande' || code === 'formato_no_permitido' ? 400 : 502, code);
  }
}
