// ============================================================================
// File:        buyer.js
// Module:      Phase 2 - Buyer Module
// Purpose:     Product browsing with search, category filter, price filter,
//              sorting, and add-to-cart.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, collection, query, where, getDocs,
    getDoc, doc, setDoc
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, debounce, escapeHtml, stars, emptyState, skeleton, cachedFetch } from "./ui.js";

const PAGE_SIZE = 12;

let session = null;
let categories = [];
let allProducts = [];
let visibleCount = 0;
let searchText = '';
let categoryId = '';
let maxPrice = 0;
let sortBy = 'newest';

const grid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const priceInput = document.getElementById('priceInput');
const sortSelect = document.getElementById('sortSelect');

function productImage(p) {
    if (p.images && p.images.length) {
        return `<img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" class="product-img" loading="lazy">`;
    }
    return `<div class="product-img placeholder">🛒</div>`;
}

function productCard(p) {
    const discount = (p.mrp && p.mrp > p.price)
        ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    const outOfStock = !p.stock || p.stock <= 0;
    return `
        <div class="product-card">
            <a href="product.html?id=${p.id}" class="product-img-wrap">
                ${productImage(p)}
                ${discount > 0 ? `<span class="badge sale">${discount}% OFF</span>` : ''}
            </a>
            <div class="product-body">
                <a href="product.html?id=${p.id}" class="product-name">${escapeHtml(p.name)}</a>
                <div class="product-seller">${escapeHtml(p.sellerName || 'Seller')}</div>
                <div>${stars(p.rating)} <span class="muted">(${p.ratingCount || 0})</span></div>
                <div class="product-price-row">
                    <span class="price">${formatMoney(p.price)}</span>
                    ${p.mrp && p.mrp > p.price ? `<span class="mrp">${formatMoney(p.mrp)}</span>` : ''}
                </div>
                ${outOfStock ? `<div class="stock-tag">Out of stock</div>` : ''}
            </div>
            <div class="product-actions">
                <button class="btn btn-primary" ${outOfStock ? 'disabled' : ''}
                    onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>`;
}

// NOTE: We keep the query free of orderBy() so only simple composite indexes are
// required. Sorting and pagination happen client-side, which is fine for the
// demo dataset and keeps Firestore index setup minimal.
async function fetchProducts() {
    const constraints = [where('isApproved', '==', true), where('isActive', '==', true)];
    if (categoryId) constraints.push(where('categoryId', '==', categoryId));
    if (maxPrice > 0) constraints.push(where('price', '<=', maxPrice));

    const snap = await getDocs(query(collection(db, 'products'), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function applyClientFilters(products) {
    let result = products;
    if (searchText) {
        const term = searchText.toLowerCase();
        result = result.filter(p =>
            (p.name || '').toLowerCase().includes(term) ||
            (p.description || '').toLowerCase().includes(term) ||
            (p.categoryName || '').toLowerCase().includes(term));
    }
    return result;
}

function sortProducts(products) {
    const sorted = [...products];
    if (sortBy === 'priceLow') sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === 'priceHigh') sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === 'rating') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else sorted.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    return sorted;
}

function renderVisible() {
    const visible = allProducts.slice(0, visibleCount);
    grid.innerHTML = visible.map(productCard).join('')
        || emptyState('No products found. Try adjusting your filters.');

    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.textContent = allProducts.length
        ? `${allProducts.length} product${allProducts.length > 1 ? 's' : ''}` : '';

    const wrap = document.getElementById('loadMoreWrap');
    wrap.style.display = visibleCount < allProducts.length ? 'block' : 'none';
}

async function loadProducts(nextPage = false) {
    if (nextPage) {
        visibleCount += PAGE_SIZE;
        renderVisible();
        return;
    }

    grid.innerHTML = skeleton(8);
    document.getElementById('loadMoreWrap').style.display = 'none';

    try {
        allProducts = sortProducts(applyClientFilters(await fetchProducts()));
        visibleCount = Math.min(PAGE_SIZE, allProducts.length);
        renderVisible();
    } catch (e) {
        grid.innerHTML = emptyState('Failed to load products. Check your connection.');
    }
}

async function loadCategories() {
    try {
        categories = await cachedFetch('srinimart_categories', 5 * 60 * 1000, async () => {
            const snap = await getDocs(collection(db, 'categories'));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        });
        categorySelect.innerHTML = '<option value="">All Categories</option>' + categories.map(c =>
            `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
    } catch (e) { /* categories optional */ }
}

function refreshFilters() {
    searchText = searchInput.value.trim();
    categoryId = categorySelect.value;
    maxPrice = parseFloat(priceInput.value) || 0;
    sortBy = sortSelect.value;
    loadProducts(false);
}

// --- Add to cart ---------------------------------------------------------------

async function ensureCartItem(productId, qty) {
    const productSnap = await getDoc(doc(db, 'products', productId));
    if (!productSnap.exists()) throw new Error('Product no longer available');
    const product = productSnap.data();
    if (!product.stock || product.stock < qty) throw new Error('Insufficient stock');

    const cartRef = doc(db, 'cartItems', `${session.user.uid}_${productId}`);
    const cartSnap = await getDoc(cartRef);
    const currentQty = cartSnap.exists() ? (cartSnap.data().quantity || 0) : 0;
    const newQty = currentQty + qty;

    await setDoc(cartRef, {
        userId: session.user.uid,
        productId,
        name: product.name,
        price: product.price,
        mrp: product.mrp || product.price,
        image: (product.images && product.images[0]) || '',
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        quantity: newQty,
        updatedAt: new Date()
    }, { merge: true });
    return newQty;
}

window.addToCart = async function(productId) {
    if (!session) { window.location.href = 'login.html'; return; }
    try {
        await ensureCartItem(productId, 1);
        toast('Added to cart', 'success');
        updateCartCount();
    } catch (e) {
        toast(e.message || 'Could not add to cart', 'error');
    }
};

async function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (!el || !session) return;
    try {
        const snap = await getDocs(query(collection(db, 'cartItems'), where('userId', '==', session.user.uid)));
        el.textContent = snap.size;
    } catch (e) { /* ignore */ }
}

function setUserMeta() {
    const p = session.profile;
    document.getElementById('userName').textContent = p.firstName ? `${p.firstName} ${p.lastName || ''}` : (p.email || 'User');
    document.getElementById('userRole').textContent = p.role || 'buyer';
    document.getElementById('userAvatar').textContent = (p.firstName || p.email || 'U').charAt(0).toUpperCase();
}

// --- Init -----------------------------------------------------------------------

async function init() {
    session = await requireAuth();
    if (!session) return;
    setUserMeta();
    document.getElementById('logoutBtn').addEventListener('click', logout);

    searchInput.addEventListener('input', debounce(refreshFilters, 400));
    categorySelect.addEventListener('change', refreshFilters);
    priceInput.addEventListener('input', debounce(refreshFilters, 400));
    sortSelect.addEventListener('change', refreshFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        searchInput.value = ''; categorySelect.value = ''; priceInput.value = ''; sortSelect.value = 'newest';
        refreshFilters();
    });
    document.getElementById('loadMoreBtn').addEventListener('click', () => loadProducts(true));

    await loadCategories();
    await loadProducts(false);
    await updateCartCount();
}

init();
