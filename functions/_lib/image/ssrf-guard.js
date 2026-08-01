/* ────────────────────────────────────────────────────────────────
   Antes de pedirle a `fetch()` que descargue una imagen desde una
   URL que vino de una respuesta externa (Barcode Lookup), hay que
   asegurarse de que no apunte a infraestructura interna.

   Nota: el `fetch()` de Cloudflare Workers ya corre a través de la
   red de Cloudflare, que bloquea a nivel de plataforma los intentos
   de alcanzar rangos de IP privados/reservados (RFC1918, loopback,
   link-local) — esto es una capa adicional de defensa en profundidad
   a nivel de aplicación, no la única barrera.
   ──────────────────────────────────────────────────────────────── */

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local / metadata endpoints en la nube
  /^::1$/,
  /^\[::1\]$/,
  /^fc00:/i,
  /^fe80:/i,
  /^\[fc00:/i,
  /^\[fe80:/i,
];

/**
 * @param {string} urlString
 * @returns {{ safe: boolean, reason?: string, url?: URL }}
 */
export function checkUrlIsSafe(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return { safe: false, reason: 'url_invalida' };
  }

  if (url.protocol !== 'https:') {
    return { safe: false, reason: 'protocolo_no_permitido' };
  }

  if (url.port && url.port !== '443') {
    return { safe: false, reason: 'puerto_no_permitido' };
  }

  const hostname = url.hostname;
  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return { safe: false, reason: 'host_no_permitido' };
  }

  return { safe: true, url };
}
