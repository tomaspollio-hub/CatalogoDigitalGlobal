import { BarcodeLookupService } from './providers/barcode-lookup-service.js';
import { computeConfidenceScore } from './scoring/confidence-scorer.js';
import { checkDailyLimit } from './rate-limit.js';
import {
  getCachedBarcodeSearch,
  setCachedBarcodeSearch,
  insertSearchLog,
} from './db/queries.js';

const BARCODE_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

function scoreCandidates(product, candidates) {
  return candidates
    .map((candidate) => {
      const { score, matchReasons, barcodeMismatch } = computeConfidenceScore(product, candidate);
      return { ...candidate, confidenceScore: score, matchReasons, barcodeMismatch };
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * @returns {Promise<{ candidates: any[], usage: { usedToday: number, dailyLimit: number } }>}
 */
export async function runBarcodeSearch(env, product, barcode, adminEmail) {
  const dailyLimit = Number(env.BARCODE_LOOKUP_DAILY_LIMIT || 100);
  const startedAt = Date.now();

  const cached = await getCachedBarcodeSearch(env.DB, barcode, BARCODE_CACHE_MAX_AGE_SECONDS);
  if (cached) {
    const candidates = scoreCandidates(product, cached);
    await insertSearchLog(env.DB, {
      userEmail: adminEmail,
      queryType: 'barcode',
      queryValue: barcode,
      provider: env.PRODUCT_IMAGE_PROVIDER || 'barcode_lookup',
      resultsCount: candidates.length,
      imageFound: candidates.length > 0,
      responseTimeMs: Date.now() - startedAt,
      fromCache: true,
    });
    const usedToday = await checkDailyLimit(env.DB, dailyLimit);
    return { candidates, usage: { usedToday: usedToday.usedToday, dailyLimit } };
  }

  const limit = await checkDailyLimit(env.DB, dailyLimit);
  if (!limit.allowed) {
    const err = new Error('daily_limit_reached');
    err.code = 'daily_limit_reached';
    throw err;
  }

  const provider = new BarcodeLookupService(env.BARCODE_LOOKUP_API_KEY);
  let raw;
  let errorCode = null;
  try {
    raw = await provider.searchByBarcode(barcode);
  } catch (e) {
    errorCode = e.code || 'provider_error';
    raw = [];
  }

  const candidates = scoreCandidates(product, raw);

  await insertSearchLog(env.DB, {
    userEmail: adminEmail,
    queryType: 'barcode',
    queryValue: barcode,
    provider: env.PRODUCT_IMAGE_PROVIDER || 'barcode_lookup',
    resultsCount: candidates.length,
    imageFound: candidates.length > 0,
    responseTimeMs: Date.now() - startedAt,
    errorMessage: errorCode,
    fromCache: false,
  });

  if (errorCode) {
    const err = new Error(errorCode);
    err.code = errorCode;
    throw err;
  }

  if (raw.length > 0) {
    await setCachedBarcodeSearch(env.DB, barcode, env.PRODUCT_IMAGE_PROVIDER || 'barcode_lookup', raw);
  }

  return { candidates, usage: { usedToday: limit.usedToday + 1, dailyLimit } };
}

export async function runTextSearch(env, product, query, adminEmail) {
  const dailyLimit = Number(env.BARCODE_LOOKUP_DAILY_LIMIT || 100);
  const startedAt = Date.now();

  const limit = await checkDailyLimit(env.DB, dailyLimit);
  if (!limit.allowed) {
    const err = new Error('daily_limit_reached');
    err.code = 'daily_limit_reached';
    throw err;
  }

  const provider = new BarcodeLookupService(env.BARCODE_LOOKUP_API_KEY);
  const queryValue = [query.title, query.brand, query.manufacturer, query.presentation]
    .filter(Boolean)
    .join(' | ');

  let raw;
  let errorCode = null;
  try {
    raw = await provider.searchByText(query);
  } catch (e) {
    errorCode = e.code || 'provider_error';
    raw = [];
  }

  const candidates = scoreCandidates(product, raw);

  await insertSearchLog(env.DB, {
    userEmail: adminEmail,
    queryType: 'text',
    queryValue,
    provider: env.PRODUCT_IMAGE_PROVIDER || 'barcode_lookup',
    resultsCount: candidates.length,
    imageFound: candidates.length > 0,
    responseTimeMs: Date.now() - startedAt,
    errorMessage: errorCode,
    fromCache: false,
  });

  if (errorCode) {
    const err = new Error(errorCode);
    err.code = errorCode;
    throw err;
  }

  return { candidates, usage: { usedToday: limit.usedToday + 1, dailyLimit } };
}
