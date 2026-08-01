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

  const [imagesResult, overridesResult] = await Promise.all([
    env.DB.prepare(
      `SELECT product_id, catalog_storage_path, suggested_title FROM product_images
       WHERE is_primary = 1 AND status = 'approved' AND catalog_storage_path IS NOT NULL`
    ).all(),
    env.DB.prepare('SELECT * FROM product_overrides').all(),
  ]);

  const imageByProductId = new Map(
    imagesResult.results.map((row) => [
      row.product_id,
      { image: `/img/${row.catalog_storage_path}`, name: row.suggested_title || undefined },
    ])
  );
  const fichaByProductId = new Map(overridesResult.results.map((row) => [row.product_id, row]));

  const merged = products.map((product) => {
    const image = imageByProductId.get(product.sku);
    const ficha = fichaByProductId.get(product.sku);
    return {
      ...product,
      image: image ? image.image : product.image,
      name: ficha?.name || image?.name || product.name,
      brand: ficha?.brand || product.brand,
      manufacturer: ficha?.manufacturer || product.manufacturer,
      presentation: ficha?.presentation || product.presentation,
    };
  });

  return json(merged, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
