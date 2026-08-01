import { checkUrlIsSafe } from './ssrf-guard.js';

const DOWNLOAD_TIMEOUT_MS = 10000;

// Firmas de bytes (magic numbers) de los formatos que aceptamos.
const MAGIC_BYTES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // + "WEBP" en offset 8, chequeado aparte
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

function sniffMimeType(bytes) {
  for (const sig of MAGIC_BYTES) {
    const matches = sig.bytes.every((b, i) => bytes[i] === b);
    if (!matches) continue;
    if (sig.mime === 'image/webp') {
      const isWebp = [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[8 + i] === b);
      if (!isWebp) continue;
    }
    return sig.mime;
  }
  return null;
}

/**
 * Descarga una imagen externa de forma segura: bloquea SSRF, exige HTTPS,
 * corta por tamaño y tiempo, y confirma el tipo real por magic bytes (no
 * confía en el Content-Type declarado por el servidor externo).
 *
 * @param {string} url
 * @param {{ maxSizeBytes: number }} opts
 * @returns {Promise<{ bytes: Uint8Array, mimeType: string }>}
 */
export async function downloadImageSafely(url, { maxSizeBytes }) {
  const check = checkUrlIsSafe(url);
  if (!check.safe) {
    const err = new Error('url_no_permitida');
    err.code = 'url_no_permitida';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(check.url.toString(), {
      signal: controller.signal,
      redirect: 'follow', // fetch() de Workers valida cada salto contra la misma red segura
    });
  } catch (e) {
    const err = new Error(e.name === 'AbortError' ? 'descarga_timeout' : 'descarga_fallida');
    err.code = e.name === 'AbortError' ? 'descarga_timeout' : 'descarga_fallida';
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok || !res.body) {
    const err = new Error('descarga_fallida');
    err.code = 'descarga_fallida';
    throw err;
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength && contentLength > maxSizeBytes) {
    const err = new Error('imagen_demasiado_grande');
    err.code = 'imagen_demasiado_grande';
    throw err;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxSizeBytes) {
      await reader.cancel();
      const err = new Error('imagen_demasiado_grande');
      err.code = 'imagen_demasiado_grande';
      throw err;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const mimeType = sniffMimeType(bytes);
  if (!mimeType) {
    const err = new Error('formato_no_permitido');
    err.code = 'formato_no_permitido';
    throw err;
  }

  return { bytes, mimeType };
}
