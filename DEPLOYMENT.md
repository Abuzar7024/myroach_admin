# MyRoach Admin Panel — Deployment Guide

## Quick Start (MVP Mock Mode)

```bash
npm install
npm run dev
```

Login: `admin@admin.com` / `admin123`

Mock mode is enabled via `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local`.

## Connect to Firebase (Production)

1. Set `NEXT_PUBLIC_USE_MOCK_DATA=false` in `.env.local`
2. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
3. Create admin user in Firebase Auth (Email/Password)
4. Add user document in Firestore `users/{uid}`:
   ```json
   {
     "name": "Admin",
     "email": "admin@myroach.com",
     "role": "admin",
     "active": true,
     "createdAt": "<timestamp>"
   }
   ```

## Deploy to Vercel

1. Push repo to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all `NEXT_PUBLIC_*` environment variables
4. Deploy

```bash
vercel --prod
```

## Environment Variables

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_USE_MOCK_DATA` | Yes |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | When not mock |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | When not mock |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | When not mock |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | When not mock |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | When not mock |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | When not mock |

## Routes

- `/login` — Admin login
- `/dashboard` — Overview & analytics
- `/dashboard/products` — Product CRUD
- `/dashboard/categories` — Category management
- `/dashboard/orders` — Order management
- `/dashboard/customers` — Customer management
- `/dashboard/banners` — Homepage banners
- `/dashboard/coupons` — Discount codes
- `/dashboard/settings` — Store & homepage settings
- `/dashboard/inventory` — Stock management
