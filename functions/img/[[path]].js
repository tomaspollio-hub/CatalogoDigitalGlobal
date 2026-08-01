/* ────────────────────────────────────────────────────────────────
   Ruta pública (sin auth — la usa el catálogo público, no el admin)
   que sirve imágenes ya aprobadas desde R2. Solo expone las variantes
   "catalog" y "thumbnails": "sources" (el archivo original descargado
   de la fuente externa) nunca se sirve públicamente.
   ──────────────────────────────────────────────────────────────── */
import { getObject } from '../_lib/storage/r2.js';

const ALLOWED_VARIANTS = new Set(['catalog', 'thumbnails']);

export async function onRequestGet(context) {
  const segments = context.params.path || [];
  // Se espera: products/{productId}/{variant}/{archivo}
  if (segments[0] !== 'products' || segments.length !== 4) {
    return new Response('Not found', { status: 404 });
  }
  const [, , variant] = segments;
  if (!ALLOWED_VARIANTS.has(variant)) {
    return new Response('Not found', { status: 404 });
  }

  const key = segments.join('/');
  const object = await getObject(context.env.IMAGES, key);
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.httpEtag,
    },
  });
}
