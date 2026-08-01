import { findProductBySku, categoryGroup } from '../../../../_lib/products.js';
import { getProductImageById, updateProductImage, setPrimaryImage, getProductImagesForProduct } from '../../../../_lib/db/queries.js';
import { json, errorResponse, readJsonBody } from '../../../../_lib/http.js';

export async function onRequestPost(context) {
  const { env } = context;
  const { id } = context.params;

  let body;
  try {
    body = await readJsonBody(context.request);
  } catch (e) {
    return errorResponse(400, e.code);
  }

  const image = await getProductImageById(env.DB, id);
  if (!image) return errorResponse(404, 'image_not_found');

  const product = findProductBySku(image.productId);
  if (!product) return errorResponse(404, 'product_not_found');

  const group = categoryGroup(product);
  const isIllustrative = !!body.isIllustrative;

  if (group === 'medicamento') {
    if (isIllustrative) return errorResponse(400, 'illustrative_not_allowed_for_medication');
    if (!body.medicationConfirmation) return errorResponse(400, 'medication_confirmation_required');
  }

  const existingImages = await getProductImagesForProduct(env.DB, image.productId);
  const hasOtherPrimary = existingImages.some((img) => img.id !== id && img.isPrimary && img.status === 'approved');
  if (hasOtherPrimary && !body.confirmReplace) {
    return errorResponse(409, 'replace_confirmation_required');
  }

  const adminEmail = context.data.adminEmail;
  await updateProductImage(env.DB, id, {
    status: 'approved',
    isIllustrative,
    approvedBy: adminEmail,
    approvedAt: new Date().toISOString(),
  });
  await setPrimaryImage(env.DB, image.productId, id);

  const updated = await getProductImageById(env.DB, id);
  return json({ image: updated });
}
