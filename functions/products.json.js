/* ────────────────────────────────────────────────────────────────
   Ruta pública (sin auth, fuera de /admin/*) que sirve el catálogo
   completo: el mismo contenido de src/products.json, pero pisando
   el campo "image" con la imagen aprobada en el admin (tabla D1
   product_images) cuando exista. Así una imagen aprobada en /admin
   aparece en el catálogo público sin necesitar un nuevo deploy.
   ──────────────────────────────────────────────────────────────── */
import products from '../src/products.json' with { type: 'json' };
import { json } from './_lib/http.js';

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `SELECT product_id, catalog_storage_path, suggested_title FROM product_images
     WHERE is_primary = 1 AND status = 'approved' AND catalog_storage_path IS NOT NULL`
  ).all();

  const overrideByProductId = new Map(
    results.map((row) => [
      row.product_id,
      { image: `/img/${row.catalog_storage_path}`, name: row.suggested_title || undefined },
    ])
  );

  const merged = products.map((product) => {
    const override = overrideByProductId.get(product.sku);
    if (!override) return product;
    return { ...product, image: override.image, name: override.name || product.name };
  });

  return json(merged, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
