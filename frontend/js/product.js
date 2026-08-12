// ============================================================================
// File:        product.js
// Module:      Phase 2/5 - Product Detail & Reviews
// Purpose:     Product detail view, quantity-based add to cart / buy now,
//              and review submission with star ratings.
//
// ⭐ WHAT THIS FILE IS (plain English):
//   The brain of product.html — the single-product page. It reads the
//   product id from the web address (?id=...), shows the full details,
//   lets the customer pick a quantity and add to cart or buy now, shows
//   the approved reviews, and lets the customer write their own review.
// Language:    JavaScript (ES Module)
// ============================================================================

import {
    db, collection, query, where, orderBy, getDocs, getDoc, doc,
    addDoc, setDoc, serverTimestamp
} from "./firebase.js";
import { toast, requireAuth, logout, formatMoney, formatDate, escapeHtml, stars, emptyState } from "./ui.js";

// --- Page state -----------------------------------------------------------------
let session = null;     // the signed-in user
let product = null;     // the product currently being viewed
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');   // which product? taken from the URL

// loadProduct: downloads the one product from the database and kicks off the
// reviews + related-products sections.
async function loadProduct() {
    const area = document.getElementById('productArea');
    if (!productId) {
        area.innerHTML = emptyState('Product not found.');
        return;
    }
    try {
        const snap = await getDoc(doc(db, 'products', productId));
        if (!snap.exists()) {
            area.innerHTML = emptyState('Product not found.');
            return;
        }
        product = { id: snap.id, ...snap.data() };
        renderProduct();
        loadReviews();
        loadRelated();
    } catch (e) {
        area.innerHTML = emptyState('Product not available or no longer listed.');
    }
}

// renderProduct: draws the product page — photo, seller, name, rating, price,
// discount, stock, description, quantity picker, and the two action buttons.
function renderProduct() {
    const p = product;
    const discount = (p.mrp && p.mrp > p.price) ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
    const outOfStock = !p.stock || p.stock <= 0;
    const images = (p.images && p.images.length) ? p.images : [''];
    const gallery = images[0]
        ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(p.name)}" class="gallery-img" id="galleryImg">`
        : `<div class="gallery-img placeholder" style="display:flex;align-items:center;justify-content:center;font-size:72px">🛒</div>`;

    document.title = `${p.name} - SriniMart`;
    document.getElementById('productArea').innerHTML = `
        <div class="product-detail">
            <div>${gallery}</div>
            <div>
                <div class="detail-seller">Sold by <strong>${escapeHtml(p.sellerName || 'SriniMart Seller')}</strong></div>
                <h1 class="detail-name">${escapeHtml(p.name)}</h1>
                <div class="rating-summary">
                    ${stars(p.rating, 'lg')}
                    <span class="muted">${Number(p.rating || 0).toFixed(1)} (${p.ratingCount || 0} ratings)</span>
                </div>
                <div class="detail-price-row">
                    <span class="detail-price">${formatMoney(p.price)}</span>
                    ${p.mrp && p.mrp > p.price ? `<span class="detail-mrp">${formatMoney(p.mrp)}</span><span class="detail-discount">${discount}% OFF</span>` : ''}
                </div>
                <div class="detail-stock ${outOfStock ? 'danger-text' : 'success-text'}">
                    ${outOfStock ? 'Out of stock' : `${p.stock} items in stock`}
                </div>
                <p class="detail-desc">${escapeHtml(p.description || 'No description provided.')}</p>

                <div class="flex-between mb-16">
                    <div class="quantity-control">
                        <button onclick="changeQty(-1)">−</button>
                        <input type="number" id="qtyInput" value="1" min="1" max="${p.stock || 1}">
                        <button onclick="changeQty(1)">+</button>
                    </div>
                </div>
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                    <button class="btn btn-primary btn-lg" id="addToCartBtn" ${outOfStock ? 'disabled' : ''}>Add to Cart</button>
                    <button class="btn btn-secondary btn-lg" id="buyNowBtn" ${outOfStock ? 'disabled' : ''}>Buy Now</button>
                </div>
            </div>
        </div>`;

    // Keep the quantity box between 1 and the available stock.
    document.getElementById('qtyInput').addEventListener('change', () => {
        const el = document.getElementById('qtyInput');
        const val = Math.max(1, Math.min(parseInt(el.value) || 1, p.stock || 1));
        el.value = val;
    });
    document.getElementById('addToCartBtn').addEventListener('click', () => {
        addToCart(parseInt(document.getElementById('qtyInput').value) || 1);
    });
    // "Buy Now" = add to cart, then jump straight to checkout.
    document.getElementById('buyNowBtn').addEventListener('click', async () => {
        await addToCart(parseInt(document.getElementById('qtyInput').value) || 1, true);
    });
}

// changeQty: the + / − buttons around the quantity box.
window.changeQty = function(delta) {
    const el = document.getElementById('qtyInput');
    if (!el) return;
    const max = product.stock || 1;
    el.value = Math.max(1, Math.min((parseInt(el.value) || 1) + delta, max));
};

// addToCart: same idea as buyer.js — save one cart line per user+product.
// buyNow=true redirects to checkout afterwards.
async function addToCart(qty, buyNow = false) {
    if (!session) { window.location.href = 'login.html'; return; }
    try {
        if (!product.stock || product.stock < qty) throw new Error('Insufficient stock');
        const cartRef = doc(db, 'cartItems', `${session.user.uid}_${product.id}`);
        const cartSnap = await getDoc(cartRef);
        const current = cartSnap.exists() ? (cartSnap.data().quantity || 0) : 0;
        await setDoc(cartRef, {
            userId: session.user.uid,
            productId: product.id,
            name: product.name,
            price: product.price,
            mrp: product.mrp || product.price,
            image: (product.images && product.images[0]) || '',
            sellerId: product.sellerId,
            sellerName: product.sellerName,
            quantity: current + qty,
            updatedAt: new Date()
        }, { merge: true });
        toast(buyNow ? 'Redirecting to checkout...' : 'Added to cart', 'success');
        if (buyNow) window.location.href = 'cart.html?buynow=1';
        else updateCartCount();
    } catch (e) {
        toast(e.message || 'Could not add to cart', 'error');
    }
}

// updateCartCount: shows how many cart lines this user has on the cart icon.
async function updateCartCount() {
    if (!session) return;
    const snap = await getDocs(query(collection(db, 'cartItems'), where('userId', '==', session.user.uid)));
    const el = document.getElementById('cartCount');
    if (el) el.textContent = snap.size;
}

// --- Reviews -------------------------------------------------------------------
// Reviews are moderated: a customer writes one, an admin approves it, and only
// then does it appear here. We also check whether the reviewer actually bought
// the product to show a "Verified Purchase" badge.

// hasPurchased: searches the customer's order history for this product.
async function hasPurchased(userId, productId) {
    try {
        const snap = await getDocs(query(
            collection(db, 'orders'),
            where('userId', '==', userId)
        ));
        for (const d of snap.docs) {
            const items = d.data().items || [];
            if (items.some(i => i.productId === productId)) return true;
        }
        return false;
    } catch (e) { return false; }
}

// loadReviews: downloads and draws the approved reviews for this product.
async function loadReviews() {
    const list = document.getElementById('reviewList');
    list.innerHTML = '<div class="muted">Loading reviews...</div>';

    const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    let html = '';
    for (const d of snap.docs) {
        const r = d.data();
        html += `
            <div class="review-item">
                <div class="review-head">
                    <div>
                        <span class="reviewer">${escapeHtml(r.userName || 'Anonymous')}</span>
                        ${r.verifiedPurchase ? '<span class="verified-badge">✓ Verified Purchase</span>' : ''}
                    </div>
                    <span class="review-date">${formatDate(r.createdAt)}</span>
                </div>
                <div>${stars(r.rating)}</div>
                <p class="review-comment">${escapeHtml(r.comment || '')}</p>
            </div>`;
    }
    list.innerHTML = html || emptyState('No reviews yet. Be the first to review!');

    document.getElementById('ratingSummary').textContent = product.ratingCount
        ? `${product.ratingCount} rating${product.ratingCount > 1 ? 's' : ''}` : '';

    renderReviewForm();
}

// renderReviewForm: shows the "Write a Review" box — but only for signed-in
// buyers who aren't the seller of this product.
function renderReviewForm() {
    const wrap = document.getElementById('reviewFormWrap');
    if (!session) {
        wrap.innerHTML = `<p class="muted">Please <a href="login.html">sign in</a> to write a review.</p>`;
        return;
    }
    if (session.role !== 'buyer' || product.sellerId === session.user.uid) {
        wrap.innerHTML = '';
        return;
    }

    wrap.innerHTML = `
        <div class="review-form">
            <h3 style="margin-bottom:12px">Write a Review</h3>
            <div class="form-group">
                <label>Your Rating</label>
                <div class="review-select" id="reviewStars">
                    <input type="radio" id="star5" name="rating" value="5"><label for="star5">★</label>
                    <input type="radio" id="star4" name="rating" value="4"><label for="star4">★</label>
                    <input type="radio" id="star3" name="rating" value="3"><label for="star3">★</label>
                    <input type="radio" id="star2" name="rating" value="2"><label for="star2">★</label>
                    <input type="radio" id="star1" name="rating" value="1"><label for="star1">★</label>
                </div>
            </div>
            <div class="form-group">
                <label>Comment</label>
                <textarea id="reviewComment" rows="3" placeholder="Share your experience with this product..." style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;font-family:inherit"></textarea>
            </div>
            <button class="btn btn-primary" id="submitReviewBtn">Submit Review</button>
        </div>`;

    document.getElementById('submitReviewBtn').addEventListener('click', submitReview);
}

// submitReview: saves the review with status "pending" (admin approves it),
// checks for a verified purchase, prevents duplicate reviews, and updates the
// product's average rating.
async function submitReview() {
    const rating = parseInt(document.querySelector('input[name="rating"]:checked')?.value || 0);
    const comment = document.getElementById('reviewComment').value.trim();
    if (!rating) { toast('Please select a star rating', 'error'); return; }

    try {
        // Has this buyer actually bought the product?
        const verified = await hasPurchased(session.user.uid, productId);
        // One review per product per user.
        const existing = await getDocs(query(
            collection(db, 'reviews'),
            where('productId', '==', productId),
            where('userId', '==', session.user.uid)
        ));
        if (!existing.empty) throw new Error('You have already reviewed this product');

        // Save the review (hidden until the admin says OK).
        await addDoc(collection(db, 'reviews'), {
            productId,
            userId: session.user.uid,
            userName: `${session.profile.firstName || ''} ${session.profile.lastName || ''}`.trim() || session.profile.email || 'User',
            rating,
            comment,
            status: 'pending',
            verifiedPurchase: verified,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Update the product's running average rating immediately.
        const newCount = (product.ratingCount || 0) + 1;
        const newRating = ((product.rating || 0) * (product.ratingCount || 0) + rating) / newCount;
        await setDoc(doc(db, 'products', productId), {
            rating: Math.round(newRating * 10) / 10,
            ratingCount: newCount
        }, { merge: true });

        toast('Review submitted. It will appear once approved by an admin.', 'success');
        product.rating = Math.round(newRating * 10) / 10;
        product.ratingCount = newCount;
        loadReviews();
    } catch (e) {
        toast(e.message || 'Could not submit review', 'error');
    }
}

// --- Related products ------------------------------------------------------------
// Shows up to 4 more approved products from the same category, then deletes
// the whole section if there are none.

async function loadRelated() {
    const grid = document.createElement('div');
    grid.className = 'product-grid';
    grid.style.marginTop = '24px';
    const heading = document.createElement('h2');
    heading.className = 'section-title';
    heading.textContent = 'Related Products';
    const container = document.querySelector('.page .container');
    container.appendChild(heading);
    container.appendChild(grid);

    try {
        const q = query(
            collection(db, 'products'),
            where('categoryId', '==', product.categoryId),
            where('isApproved', '==', true),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
        const snap = await getDocs(q);
        let count = 0;
        for (const d of snap.docs) {
            if (d.id === product.id) continue;
            if (count++ >= 4) break;
            const p = d.data();
            grid.innerHTML += `
                <a href="product.html?id=${d.id}" class="product-card" style="text-decoration:none;color:inherit">
                    <div class="product-img-wrap">
                        ${p.images && p.images[0]
                            ? `<img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" class="product-img" loading="lazy">`
                            : `<div class="product-img placeholder">🛒</div>`}
                    </div>
                    <div class="product-body">
                        <div class="product-name">${escapeHtml(p.name)}</div>
                        <div class="product-price-row"><span class="price">${formatMoney(p.price)}</span></div>
                    </div>
                </a>`;
        }
        if (count === 0) {
            heading.remove();
            grid.remove();
        }
    } catch (e) {
        heading.remove();
        grid.remove();
    }
}

// --- Init ------------------------------------------------------------------------
// Check login, fill the navbar, then load the product.
async function init() {
    session = await requireAuth();
    document.getElementById('logoutBtn').addEventListener('click', logout);
    if (session) {
        document.getElementById('userName').textContent = session.profile.firstName
            ? `${session.profile.firstName} ${session.profile.lastName || ''}` : (session.profile.email || 'User');
        document.getElementById('userRole').textContent = session.profile.role || 'buyer';
        document.getElementById('userAvatar').textContent = (session.profile.firstName || session.profile.email || 'U').charAt(0).toUpperCase();
        updateCartCount();
    }
    await loadProduct();
}

// Start the page brain.
init();
