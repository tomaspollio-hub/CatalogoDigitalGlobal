import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUrlIsSafe } from './ssrf-guard.js';

test('acepta HTTPS público', () => {
  assert.equal(checkUrlIsSafe('https://images.example.com/producto.jpg').safe, true);
});

test('rechaza HTTP (no HTTPS)', () => {
  assert.equal(checkUrlIsSafe('http://images.example.com/producto.jpg').safe, false);
});

test('rechaza localhost', () => {
  assert.equal(checkUrlIsSafe('https://localhost/producto.jpg').safe, false);
});

test('rechaza 127.0.0.1', () => {
  assert.equal(checkUrlIsSafe('https://127.0.0.1/producto.jpg').safe, false);
});

test('rechaza rangos privados RFC1918', () => {
  assert.equal(checkUrlIsSafe('https://10.0.0.5/x.jpg').safe, false);
  assert.equal(checkUrlIsSafe('https://172.16.0.5/x.jpg').safe, false);
  assert.equal(checkUrlIsSafe('https://192.168.1.5/x.jpg').safe, false);
});

test('rechaza metadata link-local (169.254.x.x)', () => {
  assert.equal(checkUrlIsSafe('https://169.254.169.254/latest/meta-data').safe, false);
});

test('rechaza puertos no estándar', () => {
  assert.equal(checkUrlIsSafe('https://images.example.com:8443/x.jpg').safe, false);
});

test('rechaza URL malformada', () => {
  assert.equal(checkUrlIsSafe('no-es-una-url').safe, false);
});
