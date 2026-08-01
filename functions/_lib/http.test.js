import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorResponse, json } from './http.js';

test('errorResponse devuelve mensaje amigable conocido', async () => {
  const res = errorResponse(404, 'product_not_found');
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.error, 'No encontramos el producto.');
});

test('errorResponse con código desconocido cae al mensaje genérico (no filtra detalles internos)', async () => {
  const res = errorResponse(500, 'algo_interno_rarisimo');
  const body = await res.json();
  assert.equal(body.error, 'Ocurrió un error inesperado. Probá de nuevo.');
});

test('json() setea content-type', () => {
  const res = json({ ok: true });
  assert.equal(res.headers.get('Content-Type'), 'application/json; charset=utf-8');
});
