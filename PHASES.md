# SriniMart - Project Phases

## Phase 1: Foundation & Authentication (Done)
**Date: 02/08/2026**
- Landing page with hero section
- Login/Register page with Firebase Authentication
- Firebase Firestore database connection
- User registration and login flow
- Role-based redirect (Buyer/Seller/Admin)
- Basic CSS styling

## Phase 2: Buyer Module (Done)
- Product browsing with search and filters
- Product detail page
- Shopping cart functionality
- Cart persistence in Firestore
- User profile management

## Phase 3: Seller Module (Done)
- Seller dashboard
- Product CRUD (Create, Read, Update, Delete)
- Inventory management
- Product images upload (Firebase Storage)
- Order viewing (per-seller order mirror)

## Phase 4: Checkout & Orders (Done)
- Checkout flow with shipping address
- Order creation in Firestore
- Order history for buyers
- Order status tracking
- Mock payment processing (COD / UPI / Card)

## Phase 5: Reviews & Ratings (Done)
- Product reviews system
- Star ratings (1-5)
- Review moderation (Admin)
- Verified purchase badges
- Average rating calculation

## Phase 6: Admin Module (Done)
- Admin dashboard with statistics
- User management (activate/deactivate, role change)
- Product moderation
- Order management
- Revenue reports
- Demo data seeding

## Phase 7: AI Chatbot (Done)
- Floating chat widget (available on all pages)
- Intent detection (orders, shipping, returns, payments, help, FAQ) + product search
- Per-user chat history stored in Firestore (`chats/{uid}`)
- Client-side rate limiting (8 messages / 60s window)
- Pure logic module (`js/core.js`) shared with the rest of the app

## Phase 8: Security & Optimization (Done)
- Input validation (phone, pincode, product form, email)
- XSS protection (`escapeHtml` applied to user content)
- Global error / unhandled-rejection handler
- Firestore rules for chatbot chat history
- Cached reads with TTL for category data
- Word-boundary intent matching to avoid false keyword hits

## Phase 9: Testing (Done)
- Unit tests for shared logic (`frontend/test/core.test.mjs`, Node test runner)
- 15 tests covering money formatting, escaping, slugs, ratings, validation,
  product form errors, caching, chatbot intents, rate limiting, debounce
- `npm test` runs the suite; wired into CI

## Phase 10: Deployment (Done)
- Firebase Hosting config + `.firebaserc` (project `srini-mart`)
- Firestore rules, composite indexes, and storage rules deploy via `firebase deploy`
- GitHub Actions CI/CD (`deploy.yml`): test then deploy on push to `main`
- `DEPLOYMENT.md`: deploy steps, demo data setup, custom domain & SSL, rollback
