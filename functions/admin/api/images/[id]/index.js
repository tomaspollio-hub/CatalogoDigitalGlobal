import { getProductImageById, deleteProductImage } from '../../../../_lib/db/queries.js';
import { deleteObjects } from '../../../../_lib/storage/r2.js';
import { json, errorResponse } from '../../../../_lib/http.js';

export async function onRequestGet(context) {
  const image = await getProductImageById(context.env.DB, context.params.id);
  if (!image) return errorResponse(404, 'image_not_found');
  return json({ image });
}

export async function onRequestDelete(context) {
  const { env } = context;
  const { id } = context.params;

  const image = await getProductImageById(env.DB, id);
  if (!image) return errorResponse(404, 'image_not_found');

  await deleteObjects(env.IMAGES, [
    image.originalStoragePath,
    image.catalogStoragePath,
    image.thumbnailStoragePath,
  ]);
  await deleteProductImage(env.DB, id);

  return json({ deleted: true });
}
