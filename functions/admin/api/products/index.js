import { searchProducts } from '../../../_lib/products.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q') || '';
  const results = searchProducts(q, 25).map((p) => ({
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    manufacturer: p.manufacturer,
    category: p.category,
    presentation: p.presentation,
    image: p.image || null,
  }));
  return json({ products: results });
}
