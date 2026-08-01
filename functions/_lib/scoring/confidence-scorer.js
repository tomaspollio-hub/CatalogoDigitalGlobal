/* ────────────────────────────────────────────────────────────────
   Puntaje de confianza (0-100) entre un producto interno y un
   candidato externo. Prioridad, de mayor a menor peso:
     1. Código de barras exacto
     2. Marca o laboratorio/fabricante
     3. Presentación (contenido en g/ml, cantidad de unidades)
     4. Título
     5. Categoría
   ──────────────────────────────────────────────────────────────── */

export const WEIGHTS = {
  barcodeExactMatch: 35,
  brandOrManufacturerMatch: 25,
  presentationMatch: 20,
  titleSimilarity: 15,
  categoryMatch: 5,
};

// Si el candidato trae un código de barras distinto al del producto, el
// resultado nunca puede pasar de esto — pase lo que pase con el resto de
// las señales. Existe para que un match "casi perfecto" de texto nunca
// tape una identidad de producto equivocada.
const BARCODE_MISMATCH_SCORE_CAP = 40;

function normalize(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text) {
  return new Set(normalize(text).split(' ').filter(Boolean));
}

function diceCoefficient(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  return (2 * intersection) / (setA.size + setB.size);
}

function extractQuantities(text) {
  const normalized = normalize(text);
  const matches = normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*(ml|mg|g|kg|l|cc|u|un|unid)/g);
  return [...matches].map((m) => ({ value: m[1].replace(',', '.'), unit: m[2] }));
}

function presentationMatches(productPresentation, candidateText) {
  const productQty = extractQuantities(productPresentation);
  if (productQty.length === 0) return false;
  const candidateNormalized = normalize(candidateText);
  // "100 ml" y "100ml" deben matchear igual — el espacio entre número y
  // unidad no es una señal real de diferencia de presentación.
  return productQty.some(({ value, unit }) =>
    new RegExp(`${value}\\s*${unit}\\b`).test(candidateNormalized)
  );
}

/**
 * @param {object} product Producto interno (name, brand, manufacturer, barcode, presentation, category)
 * @param {import('../providers/product-image-provider.js').ProductImageCandidate} candidate
 * @returns {{ score: number, matchReasons: string[], barcodeMismatch: boolean }}
 */
export function computeConfidenceScore(product, candidate) {
  let score = 0;
  const matchReasons = [];
  let barcodeMismatch = false;

  // 1. Código de barras
  if (product.barcode && candidate.barcode) {
    if (product.barcode === candidate.barcode) {
      score += WEIGHTS.barcodeExactMatch;
      matchReasons.push('Código de barras coincide exactamente');
    } else {
      barcodeMismatch = true;
      matchReasons.push('⚠ El código de barras del resultado no coincide con el del producto');
    }
  }

  // 2. Marca / fabricante
  const brandHit =
    product.brand && candidate.brand && normalize(product.brand) === normalize(candidate.brand);
  const manufacturerHit =
    product.manufacturer &&
    candidate.manufacturer &&
    normalize(product.manufacturer) === normalize(candidate.manufacturer);
  if (brandHit || manufacturerHit) {
    score += WEIGHTS.brandOrManufacturerMatch;
    if (brandHit) matchReasons.push(`Marca coincide (${product.brand})`);
    if (manufacturerHit) matchReasons.push(`Fabricante/laboratorio coincide (${product.manufacturer})`);
  }

  // 3. Presentación (contenido y/o cantidad de unidades)
  const candidateText = `${candidate.title || ''} ${candidate.description || ''}`;
  if (product.presentation && presentationMatches(product.presentation, candidateText)) {
    score += WEIGHTS.presentationMatch;
    matchReasons.push(`Presentación coincide (${product.presentation.trim()})`);
  }

  // 4. Título
  const titleSimilarity = diceCoefficient(product.name, candidate.title);
  if (titleSimilarity > 0) {
    score += Math.round(titleSimilarity * WEIGHTS.titleSimilarity);
    if (titleSimilarity >= 0.5) {
      matchReasons.push(`Título similar (${Math.round(titleSimilarity * 100)}%)`);
    }
  }

  // 5. Categoría
  if (product.category && candidate.category && normalize(product.category) === normalize(candidate.category)) {
    score += WEIGHTS.categoryMatch;
    matchReasons.push('Categoría coincide');
  }

  score = Math.min(100, Math.round(score));
  if (barcodeMismatch) score = Math.min(score, BARCODE_MISMATCH_SCORE_CAP);

  return { score, matchReasons, barcodeMismatch };
}

/** @param {number} score */
export function confidenceLevel(score) {
  if (score >= 80) return 'alta';
  if (score >= 50) return 'media';
  return 'baja';
}
