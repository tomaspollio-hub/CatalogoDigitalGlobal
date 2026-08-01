/* ────────────────────────────────────────────────────────────────
   Helpers de storage sobre el bucket R2 (binding `IMAGES`, ver
   wrangler.toml). Estructura de rutas:
     products/{productId}/sources/{uuid}.{ext}
     products/{productId}/catalog/{uuid}.webp
     products/{productId}/thumbnails/{uuid}.webp
   Nunca se guarda la imagen como base64 en D1 — solo estas rutas.
   ──────────────────────────────────────────────────────────────── */

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function extensionForMime(mimeType) {
  return EXT_BY_MIME[mimeType] || 'bin';
}

export function sourcePath(productId, uuid, mimeType) {
  return `products/${productId}/sources/${uuid}.${extensionForMime(mimeType)}`;
}

export function catalogPath(productId, uuid) {
  return `products/${productId}/catalog/${uuid}.webp`;
}

export function thumbnailPath(productId, uuid) {
  return `products/${productId}/thumbnails/${uuid}.webp`;
}

/**
 * @param {R2Bucket} bucket
 * @param {string} path
 * @param {Uint8Array} bytes
 * @param {string} contentType
 */
export async function putObject(bucket, path, bytes, contentType) {
  await bucket.put(path, bytes, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
  });
  return path;
}

/**
 * @param {R2Bucket} bucket
 * @param {string[]} paths
 */
export async function deleteObjects(bucket, paths) {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return;
  await bucket.delete(valid);
}

/**
 * @param {R2Bucket} bucket
 * @param {string} path
 * @returns {Promise<R2ObjectBody | null>}
 */
export async function getObject(bucket, path) {
  return bucket.get(path);
}
