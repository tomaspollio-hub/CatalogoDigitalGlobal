import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDailyLimit } from './rate-limit.js';

function fakeDb(totalToday) {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async first() {
          return { total: totalToday };
        },
      };
    },
  };
}

test('permite consultas por debajo del límite diario', async () => {
  const result = await checkDailyLimit(fakeDb(50), 100);
  assert.equal(result.allowed, true);
  assert.equal(result.usedToday, 50);
});

test('bloquea al llegar exactamente al límite', async () => {
  const result = await checkDailyLimit(fakeDb(100), 100);
  assert.equal(result.allowed, false);
});

test('bloquea por encima del límite', async () => {
  const result = await checkDailyLimit(fakeDb(150), 100);
  assert.equal(result.allowed, false);
});
