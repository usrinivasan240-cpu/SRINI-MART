// ============================================================================
// File:        ui.js
// Module:      Shared - UI Helpers & Auth Guards
// Purpose:     Toasts, loading states, auth guards, shared helpers.
//              Pure logic (formatting, validation, chat engine) lives in
//              core.js and is re-exported here for convenience.
// Language:    JavaScript (ES Module)
// ============================================================================

import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from "./firebase.js";

export {
    formatMoney,
    formatDate,
    formatDateTime,
    slugify,
    escapeHtml,
    debounce,
    stars,
    validateEmail,
    validatePhone,
    validatePincode,
    validateRequired,
    validateProductForm,
    cachedFetch,
    detectIntent,
    faqResponse,
    pickFallback,
    isRateLimited,
    RATE_LIMIT_MAX_MESSAGES,
    RATE_LIMIT_WINDOW_MS,
    ORDER_STATUS_LABELS,
    PRODUCT_STATUS_LABELS
} from "./core.js";

export const ROLES = { BUYER: 'buyer', SELLER: 'seller', ADMIN: 'admin' };

// --- Global error handling ----------------------------------------------------

export function installGlobalErrorHandler() {
    if (window.__srinimartErrorHandlerInstalled) return;
    window.__srinimartErrorHandlerInstalled = true;

    window.addEventListener('error', (e) => {
        toast('Something went wrong. Please try again.', 'error');
        console.error(e.error || e.message);
    });
    window.addEventListener('unhandledrejection', (e) => {
        const code = e.reason && e.reason.code;
        const denied = typeof code === 'string' && code.toLowerCase().includes('permission-denied');
        if (!denied) toast('Something went wrong. Please try again.', 'error');
        console.error(e.reason);
    });
}

// --- Toast notifications -----------------------------------------------------

export function toast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// --- Loading state on a button -----------------------------------------------

export function withLoading(btn, fn) {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Loading...';
    return Promise.resolve(fn()).finally(() => {
        btn.disabled = false;
        btn.innerHTML = original;
    });
}

export function setLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Loading...';
    } else if (btn.dataset.original) {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.original;
    }
}

// --- Money input convenience -----------------------------------------------------

export function moneyInputValue(el) {
    const raw = (el.value || '').replace(/[^\d.]/g, '');
    return parseFloat(raw) || 0;
}

// --- User session helpers -----------------------------------------------------

const state = {
    user: null,      // Firebase Auth user
    profile: null,   // Firestore users doc
    initPromise: null
};

export function getAuthUser() { return state.user; }
export function getUserProfile() { return state.profile; }

// Resolves once the initial auth state has loaded.
export function authReady() {
    if (state.initPromise) return state.initPromise;
    state.initPromise = new Promise(resolve => {
        onAuthStateChanged(auth, async (user) => {
            state.user = user;
            if (user) {
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    state.profile = snap.exists() ? snap.data() : { uid: user.uid, email: user.email, role: 'buyer' };
                } catch (e) {
                    state.profile = { uid: user.uid, email: user.email, role: 'buyer' };
                }
            } else {
                state.profile = null;
            }
            resolve();
        });
    });
    return state.initPromise;
}

export async function refreshProfile() {
    if (!state.user) return null;
    const snap = await getDoc(doc(db, 'users', state.user.uid));
    state.profile = snap.exists() ? snap.data() : state.profile;
    return state.profile;
}

export async function requireAuth(roles = null) {
    await authReady();
    if (!state.user) {
        window.location.href = 'login.html';
        return null;
    }
    const role = (state.profile && state.profile.role) || 'buyer';
    if (roles && roles.length && !roles.includes(role)) {
        redirectByRole(role);
        return null;
    }
    return { user: state.user, profile: state.profile, role };
}

export function redirectByRole(role) {
    const target = role === ROLES.ADMIN ? 'admin.html'
        : role === ROLES.SELLER ? 'seller.html'
        : 'buyer.html';
    window.location.href = target;
}

export async function logout() {
    await signOut(auth);
    localStorage.removeItem('srinimart_token');
    localStorage.removeItem('srinimart_user');
    window.location.href = 'login.html';
}

// --- Generic rendering helpers --------------------------------------------------

export function emptyState(text) {
    return `<div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>${text}</p>
    </div>`;
}

export function skeleton(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) html += '<div class="skeleton-card"></div>';
    return html;
}

// Install the global error handler once per page load.
installGlobalErrorHandler();
