# Changelog

All notable changes to SriniMart will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-11

### Added
- Phase 7 — AI Chatbot: floating widget on all pages, intent detection (orders, shipping, returns, payments, FAQ), product search, per-user history in Firestore (`chats/{uid}`), rate limiting (8 msgs/60s)
- Phase 8 — Security & Optimization: shared validators (`validatePhone`, `validatePincode`, `validateProductForm`), `escapeHtml` XSS protection, global error handler, TTL caching for category reads
- Phase 9 — Testing: `frontend/test/core.test.mjs` with 15 unit tests run via `npm test` (Node built-in runner)
- Phase 10 — Deployment: `.firebaserc`, GitHub Actions CI/CD (`.github/workflows/deploy.yml`), `DEPLOYMENT.md` guide
- Chat history Firestore rules and composite index definitions

### Changed
- `frontend/server.js` → `frontend/server.cjs` (CommonJS dev server); scripts: `npm start`, `npm test`
- `frontend/js/ui.js` refactored to re-export from new shared `frontend/js/core.js`
- Intent matching now uses word-start boundaries so "shipping" no longer trips the "hi" greeting keyword

## [1.1.0] - 2026-08-11

### Added
- Buyer module: product browsing with search, category/price filters and sorting
- Product detail page with gallery, quantity selector, buy now, related products
- Shopping cart with Firestore persistence and live updates
- Checkout with shipping address, mock payment (COD/UPI/Card), order creation
- Order history with status tracking, details view, and cancellation
- Seller dashboard: product CRUD, inventory management, image upload to Firebase Storage
- Per-seller order mirror (`sellerOrders`) so sellers see orders for their products
- Admin dashboard: stats, user management, product/order/review moderation, demo data seeding
- Star ratings and reviews with admin moderation and verified-purchase badges
- Profile management with default delivery address and store details
- Shared modules (`js/firebase.js`, `js/ui.js`) and marketplace styles (`css/app.css`)
- Firestore & Storage security rules, composite index definitions, `firebase.json`
- First registered user is automatically promoted to Admin (bootstrap)

## [1.0.0] - 2024-01-01

### Added
- Complete database schema with Users, Products, Categories, Orders, OrderItems, CartItems, Reviews
- JWT-based authentication with Argon2id password hashing
- Role-based access control (Buyer, Seller, Admin)
- Product CRUD operations with slug generation
- Product search with text matching, category filtering, price range, rating filters
- Shopping cart with add/update/remove/clear operations
- Checkout process with order creation and cart clearing
- Mock payment processing
- Order management with status tracking
- Review system with moderation workflow (Pending/Approved/Rejected)
- Product rating aggregation
- Admin dashboard with platform statistics
- User management (activate/deactivate, role assignment)
- Product moderation for admin
- Revenue reporting
- AI Chatbot with Gemini and Mock providers
- Rate limiting per IP address
- CORS configuration
- Global exception handling middleware
- Request/response logging
- In-memory LRU cache with TTL
- Database migration system
- Nginx reverse proxy configuration
- Docker and docker-compose setup
- systemd service configuration
- GitHub Actions CI/CD pipeline
- GoogleTest unit tests
- GoogleMock integration tests
- AddressSanitizer and UndefinedBehaviorSanitizer support
- Complete API documentation
- Architecture documentation
- Deployment guide

### Security
- Argon2id password hashing via libsodium
- JWT token authentication
- Parameterized SQL queries to prevent injection
- Input validation on all endpoints
- Role-based authorization
- Rate limiting
- CORS headers
- Security headers (X-Frame-Options, X-Content-Type-Options, HSTS)
- Password never returned in API responses
- Password never logged

### Architecture
- Enterprise layered architecture (Controller → Service → Repository)
- Repository pattern for data access
- Factory pattern for AI providers
- Singleton pattern for database pool and cache
- Strategy pattern for chat providers
- Builder pattern for SQL queries
- Dependency injection for services
- Front controller pattern via Drogon
