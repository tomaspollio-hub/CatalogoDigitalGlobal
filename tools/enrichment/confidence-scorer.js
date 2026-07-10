/* ────────────────────────────────────────────────────────────────
   Puntaje de confianza para un candidato de imagen encontrado.
   Nunca decide por sí solo qué imagen es "correcta" — solo traduce
   las señales de coincidencia en un número y un estado.
   ──────────────────────────────────────────────────────────────── */

export function scoreCandidate(signals, config) {
  const { weights, sourceAuthorityScores, thresholds } = config;

  const gtinPoints = signals.gtinExactMatch ? weights.gtinExactMatch : 0;
  const namePoints = clamp01(signals.nameSimilarity) * weights.nameSimilarity;
  const brandPoints = signals.brandMatch ? weights.brandMatch : 0;
  const presentationPoints = signals.presentationMatch ? weights.presentationMatch : 0;
  const authorityPoints = sourceAuthorityScores[signals.sourceAuthority] ?? 0;
  const qualityPoints = clamp01(signals.imageQuality) * weights.imageQuality;

  const total = Math.round(
    gtinPoints + namePoints + brandPoints + presentationPoints + authorityPoints + qualityPoints
  );

  let status;
  if (total >= thresholds.autoAssign) status = 'auto_assigned';
  else if (total >= thresholds.manualReview) status = 'pending_review';
  else status = 'rejected';

  return {
    score: total,
    status,
    breakdown: {
      gtinExactMatch: round1(gtinPoints),
      nameSimilarity: round1(namePoints),
      brandMatch: round1(brandPoints),
      presentationMatch: round1(presentationPoints),
      sourceAuthority: round1(authorityPoints),
      imageQuality: round1(qualityPoints),
    },
  };
}

function clamp01(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
