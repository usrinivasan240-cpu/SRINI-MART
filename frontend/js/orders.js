// ============================================================================
// File:        orders.js
// Module:      Phase 4 - Order History & Tracking
// Purpose:     Buyer order history, status display, and order cancellation.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, collection, query, where, orderBy, onSnapshot, doc,
    updateDoc, serverTimestamp
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, formatDateTime, escapeHtml, emptyState } from "./ui.js";

let session = null;

const STATUS_LABELS = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
};

function statusBadge(status) {
    return `<span class="order-status ${escapeHtml(status)}">${STATUS_LABELS[status] || escapeHtml(status)}</span>`;
}

function orderCard(order) {
    const canCancel = ['pending', 'processing'].includes(order.orderStatus);
    const items = order.items || [];
    const itemsHtml = items.map(i => `
        <div class="order-item">
            ${i.image
                ? `<img src="${escapeHtml(i.image)}" alt="${escapeHtml(i.name)}">`
                : `<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);border-radius:var(--radius)">🛒</div>`}
            <div class="oi-name">${escapeHtml(i.name)}</div>
            <div class="oi-qty">× ${i.quantity}</div>
            <div class="oi-price">${formatMoney((i.price || 0) * i.quantity)}</div>
        </div>`).join('');

    return `
        <div class="order-card" id="order-${order.id}">
            <div class="order-header">
                <div>
                    <div class="order-id">Order #${escapeHtml(order.id.slice(-6).toUpperCase())}</div>
                    <div class="muted">${formatDateTime(order.createdAt)}</div>
                </div>
                ${statusBadge(order.orderStatus)}
            </div>
            ${itemsHtml ? `<div class="order-items">${itemsHtml}</div>` : ''}
            <div class="order-meta">
                <span>Total: <strong>${formatMoney(order.total)}</strong> (${escapeHtml(order.paymentMethod || '')})</span>
                <span>
                    ${canCancel
                        ? `<button class="btn btn-sm" style="border:1px solid var(--danger);color:var(--danger);background:none" onclick="cancelOrder('${order.id}')">Cancel Order</button>`
                        : ''}
                    <button class="btn btn-sm btn-secondary" onclick="viewOrder('${order.id}')">View Details</button>
                </span>
            </div>
        </div>`;
}

window.viewOrder = function(id) {
    const el = document.getElementById(`order-${id}`);
    const detail = el.querySelector('.order-detail');
    if (detail) { detail.remove(); return; }
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const d = document.createElement('div');
    d.className = 'order-detail card';
    d.style.marginTop = '12px';
    const addr = order.shippingAddress || {};
    d.innerHTML = `
        <h4 style="margin-bottom:8px">Delivery Address</h4>
        <p class="muted">${escapeHtml(addr.name)} · ${escapeHtml(addr.phone)}<br>${escapeHtml(addr.address)}<br>${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.pincode)}</p>
        <hr class="divider">
        <div class="summary-row"><span>Subtotal</span><span>${formatMoney(order.subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${order.shipping ? formatMoney(order.shipping) : 'FREE'}</span></div>
        <div class="summary-row"><span>Discount</span><span class="success-text">−${formatMoney(order.discount || 0)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatMoney(order.total)}</span></div>
        ${order.paymentReference ? `<div class="muted mt-8">Payment ref: ${escapeHtml(order.paymentReference)}</div>` : ''}`;
    el.appendChild(d);
};

window.cancelOrder = async function(id) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
        await updateDoc(doc(db, 'orders', id), {
            orderStatus: 'cancelled',
            updatedAt: serverTimestamp()
        });
        toast('Order cancelled', 'info');
    } catch (e) {
        toast('Could not cancel order', 'error');
    }
};

let orders = [];

async function loadOrders() {
    const listEl = document.getElementById('orderList');
    listEl.innerHTML = '<div class="muted">Loading orders...</div>';

    onSnapshot(
        query(collection(db, 'orders'), where('userId', '==', session.user.uid), orderBy('createdAt', 'desc')),
        (snap) => {
            orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            listEl.innerHTML = orders.length
                ? orders.map(orderCard).join('')
                : emptyState('No orders yet. <a href="buyer.html">Start shopping</a>');
        },
        () => { listEl.innerHTML = emptyState('Could not load orders.'); }
    );
}

async function init() {
    session = await requireAuth();
    if (!session) return;
    document.getElementById('userName').textContent = session.profile.firstName
        ? `${session.profile.firstName} ${session.profile.lastName || ''}` : (session.profile.email || 'User');
    document.getElementById('userRole').textContent = session.profile.role || 'buyer';
    document.getElementById('userAvatar').textContent = (session.profile.firstName || session.profile.email || 'U').charAt(0).toUpperCase();
    document.getElementById('logoutBtn').addEventListener('click', logout);
    await loadOrders();
}

init();
