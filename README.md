# MyRoach Admin Panel

Production-ready e-commerce admin panel for [MY ROACH](https://myroach-34ws.vercel.app). Shares the same Firebase backend as the customer store — changes sync in real time.

## Features

- **Dashboard** — Revenue, orders, customers, charts, low stock alerts
- **Analytics** — Revenue trends, order status breakdown, category performance
- **Activity Feed** — Live sync from orders, customers, inventory, reviews
- **Products** — Full CRUD, search, filter, pagination, view on live store
- **Categories** — Manage collections synced to storefront
- **Orders** — Status updates, invoice print, detailed breakdown
- **Customers** — Profile, order history, enable/disable
- **Inventory** — Stock levels, quick updates, low stock alerts
- **Banners & Homepage** — CMS for storefront content
- **Coupons** — Discount code management
- **Reviews** — Approve/reject customer reviews
- **Subscribers** — Newsletter list with CSV export
- **Reports** — Export orders, products, subscribers as CSV
- **Settings** — Store info, shipping, tax, policies, social links

## Tech Stack

Next.js 15+ · TypeScript · Tailwind CSS · Firebase Auth · Firestore · Storage · Recharts · TanStack Table

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in Firebase credentials
npm run dev
```

Open http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_USE_MOCK_DATA` | `true` for local mock, `false` for Firebase |
| `NEXT_PUBLIC_STORE_URL` | Customer store URL |
| `NEXT_PUBLIC_CURRENCY` | `INR` for MY ROACH |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase project config |

## Firebase Setup

1. Enable Email/Password auth in Firebase Console
2. Create admin user in Authentication
3. Add Firestore document `users/{uid}`:
   ```json
   { "name": "Admin", "email": "...", "role": "admin", "active": true }
   ```
4. Deploy rules: `firebase deploy --only firestore:rules,storage`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all `NEXT_PUBLIC_*` env variables
4. Deploy

## Login

Use your Firebase admin account (`role: "admin"` in Firestore `users` collection).

Mock mode: `admin@admin.com` / `admin123`
