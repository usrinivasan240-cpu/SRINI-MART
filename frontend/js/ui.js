// ============================================================================
// File:        ui.js
// Module:      Shared - UI Helpers & Auth Guards
// Purpose:     Toasts, loading states, auth guards, shared helpers.
//              Pure logic (formatting, validation, chat engine) lives in
//              core.js and is re-exported here for convenience.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   Every page brain (buyer.js, seller.js, ...) uses these same small tools so
//   nobody re-writes them: showing pop-up messages ("toasts"), disabling a
//   button while work is happening, and — most importantly — deciding WHO is
//   allowed to be on a page. It also remembers the signed-in user's details.
// Language:    JavaScript (ES Module)
// ============================================================================

import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from "./firebase.js";

// Re-export every pure helper from core.js so pages only need to import ui.js.
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

// The three kinds of account in the app.
export const ROLES = { BUYER: 'buyer', SELLER: 'seller', ADMIN: 'admin' };

// --- Global error handling ----------------------------------------------------
// Catches ANY unexpected crash on the page, shows the user a friendly message
// instead of a blank screen, and logs the real error for developers.

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
// A small pop-up message (e.g. "Saved!") that slides in and fades out on its
// own after 4 seconds. Types: info, success, error, warning.

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
// withLoading: disables a button, shows a spinner + "Loading...", runs the
// work, and restores the button afterwards (even if the work failed).
// setLoading: the same idea but manual — you turn it on and off yourself.

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
// Reads a price box and ignores any junk symbols, e.g. "₹1,299" → 1299.

export function moneyInputValue(el) {
    const raw = (el.value || '').replace(/[^\d.]/g, '');
    return parseFloat(raw) || 0;
}

// --- User session helpers -----------------------------------------------------
// Keeps one in-memory copy of (a) the Firebase sign-in user and (b) their
// users record from the database (which holds their role: buyer/seller/admin).

const state = {
    user: null,      // Firebase Auth user
    profile: null,   // Firestore users doc
    initPromise: null
};

// getAuthUser / getUserProfile: quick ways to read who is signed in.
export function getAuthUser() { return state.user; }
export function getUserProfile() { return state.profile; }

// authReady: waits (once) for Firebase to finish checking the browser's saved
// login. When it resolves, "state" above is filled in and ready to use.
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
                    // If the user record is missing/broken, assume a normal buyer.
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

// refreshProfile: re-download the signed-in user's record (e.g. after their
// role changes) so the app uses the latest copy.
export async function refreshProfile() {
    if (!state.user) return null;
    const snap = await getDoc(doc(db, 'users', state.user.uid));
    state.profile = snap.exists() ? snap.data() : state.profile;
    return state.profile;
}

// requireAuth: THE gatekeeper. Every protected page calls this first.
//  - Not signed in            → kicked to login.html
//  - Signed in but wrong role → sent to their own correct homepage
//  - Allowed                  → returns { user, profile, role }
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

// redirectByRole: takes someone to the homepage that matches their role
// (admin → admin.html, seller → seller.html, everyone else → buyer.html).
export function redirectByRole(role) {
    const target = role === ROLES.ADMIN ? 'admin.html'
        : role === ROLES.SELLER ? 'seller.html'
        : 'buyer.html';
    window.location.href = target;
}

// logout: signs out of Firebase, clears the saved session, back to login.
export async function logout() {
    await signOut(auth);
    localStorage.removeItem('srinimart_token');
    localStorage.removeItem('srinimart_user');
    window.location.href = 'login.html';
}

// --- Generic rendering helpers --------------------------------------------------
// emptyState: the "📦 There's nothing here" box shown when a list is empty.
// skeleton: shows grey placeholder cards while data is still loading.

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

// Turn on the friendly crash-screen handler as soon as this file loads.
installGlobalErrorHandler();
