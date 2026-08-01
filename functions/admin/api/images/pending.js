import { findProductBySku, categoryGroup } from '../../../_lib/products.js';
import { getPendingReviewImages } from '../../../_lib/db/queries.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet(context) {
  const images = await getPendingReviewImages(context.env.DB);
  const items = images.map((img) => {
    const product = findProductBySku(img.productId);
    return {
      ...img,
      productName: product?.name || img.productId,
      productBrand: product?.brand,
      categoryGroup: product ? categoryGroup(product) : 'otro',
    };
  });
  return json({ items });
}
