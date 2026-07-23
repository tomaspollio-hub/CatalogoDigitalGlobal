import { CONFIG } from './config.js';

/* ── Constantes ───────────────────────────────────────────────── */
const PLACEHOLDER_IMG = 'public/img/placeholder.svg';
const CART_STORAGE_KEY = 'catalogo_cart_v1';
const ORDERS_STORAGE_KEY = 'catalogo_orders_v1';
const MAX_ORDERS_SAVED = 20;
const POPULAR_MIN_CLIENTS = 15;

const AVAILABILITY_LABEL = {
  disponible: 'Disponible',
  a_consultar: 'A consultar',
  sin_stock: 'Sin stock',
};

const ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
const ICON_MINUS = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg>`;
const ICON_CART_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.962-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>`;
const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;
const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`;
const ICON_ALERT = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>`;
const ICON_INFO = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`;
const ICON_WHATSAPP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2.003c-5.523 0-10 4.477-10 10 0 1.766.46 3.49 1.334 5.007L2 22l5.13-1.345a9.96 9.96 0 0 0 4.91 1.287h.005c5.523 0 10-4.477 10-10s-4.477-9.94-10.005-9.94Zm0 18.24h-.004a8.19 8.19 0 0 1-4.176-1.144l-.3-.178-3.045.8.813-2.97-.196-.306a8.2 8.2 0 0 1-1.256-4.386c0-4.53 3.687-8.217 8.217-8.217 2.195 0 4.259.855 5.812 2.409a8.166 8.166 0 0 1 2.404 5.815c0 4.53-3.687 8.177-8.269 8.177Zm4.508-6.128c-.247-.124-1.462-.72-1.688-.803-.226-.082-.39-.124-.556.124-.165.247-.638.803-.782.968-.144.165-.288.185-.535.062-.247-.124-1.041-.384-1.983-1.224-.733-.654-1.229-1.462-1.373-1.71-.144-.247-.015-.38.109-.503.111-.111.247-.288.371-.432.124-.144.165-.247.247-.412.083-.165.041-.309-.02-.433-.062-.124-.556-1.34-.762-1.834-.2-.48-.404-.415-.556-.423-.144-.007-.309-.008-.474-.008a.91.91 0 0 0-.659.309c-.226.247-.865.845-.865 2.06 0 1.216.886 2.39 1.01 2.556.124.165 1.744 2.663 4.226 3.734.59.255 1.05.407 1.409.52.592.188 1.13.162 1.556.098.475-.071 1.462-.598 1.668-1.175.206-.577.206-1.072.144-1.175-.062-.103-.226-.165-.474-.288Z"/></svg>`;
const ICON_MAIL = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>`;
const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>`;
const ICON_REPEAT = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>`;

/* ── Estado ───────────────────────────────────────────────────── */
let products = [];
let activeCategories = new Set();
let searchQuery = '';
let cart = loadCart(); // Map<sku, qty>
let lastOrderText = '';
let lastClientName = '';

/* ── DOM refs ─────────────────────────────────────────────────── */
const el = {
  businessName: document.getElementById('business-name'),
  businessTagline: document.getElementById('business-tagline'),
  searchInput: document.getElementById('search-input'),
  searchSuggestions: document.getElementById('search-suggestions'),
  categoryChips: document.getElementById('category-chips'),
  resultsCount: document.getElementById('results-count'),
  productGrid: document.getElementById('product-grid'),

  btnCartHeader: document.getElementById('btn-cart-header'),
  btnHistoryHeader: document.getElementById('btn-history-header'),
  cartBadge: document.getElementById('cart-badge'),

  cartDrawerOverlay: document.getElementById('cart-drawer-overlay'),
  cartClose: document.getElementById('cart-close'),
  cartItems: document.getElementById('cart-items'),
  cartFooter: document.getElementById('cart-footer'),
  cartSummary: document.getElementById('cart-summary'),
  btnClearCart: document.getElementById('btn-clear-cart'),
  btnReviewOrder: document.getElementById('btn-review-order'),

  modalOverlay: document.getElementById('modal-overlay'),
  modalContent: document.getElementById('modal-content'),
  checkoutOverlay: document.getElementById('checkout-overlay'),
  checkoutModal: document.getElementById('checkout-modal'),
  historyOverlay: document.getElementById('history-overlay'),
  historyModal: document.getElementById('history-modal'),

  toastContainer: document.getElementById('toast-container'),
};

/* ── Init ─────────────────────────────────────────────────────── */
init();

async function init() {
  el.businessName.textContent = CONFIG.businessName;
  el.businessTagline.textContent = CONFIG.businessTagline;

  const res = await fetch('src/products.json');
  products = await res.json();

  renderCategoryChips();
  renderProductGrid();
  renderCart();
  bindStaticEvents();
  bindDelegatedEvents();
}

/* ── Persistencia del carrito ─────────────────────────────────── */
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Object.fromEntries(cart)));
}

/* ── Persistencia del historial de pedidos ────────────────────── */
function getOrderHistory() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrderToHistory(items, client) {
  const orders = getOrderHistory();
  const order = {
    id: `PED-${Date.now()}`,
    date: new Date().toISOString(),
    client,
    items: items.map(({ product, qty }) => ({
      sku: product.sku,
      name: product.name,
      category: product.category,
      presentation: product.presentation,
      qty,
    })),
    totalItems: items.length,
    totalUnits: items.reduce((s, i) => s + i.qty, 0),
  };
  orders.unshift(order);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_ORDERS_SAVED)));
  return order;
}

/* ── Helpers de datos ─────────────────────────────────────────── */
function getProduct(sku) {
  return products.find((p) => p.sku === sku);
}

function normalize(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function groupByCategory(items) {
  const map = {};
  for (const item of items) {
    const cat = item.product.category;
    if (!map[cat]) map[cat] = [];
    map[cat].push(item);
  }
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'es')));
}

/* ── Carrito: mutaciones ──────────────────────────────────────── */
function addInitial(sku) {
  const product = getProduct(sku);
  if (!product || product.disponibilidad === 'sin_stock') return;
  if (!cart.has(sku)) {
    cart.set(sku, product.minMultiple);
    onCartChange(sku, { bump: true });
    showToast(`${product.name} agregado al pedido`);
  }
}

function changeQty(sku, direction) {
  const product = getProduct(sku);
  if (!product) return;
  const current = cart.get(sku) || 0;
  const next = current + direction * product.minMultiple;
  if (next <= 0) cart.delete(sku);
  else cart.set(sku, next);
  onCartChange(sku, { bump: direction > 0 });
}

function setQtyExact(sku, rawValue) {
  const product = getProduct(sku);
  if (!product) return;
  const current = cart.get(sku) || 0;
  const n = parseInt(rawValue, 10);

  if (!n || n <= 0) {
    cart.delete(sku);
  } else {
    const rounded = Math.round(n / product.minMultiple) * product.minMultiple;
    cart.set(sku, Math.max(product.minMultiple, rounded));
  }
  onCartChange(sku, { bump: (cart.get(sku) || 0) > current });
}

function removeFromCart(sku) {
  cart.delete(sku);
  onCartChange(sku);
}

function clearCart() {
  cart.clear();
  onCartChange(null);
  showToast('Pedido vaciado');
}

function getCartItems() {
  return [...cart.entries()]
    .map(([sku, qty]) => ({ product: getProduct(sku), qty }))
    .filter((i) => i.product);
}

function onCartChange(sku, { bump = false } = {}) {
  saveCart();
  renderCart();
  renderProductGrid();
  if (bump) bumpCartButton();

  if (sku && !el.modalOverlay.hidden && el.modalContent.dataset.sku === sku) {
    const product = getProduct(sku);
    const qty = cart.get(sku) || 0;
    const footer = el.modalContent.querySelector('#modal-footer');
    if (footer) footer.innerHTML = qty > 0 ? stepperHTML(product, qty) : addButtonHTML(product);
  }
}

function bumpCartButton() {
  el.btnCartHeader.classList.remove('is-bump');
  void el.btnCartHeader.offsetWidth;
  el.btnCartHeader.classList.add('is-bump');
}

/* ── Render: chips de categoría ───────────────────────────────── */
function renderCategoryChips() {
  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'es'));
  const allChip = `<button class="chip ${activeCategories.size === 0 ? 'chip--active' : ''}" data-category="" type="button">Todos</button>`;
  const chips = categories
    .map((cat) => `<button class="chip ${activeCategories.has(cat) ? 'chip--active' : ''}" data-category="${escapeHtml(cat)}" type="button">${escapeHtml(cat)}</button>`)
    .join('');
  el.categoryChips.innerHTML = allChip + chips;
}

/* ── Render: grid de productos ────────────────────────────────── */
function filterProducts() {
  const query = normalize(searchQuery.trim());
  return products.filter((p) => {
    const matchesCategory = activeCategories.size === 0 || activeCategories.has(p.category);
    if (!matchesCategory) return false;
    if (!query) return true;
    return (
      normalize(p.name).includes(query) ||
      normalize(p.sku).includes(query) ||
      p.barcode.includes(query)
    );
  });
}

function renderProductGrid() {
  const filtered = filterProducts();
  el.resultsCount.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`;
  el.productGrid.innerHTML = filtered.length
    ? filtered.map(renderProductCard).join('')
    : `<p class="empty-state">No encontramos productos que coincidan con tu búsqueda.</p>`;
}

function renderProductCard(product) {
  const qty = cart.get(product.sku) || 0;
  const footer = qty > 0 ? stepperHTML(product, qty) : addButtonHTML(product);

  return `
    <article class="product-card" data-role="card" data-sku="${product.sku}" tabindex="0" role="listitem" aria-label="${escapeHtml(product.name)}">
      <div class="product-card__img-wrap">
        ${product.controlado ? `<span class="product-card__controlled">Controlado</span>` : ''}
        ${!product.controlado && product.clientesDistintos >= POPULAR_MIN_CLIENTS ? `<span class="product-card__popular">Más pedido</span>` : ''}
        <img class="product-card__img" src="${product.image || PLACEHOLDER_IMG}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${escapeHtml(product.category)}</span>
        <span class="product-card__name">${escapeHtml(product.name)}</span>
        <div class="product-card__meta-row">
          <span class="product-card__presentation">${escapeHtml(product.presentation)}</span>
          <span class="availability-badge badge--${product.disponibilidad}">${AVAILABILITY_LABEL[product.disponibilidad]}</span>
        </div>
        <div class="product-card__footer">${footer}</div>
      </div>
    </article>
  `;
}

function addButtonHTML(product) {
  const disabled = product.disponibilidad === 'sin_stock';
  return `
    <div style="display:flex; align-items:center; gap:var(--space-2); width:100%;">
      <span class="qty-multiple-hint" style="flex-shrink:0;">Mín. ${product.minMultiple}</span>
      <button class="btn-add-cart" data-role="add" data-sku="${product.sku}" type="button" style="width:auto; flex:1;" ${disabled ? 'disabled' : ''}>
        ${ICON_CART_PLUS}
        ${disabled ? 'Sin stock' : 'Agregar'}
      </button>
    </div>
  `;
}

function stepperHTML(product, qty) {
  return `
    <div class="qty-stepper" style="width:100%; justify-content:space-between;">
      <button class="btn-qty" data-role="dec" data-sku="${product.sku}" type="button" aria-label="Quitar ${product.minMultiple} unidades">${ICON_MINUS}</button>
      <input class="qty-input" data-role="qty-input" data-sku="${product.sku}" type="number" inputmode="numeric" value="${qty}" min="${product.minMultiple}" step="${product.minMultiple}" aria-label="Cantidad de ${escapeHtml(product.name)}" />
      <button class="btn-qty" data-role="inc" data-sku="${product.sku}" type="button" aria-label="Agregar ${product.minMultiple} unidades">${ICON_PLUS}</button>
    </div>
  `;
}

/* ── Sugerencias de búsqueda ──────────────────────────────────── */
function renderSearchSuggestions() {
  const query = searchQuery.trim();
  if (query.length < 2) { hideSuggestions(); return; }

  const matches = filterProducts().slice(0, 6);
  if (!matches.length) { hideSuggestions(); return; }

  el.searchSuggestions.innerHTML = matches
    .map((p) => `
      <button type="button" class="search-suggestion" data-sku="${p.sku}">
        <span>${escapeHtml(p.name)}</span>
        <span class="search-suggestion__category">${escapeHtml(p.category)} · ${escapeHtml(p.presentation)}</span>
      </button>
    `)
    .join('');
  el.searchSuggestions.hidden = false;
}

function hideSuggestions() {
  el.searchSuggestions.hidden = true;
  el.searchSuggestions.innerHTML = '';
}

/* ── Modal de producto ────────────────────────────────────────── */
function openProductModal(sku) {
  const product = getProduct(sku);
  if (!product) return;
  const qty = cart.get(sku) || 0;

  el.modalContent.dataset.sku = sku;
  el.modalContent.innerHTML = `
    <button class="modal__close" data-role="close-modal" type="button" aria-label="Cerrar">${ICON_CLOSE}</button>
    <div class="modal__img-wrap">
      <img class="modal__img" src="${product.image || PLACEHOLDER_IMG}" alt="${escapeHtml(product.name)}" />
    </div>
    <div class="modal__body">
      <span class="product-card__category">${escapeHtml(product.category)}</span>
      <h2 class="modal__name">${escapeHtml(product.name)}</h2>
      <p class="modal__presentation">${escapeHtml(product.presentation)}</p>
      <div class="modal__meta">
        <span class="availability-badge badge--${product.disponibilidad}">${AVAILABILITY_LABEL[product.disponibilidad]}</span>
        ${product.controlado ? `<span class="availability-badge" style="background:var(--danger-light); color:var(--danger);">Producto controlado</span>` : ''}
      </div>
      <span class="modal__sku">Cód. barras ${escapeHtml(product.barcode)}</span>
      ${product.controlado ? `<div class="alert alert--warning">${ICON_ALERT}<span>Este producto requiere documentación adicional. Nuestro equipo se contactará para validar los datos antes de confirmar el envío.</span></div>` : ''}
      <p class="qty-multiple-hint">Se agrega en múltiplos de ${product.minMultiple} unidades.</p>
      <div id="modal-footer">${qty > 0 ? stepperHTML(product, qty) : addButtonHTML(product)}</div>
    </div>
  `;
  showOverlay(el.modalOverlay);
}

/* ── Carrito: render ──────────────────────────────────────────── */
function renderCart() {
  const items = getCartItems();

  el.cartItems.innerHTML = items.length
    ? items.map(renderCartItemHTML).join('')
    : `<p class="cart-empty">Todavía no agregaste productos.<br>Explorá el catálogo y armá tu pedido.</p>`;

  const totalUnits = items.reduce((sum, i) => sum + i.qty, 0);
  const totalItems = items.length;

  el.cartFooter.hidden = totalItems === 0;
  if (totalItems > 0) {
    el.cartSummary.textContent = `${totalItems} producto${totalItems !== 1 ? 's' : ''} · ${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''}`;
  }

  el.cartBadge.hidden = totalUnits === 0;
  if (totalUnits > 0) el.cartBadge.textContent = totalUnits;
}

function renderCartItemHTML({ product, qty }) {
  return `
    <div class="cart-item" role="listitem">
      <img class="cart-item__img" src="${product.image || PLACEHOLDER_IMG}" alt="" />
      <div class="cart-item__info">
        <span class="cart-item__name">${escapeHtml(product.name)}</span>
        <span class="cart-item__meta">${escapeHtml(product.presentation)}</span>
        <div class="cart-item__controls">
          <button class="btn-qty" data-role="dec" data-sku="${product.sku}" type="button" aria-label="Quitar ${product.minMultiple} unidades">${ICON_MINUS}</button>
          <input class="qty-input" data-role="qty-input" data-sku="${product.sku}" type="number" inputmode="numeric" value="${qty}" min="${product.minMultiple}" step="${product.minMultiple}" aria-label="Cantidad de ${escapeHtml(product.name)}" />
          <button class="btn-qty" data-role="inc" data-sku="${product.sku}" type="button" aria-label="Agregar ${product.minMultiple} unidades">${ICON_PLUS}</button>
          <span class="cart-item__unit">múltiplos de ${product.minMultiple}</span>
        </div>
      </div>
      <button class="btn-item-remove" data-role="remove" data-sku="${product.sku}" type="button" aria-label="Quitar ${escapeHtml(product.name)} del pedido">${ICON_TRASH}</button>
    </div>
  `;
}

function openCartDrawer() {
  showOverlay(el.cartDrawerOverlay);
}

/* ── Checkout: formulario + resumen ───────────────────────────── */
function openCheckoutModal() {
  const items = getCartItems();
  if (!items.length) return;
  renderCheckoutForm(items);
  showOverlay(el.checkoutOverlay);
}

function renderCheckoutForm(items) {
  const grouped = groupByCategory(items);
  const totalUnits = items.reduce((s, i) => s + i.qty, 0);

  el.checkoutModal.innerHTML = `
    <button class="modal__close" data-role="close-checkout" type="button" aria-label="Cerrar">${ICON_CLOSE}</button>
    <div class="modal__body">
      <div class="step-indicator">Paso 2 de 2 · Tus datos</div>
      <h2 class="modal__title">Confirmar pedido</h2>

      <div class="confirm-items">
        ${Object.entries(grouped)
          .map(
            ([category, list]) => `
          <div>
            <div class="confirm-category__title">${escapeHtml(category)}</div>
            ${list
              .map(
                ({ product, qty }) => `
              <div class="confirm-row">
                <span class="confirm-row__name">${escapeHtml(product.name)}</span>
                <span class="confirm-row__qty">x${qty} <span class="confirm-row__unit">${escapeHtml(product.presentation)}</span></span>
              </div>
            `
              )
              .join('')}
          </div>
        `
          )
          .join('')}
      </div>

      <div class="confirm-summary">
        <span>${items.length} producto${items.length !== 1 ? 's' : ''}</span>
        <span class="confirm-summary__dot">·</span>
        <span>${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''}</span>
      </div>

      <form id="checkout-form">
        <div class="form-section-title">Tus datos</div>
        <div class="form-grid form-grid--2col">
          <div class="form-field">
            <label class="form-field__label" for="f-nombre">Nombre y apellido <span class="required">*</span></label>
            <input class="form-field__input" id="f-nombre" name="nombre" type="text" required placeholder="Ej: Juan Pérez" />
          </div>
          <div class="form-field">
            <label class="form-field__label" for="f-empresa">Empresa</label>
            <input class="form-field__input" id="f-empresa" name="empresa" type="text" placeholder="Ej: Farmacia del Centro" />
          </div>
        </div>
        <div class="form-grid form-grid--2col">
          <div class="form-field">
            <label class="form-field__label" for="f-telefono">Teléfono <span class="required">*</span></label>
            <input class="form-field__input" id="f-telefono" name="telefono" type="tel" required placeholder="Ej: 299 456-7890" />
          </div>
          <div class="form-field">
            <label class="form-field__label" for="f-email">Email</label>
            <input class="form-field__input" id="f-email" name="email" type="email" placeholder="Ej: compras@empresa.com" />
          </div>
        </div>
        <div class="form-field">
          <label class="form-field__label" for="f-comentario">Comentario</label>
          <textarea class="form-field__textarea" id="f-comentario" name="comentario" placeholder="Aclaraciones, horarios de entrega, etc."></textarea>
        </div>

        <button class="btn-primary" type="submit">
          ${ICON_CHECK}
          Generar pedido
        </button>
      </form>
    </div>
  `;

  el.checkoutModal.querySelector('#checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmitOrder();
  });
}

function handleSubmitOrder() {
  const form = el.checkoutModal.querySelector('#checkout-form');
  const nombre = form.nombre.value.trim();
  const telefono = form.telefono.value.trim();

  form.querySelectorAll('.is-error').forEach((i) => i.classList.remove('is-error'));

  let valid = true;
  if (!nombre) { form.nombre.classList.add('is-error'); valid = false; }
  if (!telefono) { form.telefono.classList.add('is-error'); valid = false; }
  if (!valid) {
    showToast('Completá los datos obligatorios para continuar');
    return;
  }

  const clientData = {
    nombre,
    empresa: form.empresa.value.trim(),
    telefono,
    email: form.email.value.trim(),
    comentario: form.comentario.value.trim(),
  };

  const items = getCartItems();
  lastOrderText = buildOrderText(items, clientData);
  lastClientName = clientData.nombre;
  saveOrderToHistory(items, clientData);
  renderSuccessScreen(lastOrderText);
}

function buildOrderText(items, client) {
  const grouped = groupByCategory(items);
  const totalUnits = items.reduce((s, i) => s + i.qty, 0);
  const now = new Date();
  const fecha = now.toLocaleDateString('es-AR');
  const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const lines = [];
  lines.push(`*Nuevo pedido — ${CONFIG.businessName}*`);
  lines.push('');
  lines.push('*Datos del cliente*');
  lines.push(`Nombre: ${client.nombre}`);
  if (client.empresa) lines.push(`Empresa: ${client.empresa}`);
  lines.push(`Teléfono: ${client.telefono}`);
  if (client.email) lines.push(`Email: ${client.email}`);
  if (client.comentario) lines.push(`Comentario: ${client.comentario}`);
  lines.push('');
  lines.push('*Productos solicitados*');

  for (const [category, list] of Object.entries(grouped)) {
    lines.push('');
    lines.push(category.toUpperCase());
    for (const { product, qty } of list) {
      lines.push(`- ${product.name} (Cód. barras ${product.barcode}) x${qty} — ${product.presentation}`);
    }
  }

  lines.push('');
  lines.push(`Total: ${items.length} producto${items.length !== 1 ? 's' : ''} · ${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''}`);
  lines.push('');
  lines.push(`Pedido generado el ${fecha} ${hora}`);

  return lines.join('\n');
}

function renderSuccessScreen(orderText) {
  el.checkoutModal.innerHTML = `
    <button class="modal__close" data-role="close-checkout" type="button" aria-label="Cerrar">${ICON_CLOSE}</button>
    <div class="modal__body modal__body--success">
      <div class="success-icon">${ICON_CHECK}</div>
      <h2 class="modal__title">¡Pedido generado!</h2>

      <div class="alert alert--info" style="text-align:left; margin-bottom:var(--space-4);">
        ${ICON_INFO}
        <span>Esto es una <strong>solicitud de presupuesto</strong>, todavía no es una compra confirmada. Nuestro equipo de ventas te contacta por WhatsApp o email dentro de las próximas horas hábiles para confirmar disponibilidad y coordinar la entrega.</span>
      </div>

      <div class="order-text-wrap">
        <p class="form-field__label" style="margin-bottom:var(--space-2);">Resumen del pedido</p>
        <div class="order-text">${escapeHtml(orderText)}</div>
      </div>

      <div class="success-actions">
        <button class="btn-primary btn-whatsapp" data-role="send-whatsapp" type="button">
          ${ICON_WHATSAPP}
          Enviar por WhatsApp
        </button>
        <button class="btn-secondary" data-role="send-email" type="button">
          ${ICON_MAIL}
          Enviar por email
        </button>
        <button class="btn-ghost" data-role="copy-order" type="button" style="width:100%; justify-content:center;">
          ${ICON_COPY}
          Copiar texto del pedido
        </button>
      </div>
    </div>
  `;
}

function sendWhatsApp() {
  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(lastOrderText)}`;
  window.open(url, '_blank', 'noopener');
}

function sendEmail() {
  const subject = `Pedido — ${CONFIG.businessName}${lastClientName ? ' — ' + lastClientName : ''}`;
  const url = `mailto:${CONFIG.salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastOrderText)}`;
  window.location.href = url;
}

async function copyOrderText() {
  try {
    await navigator.clipboard.writeText(lastOrderText);
    showToast('Texto del pedido copiado');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = lastOrderText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showToast('Texto del pedido copiado');
  }
}

/* ── Historial de pedidos ──────────────────────────────────────── */
function openHistoryModal() {
  const orders = getOrderHistory();
  el.historyModal.innerHTML = `
    <button class="modal__close" data-role="close-history" type="button" aria-label="Cerrar">${ICON_CLOSE}</button>
    <div class="modal__body">
      <h2 class="modal__title">Mis pedidos</h2>
      ${
        orders.length
          ? `<div class="history-list">${orders.map(renderHistoryOrderHTML).join('')}</div>`
          : `<p class="history-empty">Todavía no enviaste ningún pedido.<br>Cuando generes uno, va a aparecer acá para que puedas repetirlo fácilmente.</p>`
      }
    </div>
  `;
  showOverlay(el.historyOverlay);
}

function renderHistoryOrderHTML(order) {
  const date = new Date(order.date);
  const dateLabel = `${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;

  return `
    <details class="history-order">
      <summary class="history-order__summary">
        <div class="history-order__meta">
          <span class="history-order__date">${dateLabel}</span>
          <span class="history-order__stats">${order.totalItems} producto${order.totalItems !== 1 ? 's' : ''} · ${order.totalUnits} unidad${order.totalUnits !== 1 ? 'es' : ''}</span>
        </div>
        <svg class="history-order__chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </summary>
      <div class="history-order__detail">
        ${order.items
          .map(
            (i) => `
          <div class="history-row">
            <span class="history-row__name">${escapeHtml(i.name)}</span>
            <span class="history-row__qty">x${i.qty} <span class="history-row__unit">${escapeHtml(i.presentation)}</span></span>
          </div>
        `
          )
          .join('')}
        <button class="btn-repeat-order" data-role="repeat-order" data-order-id="${order.id}" type="button">
          ${ICON_REPEAT}
          Repetir pedido
        </button>
      </div>
    </details>
  `;
}

function repeatOrder(orderId) {
  const orders = getOrderHistory();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  const omitted = [];
  let addedCount = 0;
  for (const item of order.items) {
    const product = getProduct(item.sku);
    if (!product || product.disponibilidad === 'sin_stock') {
      omitted.push(item.name);
      continue;
    }
    cart.set(item.sku, item.qty);
    addedCount++;
  }

  onCartChange(null, { bump: addedCount > 0 });
  closeOverlay(el.historyOverlay);

  let msg = `${addedCount} producto${addedCount !== 1 ? 's' : ''} cargado${addedCount !== 1 ? 's' : ''} al pedido`;
  if (omitted.length) msg += ` · Sin stock: ${omitted.join(', ')}`;
  showToast(msg);
  openCartDrawer();
}

/* ── Overlays ─────────────────────────────────────────────────── */
function showOverlay(overlay) {
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => overlay.classList.add('is-open'));
}

function closeOverlay(overlay) {
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  setTimeout(() => { overlay.hidden = true; }, 300);
}

/* ── Toasts ───────────────────────────────────────────────────── */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

/* ── Eventos estáticos ────────────────────────────────────────── */
function bindStaticEvents() {
  el.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProductGrid();
    renderSearchSuggestions();
  });
  el.searchInput.addEventListener('focus', () => renderSearchSuggestions());
  el.searchInput.addEventListener('blur', () => setTimeout(hideSuggestions, 100));

  el.searchSuggestions.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const btn = e.target.closest('.search-suggestion');
    if (!btn) return;
    const product = getProduct(btn.dataset.sku);
    if (!product) return;
    searchQuery = product.name;
    el.searchInput.value = product.name;
    renderProductGrid();
    hideSuggestions();
  });

  el.btnCartHeader.addEventListener('click', () => openCartDrawer());
  el.btnHistoryHeader.addEventListener('click', () => openHistoryModal());
  el.cartClose.addEventListener('click', () => closeOverlay(el.cartDrawerOverlay));
  el.btnClearCart.addEventListener('click', () => { if (cart.size) clearCart(); });
  el.btnReviewOrder.addEventListener('click', () => {
    closeOverlay(el.cartDrawerOverlay);
    openCheckoutModal();
  });

  el.categoryChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const cat = chip.dataset.category;
    if (cat === '') activeCategories.clear();
    else if (activeCategories.has(cat)) activeCategories.delete(cat);
    else activeCategories.add(cat);
    renderCategoryChips();
    renderProductGrid();
  });

  [el.cartDrawerOverlay, el.modalOverlay, el.checkoutOverlay, el.historyOverlay].forEach((overlay) => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(overlay); });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    hideSuggestions();
    [el.cartDrawerOverlay, el.modalOverlay, el.checkoutOverlay, el.historyOverlay].forEach((overlay) => {
      if (!overlay.hidden) closeOverlay(overlay);
    });
  });

  el.productGrid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('[data-role="card"]');
    if (!card || e.target !== card) return;
    e.preventDefault();
    openProductModal(card.dataset.sku);
  });
}

/* ── Eventos delegados (contenido generado dinámicamente) ─────── */
function delegate(container, handler) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-role]');
    if (!btn || !container.contains(btn)) return;
    handler(btn.dataset.role, btn.dataset.sku, btn);
  });
}

function delegateQtyInput(container) {
  container.addEventListener('change', (e) => {
    const input = e.target.closest('[data-role="qty-input"]');
    if (!input || !container.contains(input)) return;
    setQtyExact(input.dataset.sku, input.value);
  });
  container.addEventListener(
    'focus',
    (e) => {
      const input = e.target.closest('[data-role="qty-input"]');
      if (input) input.select();
    },
    true
  );
}

function bindDelegatedEvents() {
  delegate(el.productGrid, (role, sku) => {
    if (role === 'card') openProductModal(sku);
    else if (role === 'add') addInitial(sku);
    else if (role === 'inc') changeQty(sku, +1);
    else if (role === 'dec') changeQty(sku, -1);
  });
  delegateQtyInput(el.productGrid);

  delegate(el.modalContent, (role, sku) => {
    if (role === 'close-modal') closeOverlay(el.modalOverlay);
    else if (role === 'add') addInitial(sku);
    else if (role === 'inc') changeQty(sku, +1);
    else if (role === 'dec') changeQty(sku, -1);
  });
  delegateQtyInput(el.modalContent);

  delegate(el.cartItems, (role, sku) => {
    if (role === 'inc') changeQty(sku, +1);
    else if (role === 'dec') changeQty(sku, -1);
    else if (role === 'remove') removeFromCart(sku);
  });
  delegateQtyInput(el.cartItems);

  delegate(el.checkoutModal, (role) => {
    if (role === 'close-checkout') closeOverlay(el.checkoutOverlay);
    else if (role === 'copy-order') copyOrderText();
    else if (role === 'send-whatsapp') sendWhatsApp();
    else if (role === 'send-email') sendEmail();
  });

  delegate(el.historyModal, (role, _sku, btn) => {
    if (role === 'close-history') closeOverlay(el.historyOverlay);
    else if (role === 'repeat-order') repeatOrder(btn.dataset.orderId);
  });
}
