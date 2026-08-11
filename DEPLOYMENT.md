# SriniMart Deployment Guide

This document covers deploying SriniMart to Firebase Hosting, applying security rules, and wiring up a custom domain with SSL.

## Prerequisites

- A Firebase project. This repo is configured for project **`srini-mart`** (`.firebaserc`).
- Node.js 18+ and `firebase-tools`:

```bash
npm install -g firebase-tools
firebase login
```

## 1. Deploy everything (app + rules + indexes)

From the repo root:

```bash
firebase deploy
```

This uses `firebase.json` to deploy:

| Target | Source |
|--------|--------|
| Firebase Hosting | `frontend/` |
| Firestore rules | `firestore.rules` |
| Firestore composite indexes | `firestore.indexes.json` |
| Storage rules | `storage.rules` |

To deploy only part of it:

```bash
firebase deploy --only hosting
firebase deploy --only firestore,storage
```

> **First deploy:** Firestore will build the composite indexes defined in
> `firestore.indexes.json` automatically. Until they finish building (a few
> minutes), some buyer queries may return errors.

## 2. Initial data & roles

1. Open the deployed site and **register** — the very first account becomes Admin.
2. Log in as Admin → **Demo Data** tab → **Seed Demo Data** to create categories
   and sample products.
3. Create buyer/seller accounts from the Admin → Users tab or by registering.

## 3. CI/CD (GitHub Actions)

A workflow is included at `.github/workflows/deploy.yml`. It runs the unit tests
and deploys on every push to `main`.

Setup:

```bash
# Generate a CI token (one time)
firebase login:ci
```

Add the printed token as a GitHub Actions secret named `FIREBASE_TOKEN`
(Repo → Settings → Secrets and variables → Actions).

## 4. Custom domain & SSL

1. In the Firebase console open **Hosting** for project `srini-mart`.
2. Click **Add custom domain**, enter your domain (e.g. `www.example.com`).
3. Verify ownership by adding the TXT records Firebase provides.
4. Add the DNS A/AAAA (or CNAME) records Firebase shows to your DNS provider.
5. Firebase provisions and renews **SSL certificates automatically** (Let's Encrypt).
6. Add `headers`/`redirects` in `firebase.json` if you need security headers or
   to force HTTPS.

Example `firebase.json` hosting block with security headers:

```json
"hosting": {
  "public": "frontend",
  "headers": [
    {
      "source": "**",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    },
    {
      "source": "**/*.@(jpg|jpeg|gif|png|webp|svg)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=604800, immutable" }
      ]
    }
  ]
}
```

## 5. Rollback

Firebase Hosting keeps a history of deployed versions. In the console go to
**Hosting → Releases** to roll back to any previous version instantly.

## 6. Local development

```bash
cd frontend
npm install
npm start        # http://localhost:8000
npm test         # unit tests (node --test)
```
