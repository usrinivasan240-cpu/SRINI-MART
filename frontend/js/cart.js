// ============================================================================
// File:        cart.js
// Module:      Phase 2/4 - Shopping Cart
// Purpose:     Cart items listing, quantity update, remove, and summary.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   The brain of cart.html. It lists everything the customer has added,
//   lets them change quantities or remove items, and adds up the money
//   (subtotal, discounts, shipping fee, grand total). It "listens" to the
//   database, so if anything changes the page updates by itself.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, collection, query, where, getDocs, getDoc, doc,
    setDoc, updateDoc, deleteDoc, onSnapshot
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, escapeHtml, emptyState } from "./ui.js";

// --- Page state -----------------------------------------------------------------
let session = null;   // the signed-in user
let cart = [];        // this user's cart lines

// Shipping rule: FREE above ₹500, otherwise a flat ₹40.
const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_FEE = 40;

// Shortcuts to the two main areas of the page.
const itemsEl = document.getElementById('cartItems');
const summaryEl = document.getElementById('summaryCard');
// Did the user click "Buy Now"? Then skip straight to checkout.
const buyNow = new URLSearchParams(window.location.search).get('buynow') === '1';

// computeTotals: works out subtotal, discount (MRP − price), shipping and the
// final total from the current cart contents.
function computeTotals() {
    let subtotal = 0, mrpTotal = 0;
    for (const item of cart) {
        subtotal += (item.price || 0) * item.quantity;
        mrpTotal += (item.mrp || item.price || 0) * item.quantity;
    }
    const discount = Math.max(0, mrpTotal - subtotal);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return { subtotal, discount, shipping, total: subtotal + shipping };
}

// renderCart: draws every cart line (photo, name, price, quantity + / −,
// remove button) and fills in the summary numbers on the right.
function renderCart() {
    itemsEl.innerHTML = '';
    if (!cart.length) {
        itemsEl.innerHTML = emptyState('Your cart is empty. <a href="buyer.html">Browse products</a>');
        summaryEl.style.display = 'none';
        return;
    }

    const totals = computeTotals();
    cart.sort((a, b) => (a.addedAt && b.addedAt ? b.addedAt - a.addedAt : 0));

    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div>
                ${item.image
                    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">`
                    : `<div style="width:90px;height:90px;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);border-radius:var(--radius);font-size:28px">🛒</div>`}
            </div>
            <div>
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-price">${formatMoney(item.price)} each</div>
                <button class="item-remove" onclick="removeItem('${item.productId}')">Remove</button>
            </div>
            <div style="text-align:right">
                <div class="quantity-control" style="margin-left:auto">
                    <button onclick="changeQty('${item.productId}', -1)">−</button>
                    <input type="text" value="${item.quantity}" readonly style="width:44px">
                    <button onclick="changeQty('${item.productId}', 1)">+</button>
                </div>
                <div class="item-price mt-8"><strong>${formatMoney((item.price || 0) * item.quantity)}</strong></div>
            </div>`;
        itemsEl.appendChild(row);
    });

    // Fill the price summary card.
    summaryEl.style.display = 'block';
    document.getElementById('sumSubtotal').textContent = formatMoney(totals.subtotal);
    document.getElementById('sumShipping').textContent = totals.shipping === 0 ? 'FREE' : formatMoney(totals.shipping);
    document.getElementById('sumDiscount').textContent = `−${formatMoney(totals.discount)}`;
    document.getElementById('sumTotal').textContent = formatMoney(totals.total);
}

// refreshCart: one-shot download of the user's cart lines.
async function refreshCart() {
    const snap = await getDocs(query(collection(db, 'cartItems'), where('userId', '==', session.user.uid)));
    cart = snap.docs.map(d => ({ id: d.id, productId: d.data().productId, ...d.data(), addedAt: d.data().updatedAt?.toDate?.() || 0 }));
    renderCart();
}

// changeQty: the + / − buttons. Checks the real product stock in the database
// before allowing a higher quantity; dropping to 0 removes the item.
window.changeQty = async function(productId, delta) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { await removeItem(productId); return; }

    try {
        const prodSnap = await getDoc(doc(db, 'products', productId));
        if (!prodSnap.exists()) throw new Error('Product unavailable');
        const stock = prodSnap.data().stock || 0;
        if (newQty > stock) throw new Error('Not enough stock available');

        const ref = doc(db, 'cartItems', item.id);
        await updateDoc(ref, { quantity: newQty, updatedAt: new Date() });
        item.quantity = newQty;
        renderCart();
    } catch (e) {
        toast(e.message || 'Could not update quantity', 'error');
    }
};

// removeItem: deletes a cart line.
window.removeItem = async function(productId) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    await deleteDoc(doc(db, 'cartItems', item.id));
    toast('Item removed', 'info');
    refreshCart();
};

// updateCartCount: shows how many lines are in the cart on the icon.
async function updateCartCount() {
    const snap = await getDocs(query(collection(db, 'cartItems'), where('userId', '==', session.user.uid)));
    const el = document.getElementById('cartCount');
    if (el) el.textContent = snap.size;
}

// --- Init ------------------------------------------------------------------------
async function init() {
    session = await requireAuth();
    if (!session) return;
    document.getElementById('userName').textContent = session.profile.firstName
        ? `${session.profile.firstName} ${session.profile.lastName || ''}` : (session.profile.email || 'User');
    document.getElementById('userRole').textContent = session.profile.role || 'buyer';
    document.getElementById('userAvatar').textContent = (session.profile.firstName || session.profile.email || 'U').charAt(0).toUpperCase();
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Live updates: whenever the cart changes (even in another tab) the page
    // re-draws itself automatically.
    onSnapshot(query(collection(db, 'cartItems'), where('userId', '==', session.user.uid)), (snap) => {
        cart = snap.docs.map(d => ({ id: d.id, productId: d.data().productId, ...d.data(), addedAt: d.data().updatedAt?.toDate?.() || 0 }));
        renderCart();
        const el = document.getElementById('cartCount');
        if (el) el.textContent = snap.size;
    });

    document.getElementById('checkoutBtn').addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });

    // If the user arrived from a product page's "Buy Now" button, jump on.
    if (buyNow) window.location.href = 'checkout.html';
}

// Start the page brain.
init();
