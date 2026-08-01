import { findProductBySku } from '../../../_lib/products.js';
import { runBarcodeSearch } from '../../../_lib/search-flow.js';
import { json, errorResponse, readJsonBody } from '../../../_lib/http.js';

export async function onRequestPost(context) {
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch (e) {
    return errorResponse(400, e.code);
  }

  const { sku, barcode } = body;
  if (!sku || !barcode || !/^\d{6,14}$/.test(String(barcode))) {
    return errorResponse(400, 'validation_error');
  }

  const product = findProductBySku(sku);
  if (!product) return errorResponse(404, 'product_not_found');

  try {
    const { candidates, usage } = await runBarcodeSearch(context.env, product, String(barcode), context.data.adminEmail);
    if (candidates.length === 0) {
      return json({ candidates: [], usage, message: 'no_results_barcode' });
    }
    return json({ candidates, usage });
  } catch (e) {
    const status = e.code === 'daily_limit_reached' ? 429 : 502;
    return errorResponse(status, e.code || 'provider_error');
  }
}
