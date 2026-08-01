import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMedication, categoryGroup, searchProducts, findProductBySku, findProductByBarcode } from './products.js';

test('categoriza medicamentos correctamente', () => {
  assert.equal(isMedication({ category: 'Antibióticos' }), true);
  assert.equal(isMedication({ category: 'Otros Medicamentos' }), true);
  assert.equal(isMedication({ category: 'Limpieza' }), false);
});

test('categoryGroup agrupa cada categoría real del catálogo', () => {
  assert.equal(categoryGroup({ category: 'Antibióticos' }), 'medicamento');
  assert.equal(categoryGroup({ category: 'Limpieza' }), 'limpieza');
  assert.equal(categoryGroup({ category: 'Insumos Descartables' }), 'accesorio_medico');
  assert.equal(categoryGroup({ category: 'Cosmética y Cuidado Personal' }), 'perfumeria_cuidado_personal');
  assert.equal(categoryGroup({ category: 'Alimentos y Snacks' }), 'otro');
});

test('searchProducts encuentra por nombre/marca parcial (case-insensitive)', () => {
  const results = searchProducts('dermaglos');
  assert.ok(results.length > 0);
  assert.ok(
    results.every(
      (p) =>
        p.name.toLowerCase().includes('dermaglos') ||
        (p.brand || '').toLowerCase().includes('dermaglos')
    )
  );
});

test('searchProducts sin query devuelve el límite pedido', () => {
  const results = searchProducts('', 5);
  assert.equal(results.length, 5);
});

test('findProductBySku / findProductByBarcode devuelven null si no existe', () => {
  assert.equal(findProductBySku('NO-EXISTE-999'), null);
  assert.equal(findProductByBarcode('0000000000000'), null);
});
