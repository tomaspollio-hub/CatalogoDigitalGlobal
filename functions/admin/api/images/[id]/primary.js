import { getProductImageById, setPrimaryImage } from '../../../../_lib/db/queries.js';
import { json, errorResponse } from '../../../../_lib/http.js';

export async function onRequestPost(context) {
  const { env } = context;
  const { id } = context.params;

  const image = await getProductImageById(env.DB, id);
  if (!image) return errorResponse(404, 'image_not_found');
  if (image.status !== 'approved') return errorResponse(400, 'validation_error');

  await setPrimaryImage(env.DB, image.productId, id);
  const updated = await getProductImageById(env.DB, id);
  return json({ image: updated });
}
