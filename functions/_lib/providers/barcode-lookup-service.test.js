import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BarcodeLookupService } from './barcode-lookup-service.js';

const originalFetch = globalThis.fetch;
function stubFetch(handler) {
  globalThis.fetch = handler;
}
function restoreFetch() {
  globalThis.fetch = originalFetch;
}

test('sin API key configurada -> provider_not_configured, nunca llama a fetch', async () => {
  let called = false;
  stubFetch(async () => {
    called = true;
    throw new Error('no debería llamarse');
  });
  const service = new BarcodeLookupService(null);
  await assert.rejects(() => service.searchByBarcode('123'), { code: 'provider_not_configured' });
  assert.equal(called, false);
  restoreFetch();
});

test('la URL nunca aparece en el mensaje de error (no filtra la key)', async () => {
  stubFetch(async () => new Response('unauthorized', { status: 401 }));
  const service = new BarcodeLookupService('secreta-123');
  try {
    await service.searchByBarcode('123');
    assert.fail('debería haber lanzado');
  } catch (e) {
    assert.equal(e.code, 'provider_invalid_key');
    assert.ok(!e.message.includes('secreta-123'));
  }
  restoreFetch();
});

test('429 -> provider_rate_limited', async () => {
  stubFetch(async () => new Response('', { status: 429 }));
  const service = new BarcodeLookupService('key');
  await assert.rejects(() => service.searchByBarcode('123'), { code: 'provider_rate_limited' });
  restoreFetch();
});

test('404 -> sin resultados, no es error', async () => {
  stubFetch(async () => new Response('', { status: 404 }));
  const service = new BarcodeLookupService('key');
  const candidates = await service.searchByBarcode('123');
  assert.deepEqual(candidates, []);
  restoreFetch();
});

test('200 con productos -> candidatos normalizados', async () => {
  stubFetch(async () =>
    new Response(
      JSON.stringify({ products: [{ title: 'X', images: ['https://example.com/1.jpg'] }] }),
      { status: 200 }
    )
  );
  const service = new BarcodeLookupService('key');
  const candidates = await service.searchByBarcode('123');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].imageUrl, 'https://example.com/1.jpg');
  restoreFetch();
});

test('respuesta no-JSON -> provider_invalid_response', async () => {
  stubFetch(async () => new Response('<html>no soy json</html>', { status: 200 }));
  const service = new BarcodeLookupService('key');
  await assert.rejects(() => service.searchByBarcode('123'), { code: 'provider_invalid_response' });
  restoreFetch();
});

test('searchByText sin ningún campo -> []', async () => {
  const service = new BarcodeLookupService('key');
  const candidates = await service.searchByText({});
  assert.deepEqual(candidates, []);
});

test('fetch que rechaza con AbortError -> provider_timeout (sin esperar el timeout real)', async () => {
  stubFetch(async () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    throw err;
  });
  const service = new BarcodeLookupService('key');
  await assert.rejects(() => service.searchByBarcode('123'), { code: 'provider_timeout' });
  restoreFetch();
});

test('fetch que rechaza por red -> provider_unreachable', async () => {
  stubFetch(async () => {
    throw new Error('network down');
  });
  const service = new BarcodeLookupService('key');
  await assert.rejects(() => service.searchByBarcode('123'), { code: 'provider_unreachable' });
  restoreFetch();
});
