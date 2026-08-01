/* ────────────────────────────────────────────────────────────────
   No hay base de datos de productos: el catálogo sigue viviendo en
   src/products.json (igual que el sitio público). Este módulo solo
   lee ese archivo — nunca lo escribe. Se bundlea con la Function en
   el deploy, así que buscar acá es tan rápido como un array.
   ──────────────────────────────────────────────────────────────── */
import products from '../../src/products.json' with { type: 'json' };

const MEDICATION_CATEGORIES = new Set([
  'Analgésicos y Antiinflamatorios',
  'Antibióticos',
  'Antigripales y Antialérgicos',
  'Antisépticos y Curación',
  'Digestivo',
  'Otros Medicamentos',
  'Vitaminas y Suplementos',
]);

const CLEANING_CATEGORIES = new Set(['Limpieza']);

const MEDICAL_ACCESSORY_CATEGORIES = new Set(['Insumos Descartables', 'Equipamiento Médico', 'Ortopedia', 'Cuidado Ocular']);

const PERFUMERY_PERSONAL_CARE_CATEGORIES = new Set([
  'Cosmética y Cuidado Personal',
  'Higiene Dental',
  'Pañales y Cuidado Infantil',
  'Bebés y Puericultura',
]);

export const ALL_CATEGORIES = [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'es'));

export function findProductBySku(sku) {
  return products.find((p) => p.sku === sku) || null;
}

export function findProductByBarcode(barcode) {
  return products.find((p) => p.barcode === barcode) || null;
}

function filterProductsByQuery(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode || '').includes(q) ||
      (p.brand || '').toLowerCase().includes(q)
  );
}

/** Búsqueda simple para el selector de producto de la pantalla admin. */
export function searchProducts(query, limit = 25) {
  return filterProductsByQuery(query).slice(0, limit);
}

const DISPONIBILIDAD_RANK = { disponible: 0, a_consultar: 1, sin_stock: 2 };

/** No hay columna de stock numérico en los datos — solo el estado `disponibilidad`. */
const SORTERS = {
  ventas_desc: (a, b) => (b.unidadesPeriodo || 0) - (a.unidadesPeriodo || 0),
  clientes_desc: (a, b) => (b.clientesDistintos || 0) - (a.clientesDistintos || 0),
  disponible_primero: (a, b) => (DISPONIBILIDAD_RANK[a.disponibilidad] ?? 9) - (DISPONIBILIDAD_RANK[b.disponibilidad] ?? 9),
  a_consultar_primero: (a, b) => (a.disponibilidad === 'a_consultar' ? -1 : 0) - (b.disponibilidad === 'a_consultar' ? -1 : 0),
  sin_stock_primero: (a, b) => (a.disponibilidad === 'sin_stock' ? -1 : 0) - (b.disponibilidad === 'sin_stock' ? -1 : 0),
  nombre_asc: (a, b) => a.name.localeCompare(b.name, 'es'),
  nombre_desc: (a, b) => b.name.localeCompare(a.name, 'es'),
};

/**
 * Búsqueda del backoffice: texto libre + categoría + si tiene (o no) imagen
 * aprobada + orden. Cualquier filtro es opcional (undefined = sin filtrar).
 * @param {Set<string>} approvedSkuSet SKUs con imagen aprobada y primaria en D1.
 */
export function searchProductsAdvanced({ query, category, hasImage, sort }, approvedSkuSet, limit = 500) {
  let list = filterProductsByQuery(query);
  if (category) list = list.filter((p) => p.category === category);
  if (hasImage === true) list = list.filter((p) => approvedSkuSet.has(p.sku));
  else if (hasImage === false) list = list.filter((p) => !approvedSkuSet.has(p.sku));
  if (sort === 'sin_imagen_primero') {
    list = [...list].sort((a, b) => (approvedSkuSet.has(a.sku) ? 1 : 0) - (approvedSkuSet.has(b.sku) ? 1 : 0));
  } else if (SORTERS[sort]) {
    list = [...list].sort(SORTERS[sort]);
  }
  return list.slice(0, limit);
}

export function isMedication(product) {
  return MEDICATION_CATEGORIES.has(product.category);
}

export function categoryGroup(product) {
  if (isMedication(product)) return 'medicamento';
  if (CLEANING_CATEGORIES.has(product.category)) return 'limpieza';
  if (MEDICAL_ACCESSORY_CATEGORIES.has(product.category)) return 'accesorio_medico';
  if (PERFUMERY_PERSONAL_CARE_CATEGORIES.has(product.category)) return 'perfumeria_cuidado_personal';
  return 'otro';
}
