/* ────────────────────────────────────────────────────────────────
   Herramienta admin "Buscar imagen del producto". JS plano, mismo
   estilo que src/app.js (sin frameworks). Todas las llamadas van a
   /admin/api/* (relativas: "api/..." porque esta página vive en
   /admin/), protegidas por el middleware de Cloudflare Access.
   ──────────────────────────────────────────────────────────────── */

const CONFIDENCE_LABEL = { alta: 'Coincidencia alta', media: 'Coincidencia media', baja: 'Coincidencia baja' };
const STATUS_LABEL = {
  candidate: 'Candidato',
  processing: 'Procesando…',
  pending_review: 'Pendiente de revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  failed: 'Falló',
};

const el = {
  usageBanner: document.getElementById('usage-banner'),
  productSearchInput: document.getElementById('product-search-input'),
  productImageFilter: document.getElementById('product-image-filter'),
  productSearchResults: document.getElementById('product-search-results'),
  selectedProductCard: document.getElementById('selected-product-card'),
  historySection: document.getElementById('history-section'),
  historyGrid: document.getElementById('history-grid'),
  pendingSection: document.getElementById('pending-section'),
  pendingCount: document.getElementById('pending-count'),
  pendingGrid: document.getElementById('pending-grid'),
  pendingSelectAll: document.getElementById('pending-select-all'),
  pendingSelectNone: document.getElementById('pending-select-none'),
  pendingApproveSelected: document.getElementById('pending-approve-selected'),
  pendingSelectedCount: document.getElementById('pending-selected-count'),
  reviewOverlay: document.getElementById('review-overlay'),
  reviewModal: document.getElementById('review-modal'),
  toastContainer: document.getElementById('toast-container'),
};

let selectedProduct = null;
let currentHistoryImages = [];
let productSearchDebounce = null;

init();

async function init() {
  refreshUsage();
  refreshPending();
  el.productSearchInput.addEventListener('input', onProductSearchInput);
  el.productImageFilter.addEventListener('change', onProductSearchInput);
  document.addEventListener('click', (e) => {
    if (!el.productSearchResults.contains(e.target) && e.target !== el.productSearchInput) {
      el.productSearchResults.innerHTML = '';
    }
  });
  el.pendingSelectAll.addEventListener('click', () => {
    selectablePendingIds().forEach((id) => pendingSelected.add(id));
    renderPending(pendingItems);
  });
  el.pendingSelectNone.addEventListener('click', () => {
    pendingSelected.clear();
    renderPending(pendingItems);
  });
  el.pendingApproveSelected.addEventListener('click', bulkApprovePending);
}

/* ── Helpers ──────────────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast--error' : type === 'success' ? 'toast--success' : ''}`;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

async function api(path, options = {}) {
  const res = await fetch(`api/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Ocurrió un error inesperado.');
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

/* ── Uso / cupo diario ────────────────────────────────────────── */
async function refreshUsage() {
  try {
    const usage = await api('usage');
    const pct = usage.dailyLimit ? usage.total / usage.dailyLimit : 0;
    el.usageBanner.className = `admin-usage ${pct >= 1 ? 'admin-usage--danger' : pct >= 0.8 ? 'admin-usage--warning' : ''}`;
    el.usageBanner.textContent =
      `Consultas hoy: ${usage.total} / ${usage.dailyLimit} · Restantes: ${usage.remaining} · ` +
      `Encontraron imagen: ${usage.found} · Sin resultados: ${usage.notFound}`;
  } catch {
    el.usageBanner.textContent = 'No se pudo cargar el uso de la API.';
  }
}

/* ── Pendientes de revisión (todos los productos) ───────────────── */
let pendingItems = [];
const pendingSelected = new Set();

async function refreshPending() {
  try {
    const { items } = await api('images/pending');
    pendingItems = items;
    pendingSelected.clear();
    renderPending(items);
  } catch {
    el.pendingSection.hidden = true;
  }
}

function renderPending(items) {
  el.pendingCount.textContent = items.length;
  if (items.length === 0) {
    el.pendingSection.hidden = true;
    el.pendingGrid.innerHTML = '';
    return;
  }
  el.pendingSection.hidden = false;
  el.pendingGrid.innerHTML = items
    .map((img) => {
      const isMedication = img.categoryGroup === 'medicamento';
      return `
      <div class="history-card">
        ${isMedication ? '' : `<label class="pending-select"><input type="checkbox" data-select-id="${img.id}" ${pendingSelected.has(img.id) ? 'checked' : ''} /></label>`}
        <img src="${img.thumbnailStoragePath ? `/img/${img.thumbnailStoragePath}` : '../public/img/placeholder.svg'}" alt="" />
        <div class="history-card__body">
          <span class="candidate-card__title">${escapeHtml(img.productName)}</span>
          <span class="candidate-card__meta">${escapeHtml(img.productId)} · ${escapeHtml(img.sourceName)} · Puntaje ${img.confidenceScore}${isMedication ? ' · Medicamento' : ''}</span>
          ${img.suggestedTitle ? `<span class="candidate-card__meta">Título sugerido: ${escapeHtml(img.suggestedTitle)}</span>` : ''}
          <div class="history-card__actions">
            <button class="btn btn--primary" data-action="review-pending" data-sku="${escapeHtml(img.productId)}" data-id="${img.id}">Revisar</button>
          </div>
        </div>
      </div>`;
    })
    .join('');

  el.pendingGrid.querySelectorAll('[data-action="review-pending"]').forEach((btn) => {
    btn.addEventListener('click', () => reviewFromPendingList(btn.dataset.sku, btn.dataset.id));
  });
  el.pendingGrid.querySelectorAll('[data-select-id]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) pendingSelected.add(cb.dataset.selectId);
      else pendingSelected.delete(cb.dataset.selectId);
      updatePendingSelectionUi();
    });
  });
  updatePendingSelectionUi();
}

function updatePendingSelectionUi() {
  el.pendingSelectedCount.textContent = pendingSelected.size;
  el.pendingApproveSelected.disabled = pendingSelected.size === 0;
}

function selectablePendingIds() {
  return pendingItems.filter((img) => img.categoryGroup !== 'medicamento').map((img) => img.id);
}

async function bulkApprovePending() {
  const ids = Array.from(pendingSelected);
  if (ids.length === 0) return;
  if (!confirm(`¿Aprobar ${ids.length} imagen(es) seleccionada(s)? Se van a asignar como imagen principal de cada producto.`)) return;

  let okCount = 0;
  let failCount = 0;
  for (const id of ids) {
    try {
      await api(`images/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ medicationConfirmation: false, isIllustrative: false, confirmReplace: true }),
      });
      okCount++;
    } catch {
      failCount++;
    }
  }
  showToast(`Aprobadas: ${okCount}${failCount ? ` · Fallaron: ${failCount}` : ''}`, failCount ? 'error' : 'success');
  await refreshPending();
}

async function reviewFromPendingList(sku, imageId) {
  await selectProduct(sku);
  const img = currentHistoryImages.find((i) => i.id === imageId);
  if (img) {
    openReviewPanelFromHistory(img);
  } else {
    showToast('No se pudo cargar esa imagen para revisar.', 'error');
  }
}

/* ── Selector de producto ─────────────────────────────────────── */
function onProductSearchInput() {
  clearTimeout(productSearchDebounce);
  const q = el.productSearchInput.value.trim();
  const hasImage = el.productImageFilter.value;
  if (!q && !hasImage) {
    el.productSearchResults.innerHTML = '';
    return;
  }
  productSearchDebounce = setTimeout(async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (hasImage) params.set('hasImage', hasImage);
      const { products } = await api(`products?${params.toString()}`);
      renderProductSearchResults(products);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, 250);
}

function renderProductSearchResults(products) {
  if (products.length === 0) {
    el.productSearchResults.innerHTML = `<div class="product-result-item">Sin resultados.</div>`;
    return;
  }
  el.productSearchResults.innerHTML = products
    .map(
      (p) => `
        <div class="product-result-item" data-sku="${escapeHtml(p.sku)}">
          <strong>${escapeHtml(p.name)}</strong>
          <span>${escapeHtml(p.brand || 'Sin marca')} · ${escapeHtml(p.barcode || 'sin código')} · ${escapeHtml(p.category)}</span>
        </div>`
    )
    .join('');
  el.productSearchResults.querySelectorAll('.product-result-item[data-sku]').forEach((item) => {
    item.addEventListener('click', () => selectProduct(item.dataset.sku));
  });
}

async function selectProduct(sku) {
  try {
    const { product, images } = await api(`products/${encodeURIComponent(sku)}`);
    selectedProduct = product;
    el.productSearchResults.innerHTML = '';
    el.productSearchInput.value = '';
    renderSelectedProduct(product);
    renderHistory(images);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

const DISPONIBILIDAD_LABEL = { disponible: 'Disponible', a_consultar: 'A consultar', sin_stock: 'Sin stock (oculto para pedidos)' };

function renderSelectedProduct(product) {
  el.selectedProductCard.hidden = false;
  const isMedication = product.categoryGroup === 'medicamento';
  el.selectedProductCard.innerHTML = `
    <div class="selected-product-main">
      <img src="${escapeHtml(product.image || '../public/img/placeholder.svg')}" alt="" />
      <div class="info">
        <strong>${escapeHtml(product.name)}</strong>
        <span>SKU: ${escapeHtml(product.sku)} · Código de barras: ${escapeHtml(product.barcode || 'sin código')}</span>
        <span>Marca: ${escapeHtml(product.brand || '—')} · Fabricante: ${escapeHtml(product.manufacturer || '—')}</span>
        <span>Categoría: ${escapeHtml(product.category)} · Presentación: ${escapeHtml(product.presentation || '—')} · Mínimo de venta: ${product.minMultiple}</span>
        <span>Disponibilidad: ${escapeHtml(DISPONIBILIDAD_LABEL[product.disponibilidad] || product.disponibilidad)}${product.isHidden ? ' · <strong>OCULTO del catálogo público</strong>' : ''}</span>
        ${isMedication ? '<span class="badge-medication">Medicamento — revisión obligatoria de imagen</span>' : ''}
      </div>
      <button type="button" class="btn btn--secondary" id="btn-edit-ficha">Editar ficha</button>
    </div>
    <form id="edit-ficha-form" class="edit-ficha-form" hidden>
      <div class="field">
        <label for="ficha-name">Nombre</label>
        <input id="ficha-name" type="text" value="${escapeHtml(product.name)}" />
      </div>
      <div class="field">
        <label for="ficha-brand">Marca</label>
        <input id="ficha-brand" type="text" value="${escapeHtml(product.brand || '')}" />
      </div>
      <div class="field">
        <label for="ficha-manufacturer">Fabricante</label>
        <input id="ficha-manufacturer" type="text" value="${escapeHtml(product.manufacturer || '')}" />
      </div>
      <div class="field">
        <label for="ficha-presentation">Presentación</label>
        <input id="ficha-presentation" type="text" value="${escapeHtml(product.presentation || '')}" />
      </div>
      <div class="field">
        <label for="ficha-min-multiple">Mínimo de venta (pack / caja)</label>
        <input id="ficha-min-multiple" type="number" min="1" step="1" value="${product.minMultiple}" />
      </div>
      <div class="field">
        <label for="ficha-disponibilidad">Disponibilidad</label>
        <select id="ficha-disponibilidad">
          <option value="disponible" ${product.disponibilidad === 'disponible' ? 'selected' : ''}>Disponible</option>
          <option value="a_consultar" ${product.disponibilidad === 'a_consultar' ? 'selected' : ''}>A consultar</option>
          <option value="sin_stock" ${product.disponibilidad === 'sin_stock' ? 'selected' : ''}>Sin stock</option>
        </select>
      </div>
      <div class="field" style="grid-column: 1 / -1;">
        <label for="ficha-description">Descripción</label>
        <textarea id="ficha-description" rows="3">${escapeHtml(product.description || '')}</textarea>
      </div>
      <div class="field">
        <label for="ficha-hidden">Visibilidad en el catálogo</label>
        <label class="review-confirm"><input type="checkbox" id="ficha-hidden" ${product.isHidden ? 'checked' : ''} /> Ocultar este producto del catálogo público</label>
      </div>
      <div class="field">
        <label for="ficha-image-upload">Imagen (subir archivo directo)</label>
        <input id="ficha-image-upload" type="file" accept="image/png,image/jpeg,image/webp" />
      </div>
      <div class="search-actions">
        <button type="submit" class="btn btn--primary">Guardar cambios</button>
        <button type="button" class="btn btn--secondary" id="btn-cancel-ficha">Cancelar</button>
      </div>
    </form>
  `;

  const editBtn = document.getElementById('btn-edit-ficha');
  const form = document.getElementById('edit-ficha-form');
  editBtn.addEventListener('click', () => {
    form.hidden = !form.hidden;
  });
  document.getElementById('btn-cancel-ficha').addEventListener('click', () => {
    form.hidden = true;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveProductFicha(product.sku);
  });
  document.getElementById('ficha-image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) uploadProductImage(product.sku, file);
  });
}

async function saveProductFicha(sku) {
  try {
    const fields = {
      name: document.getElementById('ficha-name').value.trim(),
      brand: document.getElementById('ficha-brand').value.trim(),
      manufacturer: document.getElementById('ficha-manufacturer').value.trim(),
      presentation: document.getElementById('ficha-presentation').value.trim(),
      description: document.getElementById('ficha-description').value.trim(),
      minMultiple: Number(document.getElementById('ficha-min-multiple').value) || 1,
      disponibilidad: document.getElementById('ficha-disponibilidad').value,
      isHidden: document.getElementById('ficha-hidden').checked,
    };
    await api(`products/${encodeURIComponent(sku)}`, { method: 'PUT', body: JSON.stringify(fields) });
    showToast('Ficha actualizada.', 'success');
    const { product, images } = await api(`products/${encodeURIComponent(sku)}`);
    selectedProduct = product;
    renderSelectedProduct(product);
    renderHistory(images);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/* ── Carga manual de imagen ──────────────────────────────────────── */
async function uploadProductImage(sku, file) {
  showToast('Subiendo y normalizando imagen…');
  try {
    const res = await fetch(`api/products/${encodeURIComponent(sku)}/image`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || 'No se pudo subir la imagen.');

    const candidate = {
      imageUrl: URL.createObjectURL(file),
      title: selectedProduct.name,
      brand: selectedProduct.brand,
      manufacturer: selectedProduct.manufacturer,
      description: selectedProduct.presentation,
      barcode: selectedProduct.barcode,
      sourceName: 'Carga manual',
      barcodeMismatch: false,
    };
    openReviewPanel(result, candidate);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/* ── Historial ────────────────────────────────────────────────── */
function renderHistory(images) {
  currentHistoryImages = images || [];
  if (!images || images.length === 0) {
    el.historySection.hidden = true;
    el.historyGrid.innerHTML = '';
    return;
  }
  el.historySection.hidden = false;
  el.historyGrid.innerHTML = images
    .map(
      (img) => `
      <div class="history-card">
        <img src="${img.thumbnailStoragePath ? `/img/${img.thumbnailStoragePath}` : '../public/img/placeholder.svg'}" alt="" />
        <div class="history-card__body">
          <span class="status-pill status-pill--${img.status}">${STATUS_LABEL[img.status] || img.status}${img.isPrimary ? ' · Principal' : ''}</span>
          <span class="candidate-card__meta">${escapeHtml(img.sourceName)} · Puntaje ${img.confidenceScore}</span>
          ${img.suggestedTitle ? `<span class="candidate-card__meta">Título sugerido: ${escapeHtml(img.suggestedTitle)}</span>` : ''}
          <div class="history-card__actions">
            ${img.status === 'pending_review' ? `<button class="btn btn--primary" data-action="review-image" data-id="${img.id}">Revisar</button>` : ''}
            ${img.status === 'approved' && !img.isPrimary ? `<button class="btn btn--secondary" data-action="set-primary" data-id="${img.id}">Usar como principal</button>` : ''}
            <button class="btn btn--danger" data-action="delete-image" data-id="${img.id}">Eliminar</button>
          </div>
        </div>
      </div>`
    )
    .join('');

  el.historyGrid.querySelectorAll('[data-action="review-image"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const img = currentHistoryImages.find((i) => i.id === btn.dataset.id);
      if (img) openReviewPanelFromHistory(img);
    });
  });
  el.historyGrid.querySelectorAll('[data-action="set-primary"]').forEach((btn) => {
    btn.addEventListener('click', () => setPrimary(btn.dataset.id));
  });
  el.historyGrid.querySelectorAll('[data-action="delete-image"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteImage(btn.dataset.id));
  });
}

/** Revisión de una imagen que ya está en la base (ej. cargada por un lote de
 * búsqueda IA), sin el objeto `candidate` efímero que arma la búsqueda en vivo. */
function openReviewPanelFromHistory(img) {
  const isMedication = selectedProduct.categoryGroup === 'medicamento';
  const group = selectedProduct.categoryGroup;

  const groupChecklist = {
    medicamento: ['Nombre comercial', 'Laboratorio', 'Concentración', 'Forma farmacéutica', 'Cantidad', 'Presentación', 'Código de barras'],
    perfumeria_cuidado_personal: ['Marca', 'Línea', 'Nombre o variante', 'Tipo de producto', 'Contenido en ml', 'Género (si corresponde)', 'Presentación'],
    limpieza: ['Marca', 'Variante', 'Fragancia', 'Cantidad', 'Volumen', 'Formato', 'Cantidad de unidades'],
    accesorio_medico: ['Marca', 'Modelo', 'Tamaño', 'Color (si corresponde)', 'Características', 'Código de barras'],
    otro: [],
  }[group] || [];

  const catalogUrl = img.catalogStoragePath ? `/img/${img.catalogStoragePath}` : '../public/img/placeholder.svg';

  el.reviewOverlay.hidden = false;
  el.reviewModal.innerHTML = `
    <h2>Revisión antes de aprobar</h2>
    <div class="review-images">
      <figure>
        <img src="${escapeHtml(img.sourceImageUrl)}" alt="Original" />
        <figcaption>Original (fuente externa)</figcaption>
      </figure>
      <figure>
        <img src="${escapeHtml(catalogUrl)}" alt="Normalizada" />
        <figcaption>Normalizada (1000×1000, fondo blanco)</figcaption>
      </figure>
    </div>

    ${img.lowResWarning ? `<div class="review-warning">La imagen original es de baja resolución${img.originalWidth ? ` (${img.originalWidth}×${img.originalHeight}px)` : ''}. Se normalizó igual, pero puede verse borrosa.</div>` : ''}

    <table class="review-diff-table">
      <tr><th>Campo</th><th>Producto interno</th><th>Resultado externo</th></tr>
      <tr><td>Nombre</td><td>${escapeHtml(selectedProduct.name)}</td><td>${escapeHtml(img.suggestedTitle || '—')}</td></tr>
      <tr><td>Código de barras</td><td>${escapeHtml(selectedProduct.barcode || '—')}</td><td>${escapeHtml(img.matchedBarcode || '—')}</td></tr>
      <tr><td>Fuente</td><td>—</td><td>${img.sourcePageUrl ? `<a href="${escapeHtml(img.sourcePageUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(img.sourceName)}</a>` : escapeHtml(img.sourceName)}</td></tr>
      <tr><td>Confianza</td><td>—</td><td>${img.confidenceScore} · ${CONFIDENCE_LABEL[confidenceLevel(img.confidenceScore)]}</td></tr>
      <tr><td>Resolución final</td><td>—</td><td>1000×1000 (catálogo) / 300×300 (miniatura)</td></tr>
    </table>

    ${groupChecklist.length ? `<div class="review-warning"><strong>Verificar antes de aprobar (${escapeHtml(group)}):</strong><ul class="match-reasons">${groupChecklist.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>` : ''}

    ${isMedication ? `
      <label class="review-confirm">
        <input type="checkbox" id="review-med-confirm" />
        Confirmo que revisé el laboratorio, concentración y presentación.
      </label>
    ` : `
      <label class="review-confirm">
        <input type="checkbox" id="review-illustrative" />
        Marcar como imagen ilustrativa (no es una foto real de este producto exacto)
      </label>
    `}

    <label class="review-confirm">
      <input type="checkbox" id="review-replace-confirm" />
      Confirmo que quiero reemplazar la imagen principal actual del producto, si tiene una.
    </label>

    <div class="review-actions">
      <button class="btn btn--secondary" id="review-btn-back">Cerrar</button>
      <button class="btn btn--danger" id="review-btn-reject">Rechazar</button>
      <button class="btn btn--success" id="review-btn-approve">Aprobar</button>
    </div>
  `;

  document.getElementById('review-btn-back').addEventListener('click', closeReviewPanel);
  document.getElementById('review-btn-reject').addEventListener('click', () => rejectImage(img.id));
  document.getElementById('review-btn-approve').addEventListener('click', () => approveImage(img.id, isMedication));
}

async function setPrimary(id) {
  try {
    await api(`images/${id}/primary`, { method: 'POST', body: '{}' });
    showToast('Imagen marcada como principal.', 'success');
    await selectProduct(selectedProduct.sku);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteImage(id) {
  if (!confirm('¿Eliminar esta imagen definitivamente?')) return;
  try {
    await api(`images/${id}`, { method: 'DELETE' });
    showToast('Imagen eliminada.', 'success');
    await selectProduct(selectedProduct.sku);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function confidenceLevel(score) {
  if (score >= 80) return 'alta';
  if (score >= 50) return 'media';
  return 'baja';
}

/** Revisión de una imagen recién subida a mano (ver uploadProductImage) o, históricamente, encontrada por un lote automático. */
function openReviewPanel(processResult, candidate) {
  const isMedication = selectedProduct.categoryGroup === 'medicamento';
  const group = selectedProduct.categoryGroup;

  const groupChecklist = {
    medicamento: ['Nombre comercial', 'Laboratorio', 'Concentración', 'Forma farmacéutica', 'Cantidad', 'Presentación', 'Código de barras'],
    perfumeria_cuidado_personal: ['Marca', 'Línea', 'Nombre o variante', 'Tipo de producto', 'Contenido en ml', 'Género (si corresponde)', 'Presentación'],
    limpieza: ['Marca', 'Variante', 'Fragancia', 'Cantidad', 'Volumen', 'Formato', 'Cantidad de unidades'],
    accesorio_medico: ['Marca', 'Modelo', 'Tamaño', 'Color (si corresponde)', 'Características', 'Código de barras'],
    otro: [],
  }[group] || [];

  el.reviewOverlay.hidden = false;
  el.reviewModal.innerHTML = `
    <h2>Revisión antes de aprobar</h2>
    <div class="review-images">
      <figure>
        <img src="${escapeHtml(candidate.imageUrl)}" alt="Original" />
        <figcaption>Original (fuente externa)</figcaption>
      </figure>
      <figure>
        <img src="${escapeHtml(processResult.catalogUrl)}" alt="Normalizada" />
        <figcaption>Normalizada (1000×1000, fondo blanco)</figcaption>
      </figure>
    </div>

    ${processResult.lowResWarning ? `<div class="review-warning">La imagen original es de baja resolución (${processResult.originalWidth}×${processResult.originalHeight}px, mínimo recomendado 600×600px). Se normalizó igual, pero puede verse borrosa.</div>` : ''}
    ${candidate.barcodeMismatch ? `<div class="review-danger">⚠ El código de barras del resultado no coincide con el del producto. Verificá que sea el mismo producto antes de aprobar.</div>` : ''}

    <table class="review-diff-table">
      <tr><th>Campo</th><th>Producto interno</th><th>Resultado externo</th></tr>
      <tr><td>Nombre</td><td>${escapeHtml(selectedProduct.name)}</td><td>${escapeHtml(candidate.title)}</td></tr>
      <tr><td>Marca</td><td>${escapeHtml(selectedProduct.brand || '—')}</td><td>${escapeHtml(candidate.brand || '—')}</td></tr>
      <tr><td>Fabricante/Laboratorio</td><td>${escapeHtml(selectedProduct.manufacturer || '—')}</td><td>${escapeHtml(candidate.manufacturer || '—')}</td></tr>
      <tr><td>Presentación</td><td>${escapeHtml(selectedProduct.presentation || '—')}</td><td>${escapeHtml(candidate.description || '—')}</td></tr>
      <tr><td>Código de barras</td><td>${escapeHtml(selectedProduct.barcode || '—')}</td><td>${escapeHtml(candidate.barcode || '—')}</td></tr>
      <tr><td>Fuente</td><td>—</td><td>${escapeHtml(candidate.sourceName)}</td></tr>
      <tr><td>Resolución final</td><td>—</td><td>1000×1000 (catálogo) / 300×300 (miniatura)</td></tr>
    </table>

    ${groupChecklist.length ? `<div class="review-warning"><strong>Verificar antes de aprobar (${escapeHtml(group)}):</strong><ul class="match-reasons">${groupChecklist.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>` : ''}

    ${isMedication ? `
      <label class="review-confirm">
        <input type="checkbox" id="review-med-confirm" />
        Confirmo que revisé el laboratorio, concentración y presentación.
      </label>
    ` : `
      <label class="review-confirm">
        <input type="checkbox" id="review-illustrative" />
        Marcar como imagen ilustrativa (no es una foto real de este producto exacto)
      </label>
    `}

    <label class="review-confirm">
      <input type="checkbox" id="review-replace-confirm" />
      Confirmo que quiero reemplazar la imagen principal actual del producto, si tiene una.
    </label>

    <div class="review-actions">
      <button class="btn btn--secondary" id="review-btn-back">Volver a buscar</button>
      <button class="btn btn--danger" id="review-btn-reject">Rechazar</button>
      <button class="btn btn--success" id="review-btn-approve">Aprobar</button>
    </div>
  `;

  document.getElementById('review-btn-back').addEventListener('click', closeReviewPanel);
  document.getElementById('review-btn-reject').addEventListener('click', () => rejectImage(processResult.imageId));
  document.getElementById('review-btn-approve').addEventListener('click', () =>
    approveImage(processResult.imageId, isMedication)
  );
}

function closeReviewPanel() {
  el.reviewOverlay.hidden = true;
  el.reviewModal.innerHTML = '';
}

async function rejectImage(imageId) {
  try {
    await api(`images/${imageId}/reject`, { method: 'POST', body: '{}' });
    showToast('Imagen rechazada.', 'success');
    closeReviewPanel();
    await selectProduct(selectedProduct.sku);
    refreshPending();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function approveImage(imageId, isMedication) {
  const medicationConfirmation = isMedication ? document.getElementById('review-med-confirm')?.checked : false;
  const isIllustrative = !isMedication ? !!document.getElementById('review-illustrative')?.checked : false;
  const confirmReplace = !!document.getElementById('review-replace-confirm')?.checked;

  if (isMedication && !medicationConfirmation) {
    showToast('Para medicamentos hace falta confirmar la revisión antes de aprobar.', 'error');
    return;
  }

  try {
    await api(`images/${imageId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ medicationConfirmation, isIllustrative, confirmReplace }),
    });
    showToast('Imagen aprobada y asignada al producto.', 'success');
    closeReviewPanel();
    await selectProduct(selectedProduct.sku);
    refreshPending();
  } catch (e) {
    if (e.code === 'replace_confirmation_required') {
      showToast('Este producto ya tiene una imagen principal — marcá la confirmación de reemplazo.', 'error');
      return;
    }
    showToast(e.message, 'error');
  }
}
