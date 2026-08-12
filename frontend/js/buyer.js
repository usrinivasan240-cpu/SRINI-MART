// ============================================================================
// File:        buyer.js
// Module:      Phase 2 - Buyer Module
// Purpose:     Product browsing with search, category filter, price filter,
//              sorting, and add-to-cart.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   This is the brain of buyer.html — the main storefront page. It downloads
//   the approved products from the database, draws them as cards, lets the
//   customer filter/sort them, and handles the "Add to Cart" button. Cart
//   lines are stored per user+product in the cartItems table.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, collection, query, where, getDocs,
    getDoc, doc, setDoc
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, debounce, escapeHtml, stars, emptyState, skeleton, cachedFetch } from "./ui.js";

// Show this many products at a time; the "Load more" button reveals more.
const PAGE_SIZE = 12;

// --- Page state (the filters the customer has chosen) --------------------------
let session = null;        // the signed-in user
let categories = [];       // list of store categories
let allProducts = [];      // the full filtered/sorted list
let visibleCount = 0;      // how many cards are currently shown
let searchText = '';       // typed search box text
let categoryId = '';       // chosen category ('' = all)
let maxPrice = 0;          // price ceiling (0 = no limit)
let sortBy = 'newest';     // newest | priceLow | priceHigh | rating

// Shortcuts to the HTML controls on buyer.html.
const grid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const priceInput = document.getElementById('priceInput');
const sortSelect = document.getElementById('sortSelect');

// productImage: shows the product's first photo, or a 🛒 placeholder if the
// product has no photo.
function productImage(p) {
    if (p.images && p.images.length) {
        return `<img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" class="product-img" loading="lazy">`;
    }
    return `<div class="product-img placeholder">🛒</div>`;
}

// productCard: builds the HTML for one product (photo, name, rating, price,
// discount badge, "Add to Cart" button).
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

// fetchProducts: asks the DATABASE for matching products. The heavy filtering
// (category, price, approval) happens in the database; the lighter filtering
// (search text) happens in the browser below.
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

// applyClientFilters: the in-browser search — keeps products whose name,
// description or category contains the typed text.
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

// sortProducts: arranges the list the way the customer chose.
function sortProducts(products) {
    const sorted = [...products];
    if (sortBy === 'priceLow') sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === 'priceHigh') sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === 'rating') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else sorted.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    return sorted;
}

// renderVisible: draws only the currently-visible slice of products onto the
// page, updates the count, and shows/hides the "Load more" button.
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

// loadProducts: fetches + filters + sorts the products and redraws the grid.
// nextPage=true just reveals the next PAGE_SIZE products ("Load more").
async function loadProducts(nextPage = false) {
    if (nextPage) {
        visibleCount += PAGE_SIZE;
        renderVisible();
        return;
    }

    // Show grey skeleton cards while the database answers.
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

// loadCategories: downloads the category list (cached in the browser for 5
// minutes so every page visit doesn't re-download it) and fills the dropdown.
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

// refreshFilters: reads the current filter values and reloads the product grid.
function refreshFilters() {
    searchText = searchInput.value.trim();
    categoryId = categorySelect.value;
    maxPrice = parseFloat(priceInput.value) || 0;
    sortBy = sortSelect.value;
    loadProducts(false);
}

// --- Add to cart ---------------------------------------------------------------
// The cart line's ID is "<userId>_<productId>", so each user has one line per
// product — adding twice just raises the quantity instead of making a duplicate.

async function ensureCartItem(productId, qty) {
    // Re-check the product still exists and has enough stock.
    const productSnap = await getDoc(doc(db, 'products', productId));
    if (!productSnap.exists()) throw new Error('Product no longer available');
    const product = productSnap.data();
    if (!product.stock || product.stock < qty) throw new Error('Insufficient stock');

    // Read the current quantity in the cart (0 if not in cart yet).
    const cartRef = doc(db, 'cartItems', `${session.user.uid}_${productId}`);
    const cartSnap = await getDoc(cartRef);
    const currentQty = cartSnap.exists() ? (cartSnap.data().quantity || 0) : 0;
    const newQty = currentQty + qty;

    // Save the cart line (a snapshot of the product's info at this moment).
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

// addToCart: the global function the "Add to Cart" buttons call.
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

// updateCartCount: counts the user's cart lines and shows it on the cart icon.
async function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (!el || !session) return;
    try {
        const snap = await getDocs(query(collection(db, 'cartItems'), where('userId', '==', session.user.uid)));
        el.textContent = snap.size;
    } catch (e) { /* ignore */ }
}

// setUserMeta: fills the top-right name/role/avatar in the navbar.
function setUserMeta() {
    const p = session.profile;
    document.getElementById('userName').textContent = p.firstName ? `${p.firstName} ${p.lastName || ''}` : (p.email || 'User');
    document.getElementById('userRole').textContent = p.role || 'buyer';
    document.getElementById('userAvatar').textContent = (p.firstName || p.email || 'U').charAt(0).toUpperCase();
}

// --- Init -----------------------------------------------------------------------
// The startup routine: check login, wire up the controls, then load data.
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

// Start the page brain.
init();
