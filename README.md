# SriniMart - Multi-Seller Marketplace

**Status: Phases 1-10 complete (Foundation, Auth, Buyer, Seller, Checkout & Orders, Reviews, Admin, AI Chatbot, Security & Optimization, Testing, Deployment)**

## Overview

SriniMart is a multi-seller marketplace platform where buyers can shop, sellers can list products, and admins moderate the platform. The app is a **client-side Firebase application** (Authentication + Firestore + Storage) — no custom backend required.

> Note: the repository also contains an early plan for an enterprise C++ (Drogon + PostgreSQL) backend (`CMakeLists.txt`, `vcpkg.json`). That backend is **not part of the working application**; the live app runs entirely on Firebase from `frontend/`.

## Features

### Buyer
- Browse products with search, category filter, price filter, and sorting
- Product detail page with gallery, ratings, and related products
- Shopping cart (Firestore-persisted, live updates) with quantity controls
- Checkout with shipping address, mock payment (COD / UPI / Card)
- Order history with status tracking and cancellation
- Write star ratings & reviews (moderated by admin)
- Profile management with default delivery address

### Seller
- Dashboard with stats (products, active, low stock, pending orders)
- Product CRUD with multi-image upload to Firebase Storage
- Inventory (stock) management, activate/deactivate listings
- Order viewing for own products (via `sellerOrders` mirror)

### Admin
- Platform statistics (users, buyers, sellers, products, orders, revenue, pending items)
- User management (activate/deactivate, role changes)
- Product moderation (approve/reject/hide)
- Order management (status updates, stock restore on cancel)
- Review moderation (approve/reject)
- Demo data seeding (categories + sample products)

### AI Chatbot
- Floating chat widget available across all pages
- Intent detection (orders, shipping, returns, payments, FAQ) and product search
- Per-user chat history saved to Firestore (`chats/{uid}`)
- Client-side rate limiting (8 messages / 60s)
- Shared pure-logic module (`core.js`) unit-tested with Node's built-in test runner

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, JavaScript ES6+ (ES Modules) |
| Authentication | Firebase Authentication |
| Database | Firebase Firestore |
| Storage | Firebase Storage (product images) |
| Hosting | Firebase Hosting (or `node server.cjs`) |
| Testing | Node.js built-in test runner (`node --test`) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

## Project Structure

```
SriniMart/
├── frontend/
│   ├── index.html          # Landing page
│   ├── login.html          # Login/Register (first user = Admin)
│   ├── buyer.html          # Product browsing
│   ├── product.html        # Product detail + reviews
│   ├── cart.html           # Shopping cart
│   ├── checkout.html       # Checkout + mock payment
│   ├── orders.html         # Order history
│   ├── profile.html        # User profile
│   ├── seller.html         # Seller dashboard
│   ├── admin.html          # Admin dashboard
│   ├── css/
│   │   ├── style.css       # Base + landing styles
│   │   └── app.css         # Marketplace component styles
│   ├── js/
│   │   ├── firebase.js     # Shared Firebase init
│   │   ├── core.js         # Pure shared logic (validation, formatting, chatbot)
│   │   ├── ui.js           # Toasts, guards, formatters (re-exports core.js)
│   │   ├── chatbot.js      # Floating AI chat widget
│   │   ├── buyer.js        # Buyer page logic
│   │   ├── product.js      # Product/review logic
│   │   ├── cart.js         # Cart logic
│   │   ├── checkout.js     # Order creation
│   │   ├── orders.js       # Order history
│   │   ├── profile.js      # Profile management
│   │   ├── seller.js       # Seller logic
│   │   └── admin.js        # Admin + seeding logic
│   ├── test/
│   │   └── core.test.mjs   # Unit tests (npm test)
│   ├── server.cjs          # Simple static server (dev, node server.cjs)
│   └── package.json        # npm scripts (start / test)
├── .firebaserc             # Default Firebase project
├── .github/workflows/deploy.yml  # CI/CD pipeline
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Required composite indexes
├── storage.rules           # Storage security rules
├── firebase.json           # Firebase deploy config
├── DEPLOYMENT.md           # Deployment & CI/CD guide
├── PHASES.md               # Project roadmap
├── CHANGELOG.md
└── README.md
```

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| users | User profiles (role, status, address, store info) |
| categories | Product categories |
| products | Listings (price, stock, images, rating, approval) |
| cartItems | Per-user cart (doc id = `{userId}_{productId}`) |
| orders | Buyer orders with item snapshots |
| sellerOrders | Per-seller order mirror (doc id = `{sellerId}_{orderId}`) |
| reviews | Product reviews (moderated: pending/approved/rejected) |
| chats | Chatbot history per user (doc id = `{uid}`) |

## Getting Started

1. **Run locally** (static files):
   ```bash
   cd frontend
   npm install
   npm start
   # open http://localhost:8000
   ```

2. **Run unit tests**:
   ```bash
   cd frontend
   npm test
   ```

3. **First run setup**:
   - Register an account — the **very first account is made Admin** automatically.
   - Log in as admin → **Demo Data** tab → **Seed Demo Data** to create categories and sample products.
   - Create buyer/seller accounts from the admin panel or via logout → Register.

4. **Roles flow**:
   - Admin: `admin.html` — moderate, manage users/orders, seed data
   - Seller: `seller.html` — add products (await admin approval), manage inventory, view orders
   - Buyer: `buyer.html` — browse, cart, checkout, orders, reviews

## Deploy to Firebase

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

The Firestore/Storage rules and indexes deploy with `firebase deploy` (see `firebase.json`). If you deploy only hosting first, apply rules with `firebase deploy --only firestore,storage`.

A GitHub Actions pipeline (`.github/workflows/deploy.yml`) runs the unit tests and deploys on every push to `main` — see `DEPLOYMENT.md` for the one-time `FIREBASE_TOKEN` setup and custom domain / SSL instructions.

## Security

- Firestore rules enforce ownership (cart/orders owned by user), role-based admin access, product visibility (approved + active), and review moderation
- Sellers cannot self-approve products
- Buyers cannot read other buyers' orders
- Storage rules restrict uploads to images under the seller's product folder
- XSS protection (`escapeHtml`), input validation (phone/pincode/product form), global error handling, cached Firestore reads

## License

MIT License
