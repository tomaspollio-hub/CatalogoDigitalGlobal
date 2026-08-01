import { searchProducts, searchProductsWithImageFilter } from '../../../_lib/products.js';
import { getApprovedPrimaryProductIds } from '../../../_lib/db/queries.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q') || '';
  const hasImageParam = url.searchParams.get('hasImage');
  const hasImage = hasImageParam === 'true' ? true : hasImageParam === 'false' ? false : undefined;

  let matched;
  if (hasImage === undefined) {
    matched = searchProducts(q, 25);
  } else {
    const approvedSkuSet = await getApprovedPrimaryProductIds(env.DB);
    matched = searchProductsWithImageFilter(q, hasImage, approvedSkuSet, 25);
  }

  const results = matched.map((p) => ({
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    manufacturer: p.manufacturer,
    category: p.category,
    presentation: p.presentation,
    image: p.image || null,
  }));
  return json({ products: results });
}
