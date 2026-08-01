import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptBarcodeLookupResponse } from './barcode-lookup-adapter.js';

test('respuesta sin products -> sin candidatos', () => {
  assert.deepEqual(adaptBarcodeLookupResponse({}), []);
  assert.deepEqual(adaptBarcodeLookupResponse({ products: [] }), []);
});

test('respuesta con múltiples imágenes propias + tiendas', () => {
  const raw = {
    products: [
      {
        title: 'Producto X',
        brand: 'Marca X',
        manufacturer: 'Fabricante X',
        barcode_number: '123',
        category: 'Cat X',
        images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
        stores: [{ store_name: 'Farmacia Y', image: 'https://example.com/3.jpg', link: 'https://example.com/p/3' }],
      },
    ],
  };
  const candidates = adaptBarcodeLookupResponse(raw);
  assert.equal(candidates.length, 3);
  assert.ok(candidates.every((c) => c.sourceName.includes('Barcode Lookup')));
  assert.equal(candidates[2].sourcePageUrl, 'https://example.com/p/3');
});

test('elimina candidatos duplicados por imageUrl', () => {
  const raw = {
    products: [
      {
        title: 'Producto X',
        images: ['https://example.com/1.jpg'],
        stores: [{ store_name: 'Y', image: 'https://example.com/1.jpg', link: 'https://example.com/p' }],
      },
    ],
  };
  const candidates = adaptBarcodeLookupResponse(raw);
  assert.equal(candidates.length, 1);
});

test('ignora productos/imágenes sin url', () => {
  const raw = { products: [{ title: 'X', images: [null, ''], stores: [{ image: null }] }] };
  assert.deepEqual(adaptBarcodeLookupResponse(raw), []);
});
