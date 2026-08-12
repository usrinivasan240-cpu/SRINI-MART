# Changelog

All notable changes to SriniMart will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
