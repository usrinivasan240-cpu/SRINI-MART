# SriniMart — Complete Project Guide (Easy to Understand)

This guide explains **every file** and **every module** in the SriniMart project.
It is written so that even someone who does not write code can follow along.

---

## 1. What is SriniMart?

SriniMart is an **online marketplace** — like a small Amazon. It connects three
types of people:

| Who | What they do |
|-----|--------------|
| **Buyer** | Browse products, add to cart, checkout, pay, track orders, write reviews |
| **Seller** | List products, manage stock, see orders for their own products |
| **Admin** | Approve products, manage users, update order status, moderate reviews, seed demo data |

The whole app runs **in the web browser** (no app to install). All the data lives
in **Firebase** — Google's cloud platform — which provides:

- **Firebase Authentication** — handles "who is logged in" (email + password)
- **Firestore** — the database that stores users, products, carts, orders, reviews, chat history
- **Storage** — the file cupboard where product photos are kept

> The project also contains an old plan for a C++ server (`CMakeLists.txt`,
> `vcpkg.json`). **That is not used.** The working app is the `frontend/` folder
> talking directly to Firebase.

---

## 2. The Big Idea: There is NO Server

Most websites have two halves:

```
[ Browser ]  ⇄  [ Server (a computer running code) ]  ⇄  [ Database ]
```

SriniMart does something modern instead — **everything runs in the browser**:

```
[ Browser (the frontend/ folder) ]  ⇄  [ Firebase (cloud) ]
                                      ↕
                                    [ Data + Rules ]
```

The frontend reads and writes data straight into Firebase. The **security rules**
files act as a "bouncer" that decides what each user is allowed to see and do.
This is why the app needs no server and is cheap to run.

**How a page works (example: the storefront):**
1. The user opens `buyer.html`.
2. The page loads `buyer.js`, the "brain" for that page.
3. `buyer.js` asks Firebase: *"give me all approved, active products."*
4. Firebase checks the security rules, allows it, and sends the products.
5. `buyer.js` draws the products on the screen (cards with photo, price, stars).

Every page follows this same pattern: **HTML = the skeleton, CSS = the look, JS = the brain**.

---

## 3. The File Map (Every File, One Line)

```
SriniMart/
├── frontend/                        # THE ENTIRE APP LIVES HERE
│   ├── index.html                   # Landing / home page (advertises the app)
│   ├── login.html                   # Sign in + create account page
│   ├── buyer.html                   # Storefront: browse & search products
│   ├── product.html                 # One product's page (details + reviews)
│   ├── cart.html                    # Shopping cart page
│   ├── checkout.html                # Delivery address + payment page
│   ├── orders.html                  # "My Orders" page for buyers
│   ├── profile.html                 # User profile / account settings
│   ├── seller.html                  # Seller dashboard (their products & orders)
│   ├── admin.html                   # Admin control center
│   ├── css/
│   │   ├── style.css                # Styling for the landing + login pages
│   │   └── app.css                  # Styling for the marketplace pages
│   ├── js/
│   │   ├── firebase.js              # ⭐ Connects to Firebase (used by everything)
│   │   ├── core.js                  # ⭐ Pure logic "toolbox" (also tested)
│   │   ├── ui.js                    # ⭐ Shared UI helpers + login guard
│   │   ├── buyer.js                 # Brain of the storefront page
│   │   ├── product.js               # Brain of the product page
│   │   ├── cart.js                  # Brain of the cart page
│   │   ├── checkout.js              # Brain of the checkout page
│   │   ├── orders.js                # Brain of the orders page
│   │   ├── profile.js               # Brain of the profile page
│   │   ├── seller.js                # Brain of the seller dashboard
│   │   ├── admin.js                 # Brain of the admin dashboard
│   │   └── chatbot.js               # The floating AI assistant widget
│   ├── test/
│   │   └── core.test.mjs            # Automatic tests for core.js
│   ├── server.cjs                   # Tiny local web server for development
│   └── package.json                 # Project info + commands (start / test)
├── firestore.rules                  # 🔒 Security rules for the database
├── firestore.indexes.json           # Speed-up "indexes" for database queries
├── storage.rules                    # 🔒 Security rules for product photos
├── firebase.json                    # Deployment instructions for Firebase
├── .firebaserc                      # Which Firebase project to deploy to
├── .github/workflows/deploy.yml     # Automatic deploy on every push (CI/CD)
├── DEPLOYMENT.md                    # How to put the app live on the internet
├── docs/PROJECT_GUIDE.md            # This document
├── README.md                        # Quick overview
├── PHASES.md                        # The 10 building steps (roadmap)
└── CHANGELOG.md                     # Version history
```

---

## 4. The Engine Room (Shared Modules)

These three files are used by *every* page. Understanding them means understanding
the whole app.

### 4.1 `js/firebase.js` — The Connection to Firebase

**Purpose:** Connect the app to Firebase, exactly once, and share that connection
with every page.

**How it works:**
- Contains the project's settings (the `firebaseConfig` object) — this is like the
  address of the SriniMart cloud.
- Creates three ready-to-use objects and hands them to the rest of the app:
  - `auth` → who is logged in
  - `db` → the database
  - `storage` → the photo cupboard
- It also **re-exports** (re-shares) all the Firebase helper functions, so every
  other file only needs to write one `import` line instead of many.

> Think of it as the **power socket**: every device (page) plugs into it.

### 4.2 `js/core.js` — The Pure Logic Toolbox

**Purpose:** A collection of small, pure functions — no web page, no Firebase.
Because it is "pure" (it just takes input and returns output), it can be tested
automatically, which is what `test/core.test.mjs` does.

**What's inside (plain English):**

| Function | What it does |
|----------|--------------|
| `formatMoney` | Turns `799` into `₹799.00` (Indian format) |
| `formatDate` / `formatDateTime` | Turns dates into readable text like `11 Aug 2026` |
| `slugify` | Makes a URL-safe name, e.g. `Running Shoes` → `running-shoes` |
| `escapeHtml` | 🛡️ **Safety**: turns `<`, `>`, `&` into harmless text so hackers can't inject code |
| `debounce` | Waits until the user stops typing before searching (saves work) |
| `stars` | Draws 5 star symbols, including half-stars, from a rating number |
| `validateEmail` / `validatePhone` / `validatePincode` / `validateRequired` | Checks inputs are sensible (10-digit phone, 6-digit pincode, etc.) |
| `validateProductForm` | Checks a product form has a name, category, price and stock |
| `cachedFetch` | Remembers fetched data for a few minutes (speed-up) |
| `detectIntent` | The chatbot's "brain": figures out what the user is asking |
| `faqResponse` | Looks up the chatbot's answer for a recognised topic |
| `pickFallback` | Picks a polite "I don't know" reply |
| `isRateLimited` | Stops users spamming the chatbot (max 8 messages per minute) |
| `ORDER_STATUS_LABELS` / `PRODUCT_STATUS_LABELS` | The display names for statuses (e.g. `pending` → `Pending`) |

### 4.3 `js/ui.js` — Shared Screen Helpers + The Login Guard

**Purpose:** Things almost every page needs:
- `toast` — the little pop-up notifications ("Added to cart ✅")
- `setLoading` / `withLoading` — turns a button into "Loading..." while work happens
- `requireAuth` — the **bouncer**: checks the user is logged in, loads their
  profile, and redirects them to the login page if not. Some pages pass a role
  (e.g. `requireAuth(['admin'])`) so only admins get in.
- `redirectByRole` — sends each user to the right dashboard
- `logout` — signs the user out
- `authReady` / `getAuthUser` / `getUserProfile` — track the current user
- `emptyState` / `skeleton` — nice "nothing here yet" boxes and loading placeholders
- It also **re-exports everything from `core.js`**, so pages can import helpers
  from just one file.
- It installs a **global error handler**: if any code crashes, the user sees a
  friendly message instead of a broken page.

---

## 5. The Page Brains (One JS File per Page)

Each of these files is the brain of its matching `.html` page.

### 5.1 `buyer.js` — The Storefront

**Job:** Show products + let the buyer search/filter/sort and add to cart.

**How it works:**
1. On load, it asks Firebase for all products that are **approved** and **active**
   (invisible/awaiting-approval products never appear).
2. The buyer can type in the search box (with a short delay via `debounce`), pick
   a category, set a max price, or choose a sort order — the list updates.
3. Clicking **Add to Cart** writes a `cartItems` entry in the database. If the
   item is already in the cart, it increases the quantity instead.
4. The categories list is loaded through `cachedFetch` so it isn't re-fetched
   constantly (saved for 5 minutes).

### 5.2 `product.js` — Product Details & Reviews

**Job:** Show one product, let the buyer choose quantity, add to cart or "Buy Now",
write reviews, and see related products.

**How it works:**
- Reads the product id from the URL (`product.html?id=...`) and loads that product.
- Draws the gallery, price, discount %, stock, and star rating.
- **Buy Now** adds the item to the cart and jumps straight to checkout.
- **Reviews:** only logged-in **buyers** who are not the product's own seller can
  write a review. A check is done to see if the reviewer actually *bought* the
  product (`hasPurchased`) so it can be tagged **"✓ Verified Purchase"**. The
  review starts as **pending** until an admin approves it. The product's average
  rating and count are updated after each review.
- **Related products** = other products in the same category.

### 5.3 `cart.js` — The Shopping Cart

**Job:** List what's in the cart, change quantities, remove items, show totals.

**How it works:**
- Subscribes to **live updates** (`onSnapshot`): if the cart changes anywhere
  (e.g. added from another tab), the page updates by itself.
- Quantity + / − buttons check the product's stock before allowing an increase.
- Removes an item by deleting its `cartItems` row.
- Shows subtotal, discount, shipping (free over ₹500, else ₹40), and total.
- The **Checkout** button goes to `checkout.html`.

### 5.4 `checkout.js` — Checkout & Payment

**Job:** The most careful step — validate the address, "process" payment, create
the order, reduce stock, and empty the cart.

**How it works (step by step):**
1. Validates the address form (phone must be 10 digits, pincode 6 digits, all
   fields filled).
2. **Re-checks stock** for every cart item (someone else might have bought the
   last one meanwhile).
3. Runs the **mock payment** (COD / UPI / Card). It's fake: it waits under a
   second and almost always succeeds (3% chance of a random "try again").
4. Creates the order in the `orders` collection with a full snapshot of items,
   address, payment details, and totals.
5. Creates a **mirror copy** in `sellerOrders` for each seller involved, so
   sellers can see their part of the order (without seeing the whole order).
6. In **one atomic batch**: subtracts the bought quantities from stock and
   deletes the cart items. If any step fails, nothing is changed (all-or-nothing).
7. Redirects the buyer to `orders.html` with their new order id.

> This "all-or-nothing batch" is what keeps the shop honest — no orders without
> stock changes, no stuck carts.

### 5.5 `orders.js` — Order History & Tracking

**Job:** Show the buyer their orders with live status, allow cancellation, and
show full details.

**How it works:**
- Uses `onSnapshot` so status updates appear instantly when an admin changes them.
- Each order shows a status badge: `Pending → Processing → Shipped → Delivered`,
  or `Cancelled`.
- **Cancel** is only allowed while the status is Pending or Processing. The cancel
  button flips the order status to `cancelled`; the admin page restores the stock.
- **View Details** expands the delivery address, price breakdown, and payment ref.

### 5.6 `profile.js` — Account Settings

**Job:** Let the user edit their name, phone, default delivery address, and (for
sellers) their store name/description; also send a password-reset email.

**How it works:** Fills the form from the user's Firestore record, validates phone
and pincode, then saves changes with `setDoc(..., { merge: true })` (only the
fields the user filled).

### 5.7 `seller.js` — Seller Dashboard

**Job:** Let a seller manage their products and see their orders.

**How it works:**
- Only sellers can enter (via `requireAuth(['seller'])`).
- **Products tab:** lists the seller's own products (queried by `sellerId`), with
  stats (total, active, low stock, pending orders). The seller can:
  - **Add / Edit** a product in a modal form — name, category, price, MRP, stock,
    description, photos, active on/off. New products are saved with
    `isApproved: false`, so they only appear after an admin approves them.
  - **Upload photos** to Firebase Storage into their own product folder
    (`products/<productId>/...`), enforced by `storage.rules`.
  - **Activate / Deactivate** (hide/show) a listing.
  - **Delete** a product (also deletes its photos from Storage).
- **Orders tab:** shows the seller's mirror orders (`sellerOrders` where
  `sellerId` = the seller) with buyer name, items, address, payment method, and status.

### 5.8 `admin.js` — Admin Control Center

**Job:** Run the whole platform: stats, users, products, orders, reviews, demo data.

**How it works (only admins enter, via `requireAuth(['admin'])`):**
- **Stats tab:** counts users/buyers/sellers/products/pending approvals/orders,
  adds up revenue (excluding cancelled), counts pending reviews.
- **Users tab:** activate/deactivate users, change roles. (Admins can't deactivate
  themselves.)
- **Products tab:** **Approve** or **Reject** seller products (this is the gate
  that makes new products visible), and **Hide/Show** listings.
- **Orders tab:** change any order's status. When an order is set to **Cancelled**,
  the sold stock is **automatically returned** to the products (`increment`).
- **Reviews tab:** **Approve** or **Reject** buyer reviews; only approved ones show.
- **Demo Data tab:** one click seeds 6 categories and 10 sample products so the
  store isn't empty when testing.

### 5.9 `chatbot.js` — The Floating AI Assistant

**Job:** A chat bubble (bottom-right of every page) that answers questions and
finds products.

**How it works:**
1. It builds the chat window itself (HTML + CSS injected by the script), so no
   page needs extra markup — every page just loads `chatbot.js`.
2. When the user sends a message, the **chatbot brain** (`detectIntent` in
   `core.js`) classifies it:
   - *"Where is my order?"* → `orderStatus` → a helpful FAQ answer.
   - *"What are the shipping charges?"* → `shipping` → answer.
   - *"Show me headphones"* → `products` → it actually **searches the product
     database** and replies with clickable product links and prices.
3. It is **rate-limited**: max 8 messages per 60 seconds, to stop spam.
4. The whole conversation is saved in Firestore under `chats/<userId>` so it
   survives a page reload.
5. It only appears for logged-in users.

> It is a "rule-based" assistant (keyword matching + FAQ + product search), not
> a paid AI model — it costs nothing to run.

---

## 6. The Database (Firestore Collections)

The database is organised into folders called **collections**. Each collection
holds many **documents** (rows). Here is every collection and what lives in it:

| Collection | What it holds | Who can see it |
|------------|---------------|----------------|
| `users` | One document per account: name, email, role, address, store info, active flag | The user themselves or admins |
| `categories` | Product categories (Electronics, Fashion, …) | Any signed-in user; only admins edit |
| `products` | Listings: name, price, MRP, stock, photos, seller, rating, approval status | Approved+active for everyone; sellers see their own; admins see all |
| `cartItems` | Cart lines. Document id = `{userId}_{productId}` so each user can't have the same product twice | Only that user |
| `orders` | Full buyer orders (all items, address, payment, totals, status) | The buyer who placed it or admins |
| `sellerOrders` | A **mirror** of each order, split per seller, so sellers see only their part | The seller involved or admins |
| `reviews` | Product reviews (rating, comment, status, verified-purchase flag) | Everyone sees approved ones; only admins moderate |
| `chats` | One document per user holding their chatbot conversation | Only that user |

---

## 7. What Happens During a Sale (A Guided Tour)

Follow a buyer from start to finish:

1. **Register** on `login.html`. The very first account ever created is
   automatically made **Admin** (so someone can run the shop).
2. **Browse** `buyer.html`. Only approved + active products are shown.
3. **Open a product** (`product.html?id=...`). Check reviews, choose quantity.
4. **Add to Cart** → a row appears in `cartItems`.
5. **Checkout** (`checkout.html`) → enter address → pay (mock) →
   `checkout.js` creates the order in `orders`, mirrors it to `sellerOrders`,
   subtracts stock, clears the cart — all in one atomic batch.
6. **Admin** sees the new order, sets it to `Processing`, then `Shipped`, then
   `Delivered`.
7. **Buyer** watches the status change live on `orders.html`.
8. **Buyer** writes a review on the product page → it sits as `pending`.
9. **Admin** approves the review → it appears for everyone, and the product's
   star rating updates.
10. If the buyer **cancels** before delivery, the admin's order page restores
    the stock automatically.

---

## 8. The Security Rules (The Bouncer)

The rules files are the app's security — even though code runs in the browser,
these rules are enforced **by Firebase itself**, so users can't cheat by editing
the code.

### `firestore.rules` (database rules) — plain-English summary

- **`users`**: you can only read/update your **own** profile; admins manage everyone.
- **`categories`**: read-only for everyone, only admins write.
- **`products`**:
  - Everyone sees products that are **approved AND active**.
  - Sellers see their own products even if not yet approved.
  - Sellers can create products only for themselves, and can edit their own —
    but **never** change `isApproved` (they can't self-approve).
  - Only admins delete products.
- **`cartItems`**: only the owner can read/update/delete their own cart rows.
- **`orders`**: only the buyer who placed it or an admin can read it. A buyer can
  only ever change the status **to `cancelled`**; admins change anything.
- **`reviews`**: anyone signed in can see **approved** reviews; only the reviewer
  can see their own pending ones; only admins moderate.
- **`sellerOrders`**: only the seller named on the mirror can read it.
- **`chats`**: only the owner can read/update their chat history.

### `storage.rules` (photo rules) — plain-English summary

- Anyone signed in can **view** product photos.
- A seller can only **upload** into their **own** product folder, only **image**
  files, and each file must be **under 5 MB**.
- Only admins can delete.

---

## 9. Speed-Up Files and Config

- **`firestore.indexes.json`** — Firestore needs "indexes" (like a book's index)
  to run combined searches quickly. This file declares the ones the app uses
  (e.g. *approved + active*, *seller + date*, *product + status + date*). They are
  created automatically when you deploy.
- **`firebase.json`** — tells `firebase deploy` what to upload: the `frontend/`
  folder as the website, plus the rules and indexes.
- **`.firebaserc`** — says the project's Firebase name is `srini-mart`.
- **`.github/workflows/deploy.yml`** — CI/CD: every time code is pushed to
  `main`, GitHub automatically (1) runs the tests, then (2) deploys to Firebase.
- **`server.cjs`** — a tiny development web server. `npm start` runs it so you
  can open the app at `http://localhost:8000`.
- **`package.json`** — the project's ID card and its commands: `npm start`
  (run locally) and `npm test` (run the automatic tests).
- **`test/core.test.mjs`** — 15 automatic tests that check `core.js` works
  (money formatting, safety escaping, phone/pincode checks, chatbot intent
  detection, rate limiting, etc.). Run with `npm test`.

---

## 10. The Development Workflow (Cheat Sheet)

```bash
cd frontend
npm install     # one time: download helpers
npm start       # open http://localhost:8000
npm test        # run the 15 automatic tests
```

**To deploy live:**

```bash
firebase login
firebase deploy
```

See `DEPLOYMENT.md` for full instructions, custom domain, and SSL.

---

## 11. One-Line Summary of Each JS File

| File | In one sentence |
|------|-----------------|
| `firebase.js` | Connects the app to Firebase once and shares it everywhere |
| `core.js` | The pure-logic toolbox (formatting, validation, chatbot brain) — fully tested |
| `ui.js` | Shared screen helpers, login guard, and global error handler |
| `buyer.js` | Shows and filters the product storefront |
| `product.js` | One product's details, reviews, and "buy now" |
| `cart.js` | The shopping cart with live updates |
| `checkout.js` | Validates, "pays", creates the order, updates stock, clears cart |
| `orders.js` | The buyer's order history with live status |
| `profile.js` | Edits profile and default address |
| `seller.js` | The seller's products, stock, photos, and orders |
| `admin.js` | Stats, users, approvals, orders, reviews, demo data |
| `chatbot.js` | The floating assistant that answers FAQs and finds products |
