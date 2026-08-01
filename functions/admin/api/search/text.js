import { findProductBySku } from '../../../_lib/products.js';
import { runTextSearch } from '../../../_lib/search-flow.js';
import { json, errorResponse, readJsonBody } from '../../../_lib/http.js';

export async function onRequestPost(context) {
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch (e) {
    return errorResponse(400, e.code);
  }

  const { sku, title, brand, manufacturer, presentation } = body;
  if (!sku || !(title || brand || presentation)) {
    return errorResponse(400, 'validation_error');
  }

  const product = findProductBySku(sku);
  if (!product) return errorResponse(404, 'product_not_found');

  try {
    const { candidates, usage } = await runTextSearch(
      context.env,
      product,
      { title, brand, manufacturer, presentation },
      context.data.adminEmail
    );
    if (candidates.length === 0) {
      return json({ candidates: [], usage, message: 'no_results_text' });
    }
    return json({ candidates, usage });
  } catch (e) {
    const status = e.code === 'daily_limit_reached' ? 429 : 502;
    return errorResponse(status, e.code || 'provider_error');
  }
}
