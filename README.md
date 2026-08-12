# SriniMart - Multi-Seller Marketplace

**Phase 1: Foundation & Authentication**
**Date: 02/08/2026**

## Overview

SriniMart is a multi-seller marketplace platform. This is Phase 1 which includes the landing page, login/registration system, and Firebase database connection.

## What's Included in Phase 1

- Landing page with hero section and features
- Login/Register page with Firebase Authentication
- Firebase Firestore database connection
- User registration with role selection (Buyer/Seller)
- Role-based redirect after login
- Responsive design

## Tech Stack (Phase 1)

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Authentication | Firebase Authentication |
| Database | Firebase Firestore |
| Hosting | Static files (ready for Firebase Hosting) |

## Project Structure

```
SriniMart/
├── frontend/
│   ├── index.html          # Landing page
│   ├── login.html          # Login/Register page
│   └── css/
│       └── style.css       # Styling
├── PHASES.md               # Project phases
├── README.md               # This file
└── srini-mart-firebase-adminsdk-fbsvc-03f202f925.json  # Firebase service account
```

## Firebase Configuration

```
Project ID: srini-mart
Auth Domain: srini-mart.firebaseapp.com
Storage Bucket: srini-mart.firebasestorage.app
```

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| users | User profiles (role, name, email, status) |

## How to Run

1. Open `frontend/index.html` in a browser
2. Click "Get Started" or "Login"
3. Register as Buyer or Seller
4. Login redirects to role-based dashboard (Phase 2)

## Next Phases

- Phase 2: Buyer Module (Products, Cart)
- Phase 3: Seller Module (Product Management)
- Phase 4: Checkout & Orders
- Phase 5: Reviews & Ratings
- Phase 6: Admin Module
- Phase 7: AI Chatbot
- Phase 8: Security & Optimization
- Phase 9: Testing
- Phase 10: Deployment

## License

MIT License
