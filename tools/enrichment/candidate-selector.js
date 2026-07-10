/* ────────────────────────────────────────────────────────────────
   Selecciona qué productos necesitan enriquecimiento de imagen:
   sin campo "image" asignado, o con imagen marcada como baja
   resolución (image.lowRes === true, para etapas futuras).
   ──────────────────────────────────────────────────────────────── */

export function selectCandidates(products, { limit = null, skus = null } = {}) {
  let candidates = products.filter((p) => !p.image || p.image.lowRes === true);

  if (skus && skus.length) {
    const wanted = new Set(skus);
    candidates = candidates.filter((p) => wanted.has(p.sku));
  }

  if (limit) {
    candidates = candidates.slice(0, limit);
  }

  return candidates;
}
