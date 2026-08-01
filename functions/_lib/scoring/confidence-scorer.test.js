import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeConfidenceScore, confidenceLevel } from './confidence-scorer.js';

const product = {
  name: 'Actron Ped 4% Susp X 100 Ml',
  brand: 'Actron',
  manufacturer: 'Bayer Consumer',
  barcode: '7793640002093',
  presentation: 'x 100 ML',
  category: 'Analgésicos y Antiinflamatorios',
};

test('código de barras exacto + marca + presentación + título -> coincidencia alta', () => {
  const candidate = {
    title: 'Actron Ped 4% Suspension x 100 ml',
    brand: 'Actron',
    manufacturer: 'Bayer Consumer',
    barcode: '7793640002093',
    category: 'Analgésicos y Antiinflamatorios',
    description: 'Suspensión 100 ml',
  };
  const { score, matchReasons, barcodeMismatch } = computeConfidenceScore(product, candidate);
  assert.equal(barcodeMismatch, false);
  assert.ok(score >= 80, `esperaba score alto, dio ${score}`);
  assert.equal(confidenceLevel(score), 'alta');
  assert.ok(matchReasons.some((r) => r.includes('Código de barras')));
});

test('código de barras distinto cappea el score aunque el resto matchee perfecto', () => {
  const candidate = {
    title: product.name,
    brand: product.brand,
    manufacturer: product.manufacturer,
    barcode: '0000000000000',
    category: product.category,
    description: product.presentation,
  };
  const { score, barcodeMismatch, matchReasons } = computeConfidenceScore(product, candidate);
  assert.equal(barcodeMismatch, true);
  assert.ok(score <= 40, `esperaba score <= 40 por mismatch, dio ${score}`);
  assert.ok(matchReasons.some((r) => r.includes('⚠')));
});

test('sin ninguna señal en común -> score bajo', () => {
  const candidate = {
    title: 'Producto totalmente distinto',
    brand: 'Otra Marca',
    manufacturer: 'Otro Fabricante',
    barcode: '1111111111111',
    category: 'Limpieza',
  };
  const { score } = computeConfidenceScore(product, candidate);
  assert.equal(confidenceLevel(score), 'baja');
});

test('sin código de barras en ninguno de los dos lados no genera falso mismatch', () => {
  const noBarcodeProduct = { ...product, barcode: undefined };
  const candidate = { title: product.name, brand: product.brand };
  const { barcodeMismatch } = computeConfidenceScore(noBarcodeProduct, candidate);
  assert.equal(barcodeMismatch, false);
});

test('confidenceLevel: umbrales', () => {
  assert.equal(confidenceLevel(100), 'alta');
  assert.equal(confidenceLevel(80), 'alta');
  assert.equal(confidenceLevel(79), 'media');
  assert.equal(confidenceLevel(50), 'media');
  assert.equal(confidenceLevel(49), 'baja');
  assert.equal(confidenceLevel(0), 'baja');
});
