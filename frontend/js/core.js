// ============================================================================
// File:        core.js
// Module:      Shared - Pure Logic (framework-free)
// Purpose:     Pure, testable helpers: formatting, escaping, validation,
//              caching, and the rule-based chatbot engine. No Firebase imports
//              so it can run in unit tests.
// Language:    JavaScript (ES Module)
// ============================================================================

// --- Formatting ---------------------------------------------------------------

export function formatMoney(value) {
    const num = Number(value) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value) {
    if (!value) return '—';
    const d = value instanceof Date ? value : (value.toDate ? value.toDate() : new Date(value));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
    if (!value) return '—';
    const d = value instanceof Date ? value : (value.toDate ? value.toDate() : new Date(value));
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function slugify(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

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

export function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

export function validatePhone(value) {
    return /^[6-9]\d{9}$/.test(String(value || '').trim());
}

export function validatePincode(value) {
    return /^\d{6}$/.test(String(value || '').trim());
}

export function validateRequired(value) {
    return String(value || '').trim().length > 0;
}

export function validateProductForm(fields) {
    const errors = {};
    if (!validateRequired(fields.name)) errors.name = 'Product name is required';
    if (!fields.categoryId) errors.categoryId = 'Please select a category';
    if (fields.price === undefined || isNaN(fields.price) || fields.price < 0) errors.price = 'Enter a valid price';
    if (fields.stock === undefined || isNaN(fields.stock) || fields.stock < 0) errors.stock = 'Enter a valid stock quantity';
    return errors;
}

// --- Client-side cache (localStorage with TTL) ----------------------------------

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

export function detectIntent(text) {
    const normalized = String(text || '').toLowerCase().trim();
    if (!normalized) return { intent: INTENTS.default, query: '' };

    for (const rule of INTENT_RULES) {
        if (rule.intent === INTENTS.products) continue; // handled specially
        if (rule.keywords.some(k => matchesKeyword(normalized, k))) {
            return { intent: rule.intent, query: '' };
        }
    }

    // Product intent: extract the subject after a product-ish phrase.
    const productMatch = normalized.match(/(?:show me|find|search|looking for|want|need|buy|recommend|suggest|price of|price for)\s+(.+)/);
    if (productMatch) return { intent: INTENTS.products, query: productMatch[1].trim() };

    return { intent: INTENTS.default, query: '' };
}

// Word-start boundary match: matches "refund" inside "refunds" but does NOT
// match "hi" inside "shipping" or "pay" inside "gpay".
function matchesKeyword(text, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}`, 'i').test(text);
}

export function faqResponse(intent) {
    const rule = INTENT_RULES.find(r => r.intent === intent);
    return rule ? rule.response : null;
}

export const FALLBACK_RESPONSES = [
    "I'm not sure about that one. Try asking about orders, shipping, payments, returns, or products.",
    "Hmm, I couldn't find an answer for that. You can ask me about order tracking, shipping charges, payment options, or returns.",
    "I'm still learning! For specific questions, our support team can help. Otherwise, try asking about orders, shipping, or products."
];

export function pickFallback() {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// --- Rate limiting ---------------------------------------------------------------

export const RATE_LIMIT_MAX_MESSAGES = 8;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export function isRateLimited(history) {
    if (!Array.isArray(history) || !history.length) return false;
    const now = Date.now();
    const recent = history.filter(m => (m.ts || 0) > now - RATE_LIMIT_WINDOW_MS);
    return recent.length >= RATE_LIMIT_MAX_MESSAGES;
}

// --- Status helpers --------------------------------------------------------------

export const ORDER_STATUS_LABELS = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
};

export const PRODUCT_STATUS_LABELS = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending Approval',
    rejected: 'Rejected'
};
