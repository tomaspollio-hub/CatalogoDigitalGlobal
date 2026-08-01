/* ────────────────────────────────────────────────────────────────
   Gate de acceso para todo lo que cuelga de /admin/* (la página y
   los endpoints /admin/api/*). Cloudflare Access ya bloquea el
   tráfico no autenticado a nivel de borde si la ruta está protegida
   en el dashboard — esto es una segunda verificación, en el propio
   Worker, del JWT que Access inyecta, para no depender ciegamente
   de que esa configuración externa esté bien hecha.

   Requiere en el entorno (ver wrangler.toml [vars]):
     CF_ACCESS_TEAM_DOMAIN  (ej: "farmaciasglobal.cloudflareaccess.com")
     CF_ACCESS_AUD          (el AUD tag de la aplicación de Access)
   ──────────────────────────────────────────────────────────────── */

const JWKS_CACHE_KEY = 'https://internal/admin-access-jwks-cache';
const JWKS_CACHE_TTL_SECONDS = 3600;

function base64UrlToUint8Array(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJwtPart(part) {
  return JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(part)));
}

async function getJwks(teamDomain) {
  const cache = caches.default;
  const cacheKey = new Request(JWKS_CACHE_KEY);
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('jwks_fetch_failed');
  const jwks = await res.json();

  const cacheable = new Response(JSON.stringify(jwks), {
    headers: { 'Cache-Control': `max-age=${JWKS_CACHE_TTL_SECONDS}` },
  });
  await cache.put(cacheKey, cacheable);
  return jwks;
}

async function importRsaKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

async function verifyAccessJwt(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed_token');
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeJwtPart(headerPart);
  const payload = decodeJwtPart(payloadPart);

  const jwks = await getJwks(env.CF_ACCESS_TEAM_DOMAIN);
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown_key');

  const key = await importRsaKey(jwk);
  const signature = base64UrlToUint8Array(signaturePart);
  const signedData = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signedData);
  if (!valid) throw new Error('invalid_signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('expired');
  if (payload.iss && !payload.iss.includes(env.CF_ACCESS_TEAM_DOMAIN)) throw new Error('bad_issuer');

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.CF_ACCESS_AUD)) throw new Error('bad_audience');

  if (!payload.email) throw new Error('missing_email');
  return payload;
}

export async function onRequest(context) {
  const { request, env, next } = context;

  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) {
    return new Response('Acceso admin no configurado.', { status: 503 });
  }

  const token =
    request.headers.get('Cf-Access-Jwt-Assertion') ||
    request.headers.get('cookie')?.match(/CF_Authorization=([^;]+)/)?.[1];

  if (!token) {
    return new Response('No autenticado.', { status: 401 });
  }

  let claims;
  try {
    claims = await verifyAccessJwt(token, env);
  } catch {
    // No exponer el motivo técnico exacto de la falla de verificación.
    return new Response('No autenticado.', { status: 401 });
  }

  context.data.adminEmail = claims.email;
  return next();
}
