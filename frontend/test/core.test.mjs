// ============================================================================
// File:        core.test.mjs
// Module:      Phase 9 - Unit Tests
// Purpose:     Node's built-in test runner covering the pure logic in
//              frontend/js/core.js (formatting, validation, chatbot engine,
//              rate limiting, caching).
// Run:         npm test  (from frontend/)
// Language:    JavaScript (ES Module)
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    formatMoney,
    escapeHtml,
    slugify,
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
    INTENTS,
    RATE_LIMIT_MAX_MESSAGES
} from '../js/core.js';

// --- Formatting ----------------------------------------------------------------

test('formatMoney formats Indian rupee values', () => {
    assert.equal(formatMoney(0), '₹0.00');
    assert.equal(formatMoney(1234), '₹1,234.00');
    assert.equal(formatMoney(123456.5), '₹1,23,456.50');
    assert.equal(formatMoney('abc'), '₹0.00');
});

test('escapeHtml escapes dangerous characters', () => {
    assert.equal(escapeHtml('<script>alert("x")</script>'),
        '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    assert.equal(escapeHtml("a'b"), "a&#39;b");
    assert.equal(escapeHtml(null), '');
});

test('slugify produces url-safe slugs', () => {
    assert.equal(slugify('Wireless Bluetooth Earbuds'), 'wireless-bluetooth-earbuds');
    assert.equal(slugify('  Hello, World!  '), 'hello-world');
    assert.equal(slugify(''), '');
});

test('stars renders 5 stars honoring half ratings', () => {
    const five = stars(5);
    assert.ok((five.match(/class="star filled"/g) || []).length === 5);
    const threeHalf = stars(3.5);
    assert.ok((threeHalf.match(/class="star filled"/g) || []).length === 3);
    assert.ok(threeHalf.includes('half'));
    assert.equal(stars(0), stars(null));
});

// --- Validation ------------------------------------------------------------------

test('email validation', () => {
    assert.equal(validateEmail('user@example.com'), true);
    assert.equal(validateEmail('a@b.co'), true);
    assert.equal(validateEmail('not-an-email'), false);
    assert.equal(validateEmail(''), false);
});

test('phone validation accepts 10-digit Indian mobile numbers', () => {
    assert.equal(validatePhone('9876543210'), true);
    assert.equal(validatePhone('5123456789'), false); // does not start with 6-9
    assert.equal(validatePhone('987654321'), false);
    assert.equal(validatePhone('12345678901'), false);
});

test('pincode validation', () => {
    assert.equal(validatePincode('560001'), true);
    assert.equal(validatePincode('56000'), false);
    assert.equal(validatePincode('5600011'), false);
});

test('validateProductForm returns field errors', () => {
    const errors = validateProductForm({ name: '', categoryId: '', price: NaN, stock: -1 });
    assert.ok(errors.name);
    assert.ok(errors.categoryId);
    assert.ok(errors.price);
    assert.ok(errors.stock);
    assert.deepEqual(validateProductForm({ name: 'X', categoryId: 'c1', price: 100, stock: 5 }), {});
});

// --- Caching -----------------------------------------------------------------------

test('cachedFetch stores and reuses cached values with TTL', async () => {
    let loadCount = 0;
    const loader = async () => { loadCount++; return [{ id: '1' }]; };

    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, v)
    };

    const first = await cachedFetch('test_key', 1000, loader);
    const second = await cachedFetch('test_key', 1000, loader);
    assert.deepEqual(first, [{ id: '1' }]);
    assert.deepEqual(second, [{ id: '1' }]);
    assert.equal(loadCount, 1, 'loader should only run once within TTL');

    store.set('test_key', JSON.stringify({ value: [{ id: '1' }], expires: Date.now() - 1 }));
    await cachedFetch('test_key', 1000, loader);
    assert.equal(loadCount, 2, 'expired cache should reload');

    delete globalThis.localStorage;
});

// --- Chatbot engine -----------------------------------------------------------------

test('detectIntent recognizes intents by keyword', () => {
    assert.equal(detectIntent('hello there').intent, INTENTS.greeting);
    assert.equal(detectIntent('where is my order').intent, INTENTS.orderStatus);
    assert.equal(detectIntent('what are shipping charges').intent, INTENTS.shipping);
    assert.equal(detectIntent('how do refunds work').intent, INTENTS.returns);
    assert.equal(detectIntent('do you accept upi').intent, INTENTS.payment);
    assert.equal(detectIntent('thanks a lot').intent, INTENTS.thanks);
    assert.equal(detectIntent('bye').intent, INTENTS.bye);
    assert.equal(detectIntent('random gibberish qwerty').intent, INTENTS.default);
});

test('detectIntent extracts a product search query', () => {
    const res = detectIntent('show me headphones');
    assert.equal(res.intent, INTENTS.products);
    assert.equal(res.query, 'headphones');
});

test('faqResponse returns text for known intents and null for products', () => {
    assert.ok(faqResponse(INTENTS.shipping).includes('FREE shipping'));
    assert.equal(faqResponse(INTENTS.products), null);
    assert.equal(faqResponse(INTENTS.default), null);
});

test('pickFallback always returns one of the fallback messages', () => {
    const value = pickFallback();
    assert.ok(typeof value === 'string' && value.length > 10);
});

// --- Rate limiting ------------------------------------------------------------------

test('isRateLimited blocks when a window is exceeded', () => {
    const now = Date.now();
    const messages = Array.from({ length: RATE_LIMIT_MAX_MESSAGES }, (_, i) => ({ ts: now - i * 1000 }));
    assert.equal(isRateLimited(messages), true);

    const sparse = Array.from({ length: 3 }, (_, i) => ({ ts: now - i * 1000 }));
    assert.equal(isRateLimited(sparse), false);

    const old = [{ ts: now - 120 * 1000 }];
    assert.equal(isRateLimited(old), false);
    assert.equal(isRateLimited([]), false);
    assert.equal(isRateLimited(null), false);
});

// --- debounce ------------------------------------------------------------------------

test('debounce only fires once after rapid calls', async () => {
    let calls = 0;
    const fn = debounce(() => { calls++; }, 30);
    fn(); fn(); fn();
    await new Promise(r => setTimeout(r, 80));
    assert.equal(calls, 1);
});
