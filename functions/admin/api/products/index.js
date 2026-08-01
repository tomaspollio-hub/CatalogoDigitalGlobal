import { searchProductsAdvanced, ALL_CATEGORIES } from '../../../_lib/products.js';
import { getApprovedPrimaryThumbnails, getHiddenProductIds } from '../../../_lib/db/queries.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category') || undefined;
  const hasImageParam = url.searchParams.get('hasImage');
  const hasImage = hasImageParam === 'true' ? true : hasImageParam === 'false' ? false : undefined;

  const [thumbnailByProductId, hiddenSkuSet] = await Promise.all([
    getApprovedPrimaryThumbnails(env.DB),
    getHiddenProductIds(env.DB),
  ]);
  const approvedSkuSet = new Set(thumbnailByProductId.keys());

  const matched = searchProductsAdvanced({ query: q, category, hasImage }, approvedSkuSet, 500);

  const results = matched.map((p) => {
    const thumbnailPath = thumbnailByProductId.get(p.sku);
    return {
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      brand: p.brand,
      manufacturer: p.manufacturer,
      category: p.category,
      presentation: p.presentation,
      image: thumbnailPath ? `/img/${thumbnailPath}` : null,
      isHidden: hiddenSkuSet.has(p.sku),
    };
  });
  return json({ products: results, categories: ALL_CATEGORIES });
}
