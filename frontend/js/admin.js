// ============================================================================
// File:        admin.js
// Module:      Phase 6 - Admin Module
// Purpose:     Platform statistics, user management, product moderation,
//              order management, review moderation, and demo data seeding.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, collection, query, where, orderBy, getDocs, getDoc, doc, setDoc,
    updateDoc, serverTimestamp, increment
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, formatDate, escapeHtml } from "./ui.js";

let session = null;

// --- Tabs ----------------------------------------------------------------------

window.showTab = function(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
};

// --- Stats ----------------------------------------------------------------------

async function loadStats() {
    let users = 0, buyers = 0, sellers = 0, products = 0, pending = 0, orders = 0, revenue = 0, pendingReviews = 0;

    const usersSnap = await getDocs(collection(db, 'users'));
    users = usersSnap.size;
    for (const d of usersSnap.docs) {
        const u = d.data();
        if (u.role === 'buyer') buyers++;
        else if (u.role === 'seller') sellers++;
    }

    const prodSnap = await getDocs(collection(db, 'products'));
    products = prodSnap.size;
    for (const d of prodSnap.docs) {
        if (!d.data().isApproved) pending++;
    }

    const orderSnap = await getDocs(collection(db, 'orders'));
    orders = orderSnap.size;
    for (const d of orderSnap.docs) {
        const o = d.data();
        if (o.orderStatus !== 'cancelled') revenue += o.total || 0;
    }

    const revSnap = await getDocs(query(collection(db, 'reviews'), where('status', '==', 'pending')));
    pendingReviews = revSnap.size;

    document.getElementById('stUsers').textContent = users;
    document.getElementById('stBuyers').textContent = buyers;
    document.getElementById('stSellers').textContent = sellers;
    document.getElementById('stProducts').textContent = products;
    document.getElementById('stPending').textContent = pending;
    document.getElementById('stOrders').textContent = orders;
    document.getElementById('stRevenue').textContent = formatMoney(revenue);
    document.getElementById('stReviews').textContent = pendingReviews;
}

// --- Users ----------------------------------------------------------------------

async function loadUsers() {
    const tbody = document.getElementById('usersBody');
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) { tbody.innerHTML = `<tr><td colspan="6" class="text-center muted">No users yet.</td></tr>`; return; }

    tbody.innerHTML = snap.docs.map(d => {
        const u = d.data();
        const isMe = d.id === session.user.uid;
        return `
            <tr>
                <td><strong>${escapeHtml(`${u.firstName || ''} ${u.lastName || ''}`.trim() || '—')}</strong></td>
                <td>${escapeHtml(u.email || '—')}</td>
                <td>
                    <select class="role-select" ${isMe ? 'disabled' : ''} onchange="changeRole('${d.id}', this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius)">
                        <option value="buyer" ${u.role === 'buyer' ? 'selected' : ''}>Buyer</option>
                        <option value="seller" ${u.role === 'seller' ? 'selected' : ''}>Seller</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>${u.isActive === false ? '<span class="pill red">Deactivated</span>' : '<span class="pill green">Active</span>'}</td>
                <td>${formatDate(u.createdAt)}</td>
                <td>
                    <div class="row-actions">
                        ${isMe ? '<span class="muted">You</span>' : `
                            <button class="btn btn-sm btn-secondary" onclick="toggleUser('${d.id}', ${u.isActive !== false})">${u.isActive === false ? 'Activate' : 'Deactivate'}</button>
                        `}
                    </div>
                </td>
            </tr>`;
    }).join('');
}

window.toggleUser = async function(userId, currentlyActive) {
    try {
        await updateDoc(doc(db, 'users', userId), {
            isActive: !currentlyActive,
            updatedAt: serverTimestamp()
        });
        toast(currentlyActive ? 'User deactivated' : 'User activated', 'info');
        loadUsers();
    } catch (e) { toast('Could not update user', 'error'); }
};

window.changeRole = async function(userId, role) {
    try {
        await updateDoc(doc(db, 'users', userId), { role, updatedAt: serverTimestamp() });
        toast('Role updated', 'success');
        loadUsers();
    } catch (e) { toast('Could not update role', 'error'); }
};

// --- Products ---------------------------------------------------------------------

async function loadProducts() {
    const tbody = document.getElementById('productsBody');
    const snap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
    if (snap.empty) { tbody.innerHTML = `<tr><td colspan="8" class="text-center muted">No products yet.</td></tr>`; return; }

    tbody.innerHTML = snap.docs.map(d => {
        const p = d.data();
        return `
            <tr>
                <td>${p.images && p.images[0]
                    ? `<img src="${escapeHtml(p.images[0])}" class="thumb" alt="">`
                    : '<div class="thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-primary)">🛒</div>'}</td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.sellerName || '—')}</td>
                <td>${formatMoney(p.price)}</td>
                <td>${p.stock ?? 0}</td>
                <td>${p.isApproved ? '<span class="pill green">Approved</span>' : '<span class="pill amber">Pending</span>'}</td>
                <td>${p.isActive ? '<span class="pill green">Active</span>' : '<span class="pill gray">Hidden</span>'}</td>
                <td>
                    <div class="row-actions">
                        ${p.isApproved
                            ? `<button class="btn btn-sm btn-secondary" onclick="approveProduct('${d.id}', false)">Reject</button>`
                            : `<button class="btn btn-sm btn-secondary" onclick="approveProduct('${d.id}', true)">Approve</button>`}
                        <button class="btn btn-sm btn-secondary" onclick="toggleProductVisibility('${d.id}')">${p.isActive ? 'Hide' : 'Show'}</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

window.approveProduct = async function(productId, approve) {
    try {
        await updateDoc(doc(db, 'products', productId), {
            isApproved: approve,
            updatedAt: serverTimestamp()
        });
        toast(approve ? 'Product approved' : 'Product rejected', 'info');
        loadProducts();
        loadStats();
    } catch (e) { toast('Could not update product', 'error'); }
};

window.toggleProductVisibility = async function(productId) {
    const snap = await getDoc(doc(db, 'products', productId));
    if (!snap.exists()) return;
    const active = snap.data().isActive;
    await updateDoc(doc(db, 'products', productId), { isActive: !active, updatedAt: serverTimestamp() });
    toast(active ? 'Product hidden from storefront' : 'Product visible on storefront', 'info');
    loadProducts();
};

// --- Orders -----------------------------------------------------------------------

async function loadOrders() {
    const tbody = document.getElementById('ordersBody');
    const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
    if (snap.empty) { tbody.innerHTML = `<tr><td colspan="6" class="text-center muted">No orders yet.</td></tr>`; return; }

    tbody.innerHTML = snap.docs.map(d => {
        const o = d.data();
        const itemCount = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        return `
            <tr>
                <td><strong>#${escapeHtml(d.id.slice(-6).toUpperCase())}</strong></td>
                <td>${escapeHtml(o.userName || o.userId || '—')}</td>
                <td>${itemCount} item${itemCount > 1 ? 's' : ''}</td>
                <td>${formatMoney(o.total)}</td>
                <td>${escapeHtml(o.paymentMethod || '—')}</td>
                <td>
                    <select onchange="changeOrderStatus('${d.id}', this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius)">
                        ${statuses.map(s => `<option value="${s}" ${o.orderStatus === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                    </select>
                </td>
            </tr>`;
    }).join('');
}

window.changeOrderStatus = async function(orderId, status) {
    try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (!orderSnap.exists()) throw new Error('Order not found');
        const prev = orderSnap.data().orderStatus;

        // Restore stock when an order is cancelled.
        if (status === 'cancelled' && prev !== 'cancelled') {
            for (const item of orderSnap.data().items || []) {
                await updateDoc(doc(db, 'products', item.productId), {
                    stock: increment(item.quantity)
                });
            }
        }
        await updateDoc(doc(db, 'orders', orderId), { orderStatus: status, updatedAt: serverTimestamp() });
        toast('Order status updated', 'success');
        loadStats();
    } catch (e) { toast('Could not update order', 'error'); }
};

// --- Reviews ----------------------------------------------------------------------

async function loadReviews() {
    const tbody = document.getElementById('reviewsBody');
    const snap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
    if (snap.empty) { tbody.innerHTML = `<tr><td colspan="6" class="text-center muted">No reviews yet.</td></tr>`; return; }

    tbody.innerHTML = snap.docs.map(d => {
        const r = d.data();
        return `
            <tr>
                <td>${escapeHtml(r.productId || '—')}</td>
                <td>${escapeHtml(r.userName || '—')}</td>
                <td>${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</td>
                <td style="max-width:260px">${escapeHtml(r.comment || '')}</td>
                <td>
                    ${r.status === 'approved' ? '<span class="pill green">Approved</span>'
                    : r.status === 'rejected' ? '<span class="pill red">Rejected</span>'
                    : '<span class="pill amber">Pending</span>'}
                </td>
                <td>
                    <div class="row-actions">
                        ${r.status !== 'approved' ? `<button class="btn btn-sm btn-secondary" onclick="moderateReview('${d.id}', 'approved')">Approve</button>` : ''}
                        ${r.status !== 'rejected' ? `<button class="btn btn-sm" style="background:none;color:var(--danger);border:1px solid var(--danger)" onclick="moderateReview('${d.id}', 'rejected')">Reject</button>` : ''}
                    </div>
                </td>
            </tr>`;
    }).join('');
}

window.moderateReview = async function(reviewId, status) {
    try {
        await updateDoc(doc(db, 'reviews', reviewId), { status, updatedAt: serverTimestamp() });
        toast(`Review ${status}`, 'info');
        loadReviews();
        loadStats();
    } catch (e) { toast('Could not moderate review', 'error'); }
};

// --- Demo data seeding --------------------------------------------------------------

const SEED_CATEGORIES = [
    { name: 'Electronics', description: 'Gadgets, mobile phones, laptops and accessories' },
    { name: 'Fashion', description: 'Clothing, footwear and accessories for everyone' },
    { name: 'Groceries', description: 'Daily essentials, snacks and beverages' },
    { name: 'Home & Living', description: 'Furniture, decor and kitchen essentials' },
    { name: 'Books', description: 'Fiction, non-fiction and academic books' },
    { name: 'Sports & Fitness', description: 'Gym equipment, sports gear and activewear' }
];

const SEED_PRODUCTS = [
    { name: 'Wireless Bluetooth Earbuds', category: 'Electronics', price: 799, mrp: 2499, stock: 120, emoji: '🎧' },
    { name: 'Smart Fitness Band', category: 'Electronics', price: 1299, mrp: 3999, stock: 80, emoji: '⌚' },
    { name: 'Classic Cotton T-Shirt', category: 'Fashion', price: 399, mrp: 999, stock: 200, emoji: '👕' },
    { name: 'Running Shoes', category: 'Fashion', price: 1499, mrp: 3499, stock: 60, emoji: '👟' },
    { name: 'Organic Basmati Rice (5kg)', category: 'Groceries', price: 499, mrp: 799, stock: 150, emoji: '🍚' },
    { name: 'Premium Green Tea (100 bags)', category: 'Groceries', price: 299, mrp: 599, stock: 90, emoji: '🍵' },
    { name: 'Stainless Steel Cookware Set', category: 'Home & Living', price: 2999, mrp: 5999, stock: 40, emoji: '🍳' },
    { name: 'LED Study Desk Lamp', category: 'Home & Living', price: 599, mrp: 1499, stock: 110, emoji: '💡' },
    { name: 'Bestseller Novel Collection', category: 'Books', price: 449, mrp: 999, stock: 75, emoji: '📚' },
    { name: 'Yoga Mat with Carry Strap', category: 'Sports & Fitness', price: 699, mrp: 1499, stock: 85, emoji: '🧘' }
];

async function seedData() {
    const btn = document.getElementById('seedBtn');
    btn.disabled = true;

    try {
        // Categories (idempotent by name).
        const catSnap = await getDocs(collection(db, 'categories'));
        const existing = new Set(catSnap.docs.map(d => d.data().name));
        for (const c of SEED_CATEGORIES) {
            if (existing.has(c.name)) continue;
            const ref = doc(collection(db, 'categories'));
            await setDoc(ref, {
                name: c.name,
                slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                description: c.description,
                createdAt: serverTimestamp()
            });
        }
        const categories = (await getDocs(collection(db, 'categories'))).docs.map(d => ({ id: d.id, ...d.data() }));

        // Only seed products if the store is empty.
        const prodSnap = await getDocs(collection(db, 'products'));
        if (prodSnap.empty) {
            for (const sp of SEED_PRODUCTS) {
                const cat = categories.find(c => c.name === sp.category);
                const ref = doc(collection(db, 'products'));
                await setDoc(ref, {
                    sellerId: session.user.uid,
                    sellerName: 'SriniMart Demo Store',
                    name: sp.name,
                    slug: sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                    description: `${sp.emoji} Demo product: ${sp.name}. This listing was created by the demo data tool so you can try the storefront, cart, checkout and reviews.`,
                    categoryId: cat ? cat.id : '',
                    categoryName: cat ? cat.name : sp.category,
                    price: sp.price,
                    mrp: sp.mrp,
                    stock: sp.stock,
                    images: [],
                    isActive: true,
                    isApproved: true,
                    rating: Math.round((3.5 + Math.random()) * 10) / 10,
                    ratingCount: Math.floor(Math.random() * 50) + 5,
                    searchKeywords: sp.name.toLowerCase().split(/\s+/),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        }

        toast('Demo data seeded successfully!', 'success');
        loadStats();
    } catch (e) {
        toast('Could not seed demo data', 'error');
    } finally {
        btn.disabled = false;
    }
}

// --- Init --------------------------------------------------------------------------

async function init() {
    session = await requireAuth(['admin']);
    if (!session) return;
    document.getElementById('userName').textContent = session.profile.firstName
        ? `${session.profile.firstName} ${session.profile.lastName || ''}` : (session.profile.email || 'User');
    document.getElementById('userRole').textContent = session.profile.role || 'admin';
    document.getElementById('userAvatar').textContent = (session.profile.firstName || session.profile.email || 'U').charAt(0).toUpperCase();
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('seedBtn').addEventListener('click', seedData);

    await Promise.all([loadStats(), loadUsers(), loadProducts(), loadOrders(), loadReviews()]);
}

init();
