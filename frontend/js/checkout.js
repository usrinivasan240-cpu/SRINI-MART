// ============================================================================
// File:        checkout.js
// Module:      Phase 4 - Checkout & Orders
// Purpose:     Validate address, mock payment, create order, decrement stock,
//              and clear cart.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   The brain of checkout.html — the last step before buying. It double-checks
//   the cart and the delivery address, runs a pretend payment (this demo has
//   no real money gateway), then saves the order. EVERYTHING is written at
//   once using a "batch" so the order, stock, and cart update either all
//   succeed together or not at all (no half-orders).
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, collection, query, where, getDocs, doc, addDoc, writeBatch, getDoc,
    serverTimestamp, increment
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, validatePhone, validatePincode } from "./ui.js";

// --- Page state -----------------------------------------------------------------
let session = null;
let cart = [];
let totals = { subtotal: 0, shipping: 0, discount: 0, total: 0 };

// Same shipping rule as the cart page: FREE over ₹500, otherwise ₹40.
const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_FEE = 40;

// loadCart: downloads the user's cart; if it's empty, send them shopping.
async function loadCart() {
    const snap = await getDocs(query(collection(db, 'cartItems'), where('userId', '==', session.user.uid)));
    cart = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!cart.length) {
        toast('Your cart is empty', 'error');
        setTimeout(() => window.location.href = 'buyer.html', 800);
        return;
    }
    renderSummary();
    prefillAddress();
}

// computeTotals: same math as the cart page (subtotal, discount, shipping).
function computeTotals() {
    let subtotal = 0, mrpTotal = 0;
    for (const item of cart) {
        subtotal += (item.price || 0) * item.quantity;
        mrpTotal += (item.mrp || item.price || 0) * item.quantity;
    }
    const discount = Math.max(0, mrpTotal - subtotal);
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return { subtotal, discount, shipping, total: subtotal + shipping };
}

// renderSummary: fills the order summary numbers on the right side.
function renderSummary() {
    totals = computeTotals();
    document.getElementById('sumItems').textContent = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('sumSubtotal').textContent = formatMoney(totals.subtotal);
    document.getElementById('sumShipping').textContent = totals.shipping === 0 ? 'FREE' : formatMoney(totals.shipping);
    document.getElementById('sumDiscount').textContent = `−${formatMoney(totals.discount)}`;
    document.getElementById('sumTotal').textContent = formatMoney(totals.total);
}

// prefillAddress: if the user's profile already has a saved address, copy it
// into the form so they don't retype everything.
function prefillAddress() {
    const p = session.profile || {};
    if (p.address) {
        document.getElementById('cName').value = `${p.firstName || ''} ${p.lastName || ''}`.trim();
        document.getElementById('cAddress').value = p.address.address || '';
        document.getElementById('cCity').value = p.address.city || '';
        document.getElementById('cState').value = p.address.state || '';
        document.getElementById('cPincode').value = p.address.pincode || '';
        document.getElementById('cPhone').value = p.address.phone || '';
    }
}

// validateForm: every field must be filled, the phone must be a valid 10-digit
// Indian mobile, and the pincode must be 6 digits.
function validateForm() {
    const fields = ['cName', 'cPhone', 'cAddress', 'cCity', 'cState', 'cPincode'];
    for (const id of fields) {
        const el = document.getElementById(id);
        if (!el.value.trim()) {
            el.style.borderColor = 'var(--danger)';
            toast(`Please fill: ${el.previousElementSibling?.textContent || el.id}`, 'error');
            return false;
        }
    }
    const phone = document.getElementById('cPhone').value.trim();
    if (!validatePhone(phone)) {
        toast('Please enter a valid 10-digit phone number', 'error');
        return false;
    }
    const pin = document.getElementById('cPincode').value.trim();
    if (!validatePincode(pin)) {
        toast('Please enter a valid 6-digit pincode', 'error');
        return false;
    }
    return true;
}

// Mock payment processor.
// There is no real bank here — this just waits ~1 second and "approves" the
// payment (and, very rarely, fails) to simulate what a real gateway feels like.
function processMockPayment(method) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < 0.03) reject(new Error('Payment gateway temporarily unavailable. Please try again.'));
            else resolve({ success: true, reference: 'MOCK' + Date.now().toString(36).toUpperCase() });
        }, 900);
    });
}

// placeOrder: THE BIG STEP. Called when the customer clicks "Place Order".
// 1. Re-check every item's stock against the live database.
// 2. Run the (mock) payment.
// 3. Create the order record.
// 4. Mirror a copy of the order for each seller involved.
// 5. In one atomic batch: lower stock, delete cart lines, commit.
async function placeOrder() {
    if (!validateForm()) return;
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
        // Step 1 — re-check stock for ALL items before charging anything.
        const batch = writeBatch(db);
        const orderItems = [];
        for (const item of cart) {
            const prodRef = doc(db, 'products', item.productId);
            const prodSnap = await getDoc(prodRef);
            if (!prodSnap.exists()) throw new Error(`Product "${item.name}" is no longer available`);
            const stock = prodSnap.data().stock || 0;
            if (stock < item.quantity) throw new Error(`Insufficient stock for "${item.name}"`);
            orderItems.push({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image || '',
                sellerId: item.sellerId,
                sellerName: item.sellerName || ''
            });
        }

        // Step 2 — run the mock payment.
        const payment = await processMockPayment(
            document.querySelector('input[name="payment"]:checked').value
        );

        const shippingAddress = {
            name: document.getElementById('cName').value.trim(),
            phone: document.getElementById('cPhone').value.trim(),
            address: document.getElementById('cAddress').value.trim(),
            city: document.getElementById('cCity').value.trim(),
            state: document.getElementById('cState').value.trim(),
            pincode: document.getElementById('cPincode').value.trim()
        };

        // Step 3 — create the main order record (the buyer's copy).
        const orderRef = await addDoc(collection(db, 'orders'), {
            userId: session.user.uid,
            userName: `${session.profile.firstName || ''} ${session.profile.lastName || ''}`.trim() || session.profile.email,
            items: orderItems,
            shippingAddress,
            paymentMethod: document.querySelector('input[name="payment"]:checked').value,
            paymentStatus: 'completed',
            paymentReference: payment.reference,
            orderStatus: 'pending',
            subtotal: totals.subtotal,
            shipping: totals.shipping,
            discount: totals.discount,
            total: totals.total,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Step 4 — mirror the order per seller (sellerOrders) so each seller
        // only sees their own slice of the order on their dashboard.
        const buyerName = `${session.profile.firstName || ''} ${session.profile.lastName || ''}`.trim() || session.profile.email;
        const sellers = {};
        for (const item of orderItems) {
            const sid = item.sellerId;
            if (!sid) continue;
            if (!sellers[sid]) sellers[sid] = [];
            sellers[sid].push(item);
        }
        for (const [sellerId, sellerItems] of Object.entries(sellers)) {
            const sellerTotal = sellerItems.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
            batch.set(doc(db, 'sellerOrders', `${sellerId}_${orderRef.id}`), {
                sellerId,
                orderId: orderRef.id,
                buyerId: session.user.uid,
                buyerName,
                items: sellerItems,
                total: sellerTotal,
                shippingAddress,
                paymentMethod: document.querySelector('input[name="payment"]:checked').value,
                orderStatus: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }

        // Step 5 — lower the product stock and empty the cart, all in ONE
        // batch so everything commits (or nothing does).
        for (const item of cart) {
            batch.update(doc(db, 'products', item.productId), {
                stock: increment(-item.quantity)
            });
            batch.delete(doc(db, 'cartItems', item.id));
        }
        await batch.commit();

        toast('Order placed successfully!', 'success');
        setTimeout(() => window.location.href = `orders.html?order=${orderRef.id}`, 800);
    } catch (e) {
        toast(e.message || 'Could not place order', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Place Order';
    }
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
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
    await loadCart();
}

// Start the page brain.
init();
