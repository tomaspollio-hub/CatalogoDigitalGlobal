import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadImageSafely } from './download.js';

const originalFetch = globalThis.fetch;
function stubFetch(handler) {
  globalThis.fetch = handler;
}
function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function jpegBytes(padding = 100) {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(padding).fill(0)]);
}

test('URL no segura -> nunca llama a fetch', async () => {
  let called = false;
  stubFetch(async () => {
    called = true;
    return new Response();
  });
  await assert.rejects(
    () => downloadImageSafely('http://localhost/x.jpg', { maxSizeBytes: 1024 }),
    { code: 'url_no_permitida' }
  );
  assert.equal(called, false);
  restoreFetch();
});

test('descarga válida detecta JPEG por magic bytes', async () => {
  stubFetch(async () => new Response(jpegBytes(), { status: 200 }));
  const result = await downloadImageSafely('https://example.com/x.jpg', { maxSizeBytes: 1024 * 1024 });
  assert.equal(result.mimeType, 'image/jpeg');
  restoreFetch();
});

test('rechaza por Content-Length declarado por encima del máximo', async () => {
  stubFetch(async () =>
    new Response(jpegBytes(), { status: 200, headers: { 'content-length': String(50 * 1024 * 1024) } })
  );
  await assert.rejects(
    () => downloadImageSafely('https://example.com/x.jpg', { maxSizeBytes: 1024 * 1024 }),
    { code: 'imagen_demasiado_grande' }
  );
  restoreFetch();
});

test('rechaza por tamaño real aunque no venga Content-Length', async () => {
  const bigBytes = new Uint8Array(2 * 1024 * 1024).fill(0);
  bigBytes.set([0xff, 0xd8, 0xff], 0);
  stubFetch(async () => new Response(bigBytes, { status: 200 }));
  await assert.rejects(
    () => downloadImageSafely('https://example.com/x.jpg', { maxSizeBytes: 1024 * 1024 }),
    { code: 'imagen_demasiado_grande' }
  );
  restoreFetch();
});

test('rechaza formato no reconocido (no matchea ningún magic number)', async () => {
  stubFetch(async () => new Response(new Uint8Array([1, 2, 3, 4, 5]), { status: 200 }));
  await assert.rejects(
    () => downloadImageSafely('https://example.com/x.jpg', { maxSizeBytes: 1024 }),
    { code: 'formato_no_permitido' }
  );
  restoreFetch();
});

test('respuesta HTTP no-ok -> descarga_fallida', async () => {
  stubFetch(async () => new Response(null, { status: 500 }));
  await assert.rejects(
    () => downloadImageSafely('https://example.com/x.jpg', { maxSizeBytes: 1024 }),
    { code: 'descarga_fallida' }
  );
  restoreFetch();
});
