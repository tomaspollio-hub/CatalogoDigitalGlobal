import { ProductImageProvider } from './product-image-provider.js';
import { adaptBarcodeLookupResponse } from './barcode-lookup-adapter.js';

const API_BASE = 'https://api.barcodelookup.com/v3/products';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Nunca loguear `env.BARCODE_LOOKUP_API_KEY` ni incluirlo en errores:
 * `fetchBarcodeLookup` arma la URL con la key pero cualquier error se
 * relanza con un mensaje genérico, nunca con la URL completa.
 */
async function fetchBarcodeLookup(params, apiKey) {
  if (!apiKey) {
    const err = new Error('provider_not_configured');
    err.code = 'provider_not_configured';
    throw err;
  }

  const url = new URL(API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set('key', apiKey);
  url.searchParams.set('formatted', 'y');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url.toString(), { signal: controller.signal });
  } catch (e) {
    const err = new Error(e.name === 'AbortError' ? 'provider_timeout' : 'provider_unreachable');
    err.code = e.name === 'AbortError' ? 'provider_timeout' : 'provider_unreachable';
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 || res.status === 403) {
    const err = new Error('provider_invalid_key');
    err.code = 'provider_invalid_key';
    throw err;
  }
  if (res.status === 429) {
    const err = new Error('provider_rate_limited');
    err.code = 'provider_rate_limited';
    throw err;
  }
  if (res.status === 404) {
    return { products: [] };
  }
  if (!res.ok) {
    const err = new Error('provider_error');
    err.code = 'provider_error';
    throw err;
  }

  try {
    return await res.json();
  } catch {
    const err = new Error('provider_invalid_response');
    err.code = 'provider_invalid_response';
    throw err;
  }
}

export class BarcodeLookupService extends ProductImageProvider {
  /** @param {string} apiKey */
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
  }

  async searchByBarcode(barcode) {
    const raw = await fetchBarcodeLookup({ barcode }, this.apiKey);
    return adaptBarcodeLookupResponse(raw);
  }

  async searchByText({ title, brand, manufacturer, presentation } = {}) {
    const search = [title, brand, presentation].filter(Boolean).join(' ').trim();
    if (!search) return [];
    const raw = await fetchBarcodeLookup({ search, mfg: manufacturer || undefined }, this.apiKey);
    return adaptBarcodeLookupResponse(raw);
  }
}
