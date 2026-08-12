// ============================================================================
// File:        seller.js
// Module:      Phase 3 - Seller Module
// Purpose:     Seller dashboard with product CRUD (incl. image upload to
//              Firebase Storage), inventory stats, and order viewing.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   The brain of seller.html — the private area for people who sell items.
//   Sellers can add/edit/delete their products (photos go to Firebase
//   Storage), switch a product on/off, watch their stock levels, and see the
//   orders buyers placed for their products. New products start as "Pending"
//   until an admin approves them.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, storage, ref, uploadBytes, getDownloadURL, deleteObject,
    collection, query, where, orderBy, getDocs, doc,
    setDoc, updateDoc, deleteDoc, serverTimestamp
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, escapeHtml, emptyState, setLoading, cachedFetch } from "./ui.js";

// --- Page state -----------------------------------------------------------------
let session = null;      // the signed-in seller
let products = [];       // this seller's products
let categories = [];     // store categories (for the dropdown)
let imageFiles = [];     // newly-chosen photo files (not yet uploaded)
let existingImages = []; // URLs of already-uploaded photos (when editing)

// --- Tabs -----------------------------------------------------------------------
// showTab: switches between the "Products" and "Orders" panels.

window.showTab = function(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.getElementById('tab-products').classList.toggle('active', name === 'products');
    document.getElementById('tab-orders').classList.toggle('active', name === 'orders');
    if (name === 'orders') loadSellerOrders();
};

// --- Stats ----------------------------------------------------------------------
// Quick numbers for the top cards: total products, active products, low-stock
// (≤5 left), and how many orders are still waiting (pending).

async function loadStats() {
    const active = products.filter(p => p.isActive).length;
    const lowStock = products.filter(p => (p.stock || 0) <= 5).length;
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statLowStock').textContent = lowStock;

    let pending = 0;
    const snap = await getDocs(query(
        collection(db, 'sellerOrders'),
        where('sellerId', '==', session.user.uid)
    ));
    for (const d of snap.docs) {
        if (d.data().orderStatus === 'pending') pending++;
    }
    document.getElementById('statOrders').textContent = pending;
}

// --- Products -------------------------------------------------------------------

// loadProducts: downloads everything this seller owns, newest first.
async function loadProducts() {
    const snap = await getDocs(query(
        collection(db, 'products'),
        where('sellerId', '==', session.user.uid),
        orderBy('createdAt', 'desc')
    ));
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts();
    loadStats();
}

// renderProducts: draws the products table (photo, name, category, price,
// stock, active/pending pills, and the Edit / Activate / Delete buttons).
function renderProducts() {
    const tbody = document.getElementById('productTableBody');
    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center muted">No products yet. Click "+ Add Product" to get started.</td></tr>`;
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.images && p.images[0]
                ? `<img src="${escapeHtml(p.images[0])}" class="thumb" alt="">`
                : '<div class="thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-primary)">🛒</div>'}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.categoryName || '—')}</td>
            <td>${formatMoney(p.price)}</td>
            <td>${p.stock ?? 0}</td>
            <td>${p.isActive ? '<span class="pill green">Active</span>' : '<span class="pill gray">Inactive</span>'}</td>
            <td>${p.isApproved ? '<span class="pill green">Approved</span>' : '<span class="pill amber">Pending</span>'}</td>
            <td>
                <div class="row-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="toggleProduct('${p.id}')">${p.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button class="btn btn-sm" style="background:none;color:var(--danger);border:1px solid var(--danger)" onclick="deleteProduct('${p.id}')">Delete</button>
                </div>
            </td>
        </tr>`).join('');
}

// loadCategories: fills the category dropdown (cached for 5 minutes).
async function loadCategories() {
    categories = await cachedFetch('srinimart_categories', 5 * 60 * 1000, async () => {
        const snap = await getDocs(collection(db, 'categories'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    document.getElementById('pCategory').innerHTML = '<option value="">Select category</option>' +
        categories.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
}

// openProductModal / closeProductModal: open a blank "Add Product" form,
// or close the modal.
window.openProductModal = function() {
    document.getElementById('productForm').reset();
    document.getElementById('pId').value = '';
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('pActive').checked = true;
    imageFiles = [];
    existingImages = [];
    document.getElementById('pImagePreviews').innerHTML = '';
    document.getElementById('productModal').classList.add('open');
};

window.closeProductModal = function() {
    document.getElementById('productModal').classList.remove('open');
};

// editProduct: fills the form with a product's current values so the seller
// can change them (existing photos are loaded into the preview).
window.editProduct = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('pId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pCategory').value = p.categoryId || '';
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pMrp').value = p.mrp || '';
    document.getElementById('pStock').value = p.stock ?? 0;
    document.getElementById('pDescription').value = p.description || '';
    document.getElementById('pActive').checked = !!p.isActive;
    imageFiles = [];
    existingImages = (p.images && p.images.length) ? [...p.images] : [];
    renderImagePreviews();
    document.getElementById('productModal').classList.add('open');
};

// renderImagePreviews: shows small thumbnails of the photos that are already
// on the product, each with an × to remove it.
function renderImagePreviews() {
    const wrap = document.getElementById('pImagePreviews');
    wrap.innerHTML = '';
    existingImages.forEach((url, i) => {
        wrap.innerHTML += `
            <div class="image-preview">
                <img src="${escapeHtml(url)}" alt="preview">
                <button type="button" onclick="removeImage('${i}')">&times;</button>
            </div>`;
    });
}

// removeImage: drops one photo from the "existing images" list.
window.removeImage = function(index) {
    existingImages.splice(index, 1);
    renderImagePreviews();
};

// toggleProduct: switches a product between "Active" (visible in the store)
// and "Inactive" (hidden). Only approved products ever show either way.
window.toggleProduct = async function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    await updateDoc(doc(db, 'products', id), { isActive: !p.isActive, updatedAt: serverTimestamp() });
    p.isActive = !p.isActive;
    renderProducts();
    loadStats();
    toast(p.isActive ? 'Product activated' : 'Product deactivated', 'info');
};

// deleteProduct: removes the product record AND tries to delete its photos
// from Firebase Storage.
window.deleteProduct = async function(id) {
    if (!confirm('Delete this product permanently?')) return;
    const p = products.find(x => x.id === id);
    try {
        await deleteDoc(doc(db, 'products', id));
        if (p && p.images) {
            for (const url of p.images) {
                try { await deleteObject(ref(storage, url)); } catch (e) { /* url may be external */ }
            }
        }
        products = products.filter(x => x.id !== id);
        renderProducts();
        loadStats();
        toast('Product deleted', 'info');
    } catch (e) {
        toast('Could not delete product', 'error');
    }
};

// --- Image upload ----------------------------------------------------------------
// When the seller picks photos, show previews right away (the actual upload
// to Firebase Storage happens later, when the form is saved).

document.getElementById('pImages').addEventListener('change', (e) => {
    imageFiles = [...e.target.files];
    const wrap = document.getElementById('pImagePreviews');
    if (imageFiles.length) wrap.innerHTML = '';
    for (const f of imageFiles) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            wrap.innerHTML += `<div class="image-preview"><img src="${ev.target.result}" alt="preview"></div>`;
        };
        reader.readAsDataURL(f);
    }
});

// uploadNewImages: sends the chosen files to Firebase Storage. Each photo is
// saved inside the product's own folder with a timestamp so names never clash.
async function uploadNewImages(productId) {
    const urls = [];
    for (const file of imageFiles) {
        const storageRef = ref(storage, `products/${productId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`);
        await uploadBytes(storageRef, file);
        urls.push(await getDownloadURL(storageRef));
    }
    return urls;
}

// --- Save product -----------------------------------------------------------------
// Saves a new product (or updates an existing one). Note isApproved is always
// set to false on create — an admin must approve it before it reaches the store.

async function saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('saveProductBtn');
    const name = document.getElementById('pName').value.trim();
    const categoryId = document.getElementById('pCategory').value;
    const price = parseFloat(document.getElementById('pPrice').value);
    const mrp = parseFloat(document.getElementById('pMrp').value) || price;
    const stock = parseInt(document.getElementById('pStock').value) || 0;

    if (!categoryId) { toast('Please select a category', 'error'); return; }
    const category = categories.find(c => c.id === categoryId);

    setLoading(btn, true);
    try {
        const editingId = document.getElementById('pId').value;
        let productId = editingId;
        // New products get a fresh id generated by the browser.
        if (!editingId) productId = doc(collection(db, 'products')).id;

        // Upload new photos first, then combine with the kept old ones.
        const uploaded = await uploadNewImages(productId);
        const images = [...existingImages, ...uploaded];

        const data = {
            sellerId: session.user.uid,
            sellerName: session.profile.storeName || `${session.profile.firstName || ''} ${session.profile.lastName || ''}`.trim(),
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            description: document.getElementById('pDescription').value.trim(),
            categoryId,
            categoryName: category ? category.name : '',
            price,
            mrp: Math.max(mrp, price),
            stock,
            images,
            isActive: document.getElementById('pActive').checked,
            isApproved: false,
            rating: 0,
            ratingCount: 0,
            searchKeywords: name.toLowerCase().split(/\s+/),
            updatedAt: serverTimestamp()
        };

        if (editingId) {
            // Editing keeps createdAt untouched (merge only adds/updates fields).
            await setDoc(doc(db, 'products', editingId), data, { merge: true });
        } else {
            // Creating sets createdAt too.
            await setDoc(doc(db, 'products', productId), { ...data, createdAt: serverTimestamp() });
        }

        toast(editingId ? 'Product updated!' : 'Product created! Awaiting admin approval.', 'success');
        closeProductModal();
        await loadProducts();
    } catch (err) {
        toast('Could not save product', 'error');
    } finally {
        setLoading(btn, false);
    }
}

// --- Seller orders ----------------------------------------------------------------
// Shows the orders that contain this seller's products (copied into
// sellerOrders at checkout time), newest first.

async function loadSellerOrders() {
    const listEl = document.getElementById('sellerOrderList');
    listEl.innerHTML = '<div class="muted">Loading orders...</div>';
    const snap = await getDocs(query(
        collection(db, 'sellerOrders'),
        where('sellerId', '==', session.user.uid),
        orderBy('createdAt', 'desc')
    ));
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!orders.length) {
        listEl.innerHTML = emptyState('No orders for your products yet.');
        return;
    }

    listEl.innerHTML = orders.map(o => {
        const statusLabels = { pending: 'Pending', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
        const statusPill = `<span class="order-status ${escapeHtml(o.orderStatus)}">${statusLabels[o.orderStatus] || escapeHtml(o.orderStatus)}</span>`;
        return `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${escapeHtml(o.orderId ? o.orderId.slice(-6).toUpperCase() : o.id.slice(-6).toUpperCase())}</div>
                        <div class="muted">Buyer: ${escapeHtml(o.buyerName || o.userName || o.buyerId)}</div>
                    </div>
                    ${statusPill}
                </div>
                <div class="order-items">
                    ${(o.items || []).map(i => `
                        <div class="order-item">
                            <div class="oi-name">${escapeHtml(i.name)}</div>
                            <div class="oi-qty">× ${i.quantity}</div>
                            <div class="oi-price">${formatMoney((i.price || 0) * i.quantity)}</div>
                        </div>`).join('')}
                </div>
                <div class="order-meta">
                    <span>Address: ${escapeHtml(o.shippingAddress?.address || '')}, ${escapeHtml(o.shippingAddress?.city || '')}</span>
                    <span>${escapeHtml(o.paymentMethod || '')}</span>
                </div>
            </div>`;
    }).join('');
}

// --- Init --------------------------------------------------------------------------
// Sellers only — requireAuth kicks non-sellers to their own homepage.
async function init() {
    session = await requireAuth(['seller']);
    if (!session) return;
    document.getElementById('userName').textContent = session.profile.firstName
        ? `${session.profile.firstName} ${session.profile.lastName || ''}` : (session.profile.email || 'User');
    document.getElementById('userRole').textContent = session.profile.role || 'seller';
    document.getElementById('userAvatar').textContent = (session.profile.firstName || session.profile.email || 'U').charAt(0).toUpperCase();
    document.getElementById('storeGreeting').textContent = session.profile.storeName
        ? `Welcome to ${session.profile.storeName}!` : 'Manage your products and orders.';
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('productForm').addEventListener('submit', saveProduct);

    await loadCategories();
    await loadProducts();
}

// Start the page brain.
init();
