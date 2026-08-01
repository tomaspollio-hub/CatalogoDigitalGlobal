import { getProductImageById, updateProductImage } from '../../../../_lib/db/queries.js';
import { json, errorResponse } from '../../../../_lib/http.js';

export async function onRequestPost(context) {
  const { env } = context;
  const { id } = context.params;

  const image = await getProductImageById(env.DB, id);
  if (!image) return errorResponse(404, 'image_not_found');

  await updateProductImage(env.DB, id, {
    status: 'rejected',
    rejectedBy: context.data.adminEmail,
    rejectedAt: new Date().toISOString(),
  });

  const updated = await getProductImageById(env.DB, id);
  return json({ image: updated });
}
