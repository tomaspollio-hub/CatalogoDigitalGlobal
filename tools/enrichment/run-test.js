/* ────────────────────────────────────────────────────────────────
   Etapa 1 — Modo prueba.
   Búsqueda + reporte de confianza sobre 10 productos. NO escribe en
   products.json, NO descarga ni procesa imágenes, NO toca /public.
   Corre con: node run-test.js
   ──────────────────────────────────────────────────────────────── */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONFIG } from './config.js';
import { selectCandidates } from './candidate-selector.js';
import { scoreCandidate } from './confidence-scorer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolvePath = (p) => path.resolve(__dirname, p);

async function loadJson(relativePath) {
  const raw = await readFile(resolvePath(relativePath), 'utf-8');
  return JSON.parse(raw);
}

function normalize(str) {
  return String(str ?? '').toLowerCase().trim();
}

async function main() {
  const products = await loadJson(CONFIG.paths.products);
  const manualResults = await loadJson(CONFIG.paths.manualSearchResults);

  const candidates = selectCandidates(products, { limit: 10 });

  const entries = candidates.map((product) => {
    const found = manualResults[product.sku];

    if (!found) {
      return {
        sku: product.sku,
        name: product.name,
        gtin: product.barcode,
        status: 'pending',
        reason: 'Sin resultados de búsqueda (proveedor de imágenes no configurado / sin coincidencias).',
      };
    }

    const signals = {
      // Ningún resultado de esta prueba trae un GTIN confirmado por la fuente:
      // los códigos de products.json son de ejemplo y no existen realmente.
      gtinExactMatch: Boolean(found.confirmedGtin && found.confirmedGtin === product.barcode),
      nameSimilarity: found.nameSimilarity,
      brandMatch: Boolean(
        product.brand && found.foundBrand && normalize(product.brand) === normalize(found.foundBrand)
      ),
      presentationMatch: Boolean(found.presentationMatch),
      sourceAuthority: found.domainType,
      imageQuality: found.imageQuality,
    };

    const { score, status, breakdown } = scoreCandidate(signals, CONFIG);

    // Regla de negocio: productos controlados siempre van a revisión humana,
    // sin importar qué tan alto sea el puntaje.
    const finalStatus = product.controlado && status === 'auto_assigned' ? 'pending_review' : status;

    return {
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      gtin: product.barcode,
      presentation: product.presentation,
      controlado: product.controlado,
      source: {
        url: found.sourceUrl,
        domain: found.domain,
        domainType: found.domainType,
      },
      matchSignals: signals,
      scoreBreakdown: breakdown,
      confidenceScore: score,
      status: finalStatus,
      notes: found.notes ?? null,
    };
  });

  const summary = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    stage: 'etapa-1-modo-prueba',
    totalCandidates: entries.length,
    summary,
    thresholds: CONFIG.thresholds,
    entries,
  };

  await writeFile(resolvePath(CONFIG.paths.report), JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log('── Enriquecimiento de catálogo — Etapa 1 (modo prueba) ──');
  console.log(`Candidatos evaluados: ${entries.length}`);
  console.log('Resultado por estado:', summary);
  console.log(`Reporte completo en: tools/enrichment/data/enrichment-report.json`);
  console.log('\nNingún archivo del catálogo público fue modificado.');
}

main().catch((err) => {
  console.error('Error en el modo prueba de enriquecimiento:', err);
  process.exitCode = 1;
});
