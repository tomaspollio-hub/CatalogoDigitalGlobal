import { findProductBySku, categoryGroup } from '../../../_lib/products.js';
import { getProductImagesForProduct } from '../../../_lib/db/queries.js';
import { json, errorResponse } from '../../../_lib/http.js';

export async function onRequestGet(context) {
  const { sku } = context.params;
  const product = findProductBySku(sku);
  if (!product) return errorResponse(404, 'product_not_found');

  const images = await getProductImagesForProduct(context.env.DB, sku);
  return json({
    product: { ...product, categoryGroup: categoryGroup(product) },
    images,
  });
}
