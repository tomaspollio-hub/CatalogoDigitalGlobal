import { findProductBySku, categoryGroup } from '../../../../_lib/products.js';
import { getProductImagesForProduct, getProductOverride, upsertProductOverride } from '../../../../_lib/db/queries.js';
import { json, errorResponse, readJsonBody } from '../../../../_lib/http.js';

const TEXT_FIELDS = ['name', 'brand', 'manufacturer', 'presentation', 'description'];
const DISPONIBILIDAD_VALUES = new Set(['disponible', 'a_consultar', 'sin_stock']);

export async function onRequestGet(context) {
  const { sku } = context.params;
  const product = findProductBySku(sku);
  if (!product) return errorResponse(404, 'product_not_found');

  const [images, override] = await Promise.all([
    getProductImagesForProduct(context.env.DB, sku),
    getProductOverride(context.env.DB, sku),
  ]);

  const effective = {
    ...product,
    ...(override &&
      Object.fromEntries(
        [...TEXT_FIELDS, 'minMultiple', 'disponibilidad'].map((f) => [f, override[f] ?? product[f]])
      )),
    isHidden: override?.isHidden || false,
  };

  return json({
    product: { ...effective, categoryGroup: categoryGroup(product) },
    original: product,
    override,
    images,
  });
}

/** Guarda/actualiza la ficha editable del producto (nombre, marca, fabricante, presentación, descripción, mínimo, disponibilidad, ocultar). */
export async function onRequestPut(context) {
  const { sku } = context.params;
  const product = findProductBySku(sku);
  if (!product) return errorResponse(404, 'product_not_found');

  let body;
  try {
    body = await readJsonBody(context.request);
  } catch (e) {
    return errorResponse(400, e.code);
  }

  const fields = {};
  for (const key of TEXT_FIELDS) {
    if (typeof body[key] === 'string') fields[key] = body[key].trim();
  }
  if (Number.isInteger(body.minMultiple) && body.minMultiple > 0) fields.minMultiple = body.minMultiple;
  if (typeof body.disponibilidad === 'string' && DISPONIBILIDAD_VALUES.has(body.disponibilidad)) {
    fields.disponibilidad = body.disponibilidad;
  }
  fields.isHidden = !!body.isHidden;

  const adminEmail = context.data.adminEmail;
  await upsertProductOverride(context.env.DB, sku, fields, adminEmail);

  const override = await getProductOverride(context.env.DB, sku);
  return json({ override });
}
