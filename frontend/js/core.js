// ============================================================================
// File:        core.js
// Module:      Shared - Pure Logic (framework-free)
// Purpose:     Pure, testable helpers: formatting, escaping, validation,
//              caching, and the rule-based chatbot engine. No Firebase imports
//              so it can run in unit tests.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   This is the "toolbox" of the whole app. Every page borrows these small
//   helpers. A "pure" function means: you give it a value, it gives you back
//   an answer — it never touches the page or the internet, so we can test it
//   automatically (see test/core.test.mjs).
// Language:    JavaScript (ES Module)
// ============================================================================

// --- Formatting ---------------------------------------------------------------
// Turn raw numbers/dates into nice text for the screen (₹, dates, URL names).

// Money: turns 799 into "₹799.00" (Indian number style with commas).
export function formatMoney(value) {
    const num = Number(value) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Date: turns a timestamp into something like "11 Aug 2026".
export function formatDate(value) {
    if (!value) return '—';
    const d = value instanceof Date ? value : (value.toDate ? value.toDate() : new Date(value));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Date + time: like formatDate but also shows the time (e.g. for order history).
export function formatDateTime(value) {
    if (!value) return '—';
    const d = value instanceof Date ? value : (value.toDate ? value.toDate() : new Date(value));
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Slug: makes a product name safe for a web address, e.g. "Running Shoes" → "running-shoes".
export function slugify(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// 🛡️ SAFETY: escapeHtml turns dangerous characters (& < > " ') into harmless
// text. This stops a user from pasting code into a review/product name and
// breaking (or hacking) other people's screens.
export function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Debounce: waits until the user STOPS typing (300ms) before running the search.
// Without it, every keystroke would fire a database query — slow and wasteful.
export function debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// Stars: draws 5 star symbols from a rating number (supports half stars),
// e.g. 4.3 → ★★★★☆ (with a half star).
export function stars(rating, size = '') {
    const r = Math.round((Number(rating) || 0) * 2) / 2;
    let html = `<span class="stars ${size}">`;
    for (let i = 1; i <= 5; i++) {
        if (r >= i) html += '<span class="star filled">★</span>';
        else if (r >= i - 0.5) html += '<span class="star half">★</span>';
        else html += '<span class="star">★</span>';
    }
    html += `</span>`;
    return html;
}

// --- Validation ----------------------------------------------------------------
// Simple "is this input sensible?" checks used before saving data.

// Email: must look like "name@website.xyz".
export function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

// Phone: must be a 10-digit Indian mobile starting with 6, 7, 8 or 9.
export function validatePhone(value) {
    return /^[6-9]\d{9}$/.test(String(value || '').trim());
}

// Pincode: must be exactly 6 digits.
export function validatePincode(value) {
    return /^\d{6}$/.test(String(value || '').trim());
}

// Required: just checks the field isn't empty.
export function validateRequired(value) {
    return String(value || '').trim().length > 0;
}

// Product form: checks a product has a name, a category, a price and a stock.
// Returns an object listing which fields are wrong (empty object = all good).
export function validateProductForm(fields) {
    const errors = {};
    if (!validateRequired(fields.name)) errors.name = 'Product name is required';
    if (!fields.categoryId) errors.categoryId = 'Please select a category';
    if (fields.price === undefined || isNaN(fields.price) || fields.price < 0) errors.price = 'Enter a valid price';
    if (fields.stock === undefined || isNaN(fields.stock) || fields.stock < 0) errors.stock = 'Enter a valid stock quantity';
    return errors;
}

// --- Client-side cache (localStorage with TTL) ----------------------------------
// Remember database answers in the browser for a few minutes (TTL = time to
// live), so the app doesn't re-download the same data on every page load.

export function cachedFetch(key, ttlMs, loader) {
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.expires > Date.now()) return Promise.resolve(parsed.value);
        }
    } catch (e) { /* fall through to loader */ }

    return Promise.resolve(loader()).then(value => {
        try {
            localStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + ttlMs }));
        } catch (e) { /* storage may be unavailable */ }
        return value;
    });
}

// --- Chatbot engine --------------------------------------------------------------
// The "brain" of the chat assistant. It reads the user's message, figures out
// the topic (the "intent"), and picks an answer — all with simple keyword rules.

export const INTENTS = {
    greeting: 'greeting',
    orderStatus: 'orderStatus',
    shipping: 'shipping',
    returns: 'returns',
    payment: 'payment',
    products: 'products',
    contact: 'contact',
    thanks: 'thanks',
    bye: 'bye',
    help: 'help',
    default: 'default'
};

// The rule book: each topic lists trigger words + the answer to give.
// "products" has no answer here because it does a live product search instead.
const INTENT_RULES = [
    {
        intent: INTENTS.greeting,
        keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste'],
        response: 'Hello! 👋 Welcome to SriniMart. I can help you with orders, shipping, payments, returns, or finding products. What would you like to know?'
    },
    {
        intent: INTENTS.orderStatus,
        keywords: ['order', 'status', 'track', 'tracking', 'where is my', 'delivery date', 'my order'],
        response: 'You can track all your orders on the My Orders page. Each order shows a live status: Pending → Processing → Shipped → Delivered. If an order is stuck, an admin can look into it.'
    },
    {
        intent: INTENTS.shipping,
        keywords: ['shipping', 'delivery', 'deliver', 'ship', 'charges', 'fee', 'free shipping', 'how long'],
        response: 'We offer FREE shipping on orders over ₹500. Standard delivery takes 3–5 business days, and faster options may be available at checkout.'
    },
    {
        intent: INTENTS.returns,
        keywords: ['return', 'refund', 'exchange', 'money back', 'cancel order'],
        response: 'You can cancel an order from the My Orders page while its status is Pending or Processing. For returns or refunds after delivery, please contact support with your order number and we will resolve it within 3–5 working days.'
    },
    {
        intent: INTENTS.payment,
        keywords: ['payment', 'pay', 'upi', 'gpay', 'phonepe', 'paytm', 'card', 'cod', 'cash'],
        response: 'We accept Cash on Delivery, UPI (GPay / PhonePe / Paytm), and Credit/Debit cards. Payments are processed securely at checkout.'
    },
    {
        intent: INTENTS.products,
        keywords: ['product', 'products', 'buy', 'browse', 'search', 'find', 'recommend', 'suggest', 'looking for', 'show me', 'price', 'available', 'stock'],
        response: null // handled dynamically with product search
    },
    {
        intent: INTENTS.contact,
        keywords: ['contact', 'support', 'help me', 'reach', 'phone number', 'email us', 'complaint', 'problem', 'issue'],
        response: 'You can reach our support team at support@srinimart.example or via the Profile page. We usually reply within 24 hours.'
    },
    {
        intent: INTENTS.thanks,
        keywords: ['thank', 'thanks', 'thx', 'great', 'awesome', 'cool'],
        response: "You're welcome! 😊 Is there anything else I can help you with?"
    },
    {
        intent: INTENTS.bye,
        keywords: ['bye', 'goodbye', 'see you', 'gtg'],
        response: 'Thanks for chatting with SriniMart! Have a great day. 👋'
    },
    {
        intent: INTENTS.help,
        keywords: ['help', 'options', 'what can you do', 'commands'],
        response: 'Try asking me things like: "Where is my order?", "What are the shipping charges?", "How do returns work?", "Do you accept UPI?", or "Show me headphones".'
    }
];

// detectIntent = "what is this message about?".
// First it checks the FAQ rule book; if nothing matches, it looks for a
// product-style phrase like "show me ..." and extracts the search subject.
export function detectIntent(text) {
    const normalized = String(text || '').toLowerCase().trim();
    if (!normalized) return { intent: INTENTS.default, query: '' };

    // Step 1: run through the FAQ rules (greeting, shipping, returns, ...).
    for (const rule of INTENT_RULES) {
        if (rule.intent === INTENTS.products) continue; // handled specially in step 2
        if (rule.keywords.some(k => matchesKeyword(normalized, k))) {
            return { intent: rule.intent, query: '' };
        }
    }

    // Step 2: product intent — extract the subject after a product-ish phrase.
    const productMatch = normalized.match(/(?:show me|find|search|looking for|want|need|buy|recommend|suggest|price of|price for)\s+(.+)/);
    if (productMatch) return { intent: INTENTS.products, query: productMatch[1].trim() };

    // Step 3: no rule matched → default "I didn't understand" response.
    return { intent: INTENTS.default, query: '' };
}

// Word-start boundary match: matches "refund" inside "refunds" but does NOT
// match "hi" inside "shipping" or "pay" inside "gpay".
// The (^|[^a-z0-9]) means "start of message OR a non-letter/number before it".
function matchesKeyword(text, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}`, 'i').test(text);
}

// Looks up the canned answer for a detected topic (null for "products",
// which is answered with a live search instead).
export function faqResponse(intent) {
    const rule = INTENT_RULES.find(r => r.intent === intent);
    return rule ? rule.response : null;
}

// The "I didn't understand" messages — the bot rotates through them at random.
export const FALLBACK_RESPONSES = [
    "I'm not sure about that one. Try asking about orders, shipping, payments, returns, or products.",
    "Hmm, I couldn't find an answer for that. You can ask me about order tracking, shipping charges, payment options, or returns.",
    "I'm still learning! For specific questions, our support team can help. Otherwise, try asking about orders, shipping, or products."
];

// Picks one random fallback message so the bot doesn't repeat itself.
export function pickFallback() {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// --- Rate limiting --------------------------------------------------------------
// Stops one user from spamming the chat. The rule: at most 8 messages per minute.

// 8 messages ...
export const RATE_LIMIT_MAX_MESSAGES = 8;
// ... within a 60,000 ms (1 minute) window.
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// isRateLimited: looks at the past chat history and says "true" if the user
// has already sent the maximum allowed messages in the last minute.
export function isRateLimited(history) {
    if (!Array.isArray(history) || !history.length) return false;
    const now = Date.now();
    const recent = history.filter(m => (m.ts || 0) > now - RATE_LIMIT_WINDOW_MS);
    return recent.length >= RATE_LIMIT_MAX_MESSAGES;
}

// --- Status helpers --------------------------------------------------------------
// Simple "data name → pretty English label" dictionaries so screens never
// show raw codes like "processing".

// Order status codes and what customers see.
export const ORDER_STATUS_LABELS = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
};

// Product status codes and what sellers/admins see (inactive = hidden from
// the storefront, pending = waiting for admin approval, rejected = turned down).
export const PRODUCT_STATUS_LABELS = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending Approval',
    rejected: 'Rejected'
};
