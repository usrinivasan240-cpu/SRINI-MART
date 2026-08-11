// ============================================================================
// File:        chatbot.js
// Module:      Phase 7 - AI Chatbot
// Purpose:     Floating chat widget with Firestore history, client-side rate
//              limiting, FAQ answers, and live product search.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, auth, doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs
} from "./firebase.js";
import {
    authReady, getAuthUser, toast, formatMoney, escapeHtml,
    detectIntent, faqResponse, pickFallback, isRateLimited
} from "./ui.js";

const MAX_HISTORY = 50;

let history = [];
let userId = null;

// --- Widget DOM ---------------------------------------------------------------

const STYLES = `
#sm-chat-fab {
    position: fixed; bottom: 24px; right: 24px; z-index: 900;
    width: 58px; height: 58px; border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; border: none; font-size: 26px; cursor: pointer;
    box-shadow: 0 8px 20px rgba(102,126,234,0.45);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s ease;
}
#sm-chat-fab:hover { transform: scale(1.08); }
#sm-chat-window {
    position: fixed; bottom: 94px; right: 24px; z-index: 900;
    width: 360px; max-width: calc(100vw - 48px); height: 480px; max-height: calc(100vh - 130px);
    background: white; border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,0.25);
    display: none; flex-direction: column; overflow: hidden;
    border: 1px solid #e2e8f0;
}
#sm-chat-window.open { display: flex; }
#sm-chat-head {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; padding: 14px 16px; font-weight: 700; font-size: 15px;
    display: flex; justify-content: space-between; align-items: center;
}
#sm-chat-close { background: none; border: none; color: white; font-size: 18px; cursor: pointer; line-height: 1; }
#sm-chat-body {
    flex: 1; overflow-y: auto; padding: 14px; background: #f8fafc;
    display: flex; flex-direction: column; gap: 8px;
}
.sm-msg { max-width: 80%; padding: 9px 12px; border-radius: 12px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; }
.sm-msg.bot { background: white; border: 1px solid #e2e8f0; align-self: flex-start; border-bottom-left-radius: 3px; }
.sm-msg.user { background: #2563eb; color: white; align-self: flex-end; border-bottom-right-radius: 3px; }
.sm-msg .sm-link { display: block; margin-top: 4px; color: #2563eb; text-decoration: none; font-weight: 600; }
.sm-msg .sm-link:hover { text-decoration: underline; }
.sm-typing { color: #94a3b8; font-size: 13px; padding: 4px 2px; }
#sm-chat-input-row { display: flex; border-top: 1px solid #e2e8f0; background: white; }
#sm-chat-input {
    flex: 1; border: none; padding: 13px 14px; font-size: 14px; outline: none;
}
#sm-chat-send {
    border: none; background: #2563eb; color: white; padding: 0 18px;
    font-size: 15px; cursor: pointer;
}
`;

function ensureWidget() {
    if (document.getElementById('sm-chat-widget-root')) return;
    const root = document.createElement('div');
    root.id = 'sm-chat-widget-root';
    root.innerHTML = `
        <style>${STYLES}</style>
        <button id="sm-chat-fab" title="Chat with SriniMart Assistant">💬</button>
        <div id="sm-chat-window">
            <div id="sm-chat-head">
                <span>SriniMart Assistant 🤖</span>
                <button id="sm-chat-close">&times;</button>
            </div>
            <div id="sm-chat-body"></div>
            <div id="sm-chat-input-row">
                <input id="sm-chat-input" placeholder="Ask about orders, shipping, products..." autocomplete="off">
                <button id="sm-chat-send">Send</button>
            </div>
        </div>`;
    document.body.appendChild(root);

    const fab = document.getElementById('sm-chat-fab');
    const win = document.getElementById('sm-chat-window');
    fab.addEventListener('click', () => {
        win.classList.toggle('open');
        if (win.classList.contains('open')) document.getElementById('sm-chat-input').focus();
    });
    document.getElementById('sm-chat-close').addEventListener('click', () => win.classList.remove('open'));
    document.getElementById('sm-chat-send').addEventListener('click', sendMessage);
    document.getElementById('sm-chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// --- Messaging ------------------------------------------------------------------

function addMessage(role, text, html = false) {
    history.push({ role, text, ts: Date.now() });
    const body = document.getElementById('sm-chat-body');
    const el = document.createElement('div');
    el.className = `sm-msg ${role}`;
    if (html) el.innerHTML = text;
    else el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
}

function renderHistory() {
    const body = document.getElementById('sm-chat-body');
    body.innerHTML = '';
    history.forEach(m => {
        const el = document.createElement('div');
        el.className = `sm-msg ${m.role}`;
        el.textContent = m.text;
        body.appendChild(el);
    });
    body.scrollTop = body.scrollHeight;
}

function showTyping() {
    const body = document.getElementById('sm-chat-body');
    const el = document.createElement('div');
    el.className = 'sm-typing';
    el.textContent = 'Assistant is typing...';
    el.id = 'sm-typing';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
}

async function persist() {
    if (!userId) return;
    const trimmed = history.slice(-MAX_HISTORY);
    try {
        await setDoc(doc(db, 'chats', userId), {
            messages: trimmed.map(m => ({ role: m.role, text: m.text, ts: serverTimestamp() })),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (e) { /* chat history persistence is best-effort */ }
}

// --- Product search ---------------------------------------------------------------

async function searchProducts(query) {
    try {
        const snap = await getDocs(query(
            collection(db, 'products'),
            where('isApproved', '==', true),
            where('isActive', '==', true)
        ));
        const term = query.toLowerCase();
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p =>
                (p.name || '').toLowerCase().includes(term) ||
                (p.categoryName || '').toLowerCase().includes(term) ||
                (p.description || '').toLowerCase().includes(term))
            .slice(0, 3);
    } catch (e) {
        return [];
    }
}

function productResultHtml(products, term) {
    if (!products.length) {
        return `I couldn't find products matching "<b>${escapeHtml(term)}</b>". Try browsing the full <a href="buyer.html" class="sm-link">storefront</a>.`;
    }
    const links = products.map(p =>
        `• <a href="product.html?id=${p.id}" class="sm-link">${escapeHtml(p.name)}</a> — ${formatMoney(p.price)}`).join('<br>');
    return `Here are a few matches for "<b>${escapeHtml(term)}</b>":<br>${links}`;
}

// --- Handle a message --------------------------------------------------------------

async function handleMessage(text) {
    const typing = showTyping();

    if (isRateLimited(history)) {
        typing.remove();
        addMessage('bot', "You're sending messages a bit too quickly. Please wait a minute and try again. 🙂");
        await persist();
        return;
    }

    const { intent, query: productQuery } = detectIntent(text);

    let response;
    let html = false;

    if (intent === 'products' && productQuery) {
        const results = await searchProducts(productQuery);
        response = productResultHtml(results, productQuery);
        html = true;
    } else {
        response = faqResponse(intent) || pickFallback();
    }

    // Small delay to feel like an assistant.
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    typing.remove();
    addMessage('bot', response, html);
    await persist();
}

async function sendMessage() {
    const input = document.getElementById('sm-chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    await handleMessage(text);
}

// --- Init --------------------------------------------------------------------------

async function init() {
    ensureWidget();
    await authReady();
    const authUser = getAuthUser();
    if (!authUser) return; // hide widget for signed-out visitors

    userId = authUser.uid;
    try {
        const snap = await getDoc(doc(db, 'chats', userId));
        history = (snap.exists() && snap.data().messages) ? snap.data().messages.map(m => ({
            role: m.role, text: m.text, ts: m.ts?.toDate?.()?.getTime() || Date.now()
        })) : [];
    } catch (e) { history = []; }

    renderHistory();
    if (!history.length) {
        addMessage('bot', "Hi! 👋 I'm the SriniMart Assistant. Ask me about your orders, shipping, payments, or finding products.");
        persist();
    }
}

init();
