# Connect Admin Panel ↔ Customer Website

Both apps share Firebase project **`myroach-6cc80`**.  
Admin panel repo: **myroach_admin** · Storefront: **https://myroach-34ws.vercel.app**

When admin uploads images (products, banners, categories, logo), files go to **Firebase Storage** and the **download URL** is saved in Firestore. The customer site must read those URLs — no hardcoded images.

---

## Deploy Firebase (run once from admin repo)

```bash
cd project_admin
npx firebase-tools login
npx firebase-tools use myroach-6cc80
npx firebase-tools deploy --only firestore:rules,storage
```

Enable **Email/Password** in Firebase Console → Authentication.

For local dev, either disable **App Check enforcement** for Firestore/Storage, or register the debug token from `.env.local` under App Check → Manage debug tokens.

---

## Environment variables (both apps — must match)

Copy `.env.example` to `.env.local` in **both** the admin panel and customer site, then fill values from **Firebase Console → Project settings → Your apps → Web app config**.

```env
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_STORE_URL=https://myroach-34ws.vercel.app
NEXT_PUBLIC_CURRENCY=INR

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Never commit `.env.local` or paste real keys into this repo.

---

## What admin controls → what the site must read

| Admin page | Firestore | Image field | Storage path |
|------------|-----------|-------------|--------------|
| Products create/edit | `products/{id}` | `images: string[]` | `products/{id}/…` |
| Categories | `categories/{id}` | `image: string` | `categories/{id}/…` |
| Banners | `banners/{id}` | `image: string` | `banners/{id}/…` |
| Settings | `settings/general` | `logo: string` | `settings/logos/…` |
| Homepage CMS | `settings/homepage` | product IDs only | — |
| Coupons | `coupons` | — | — |
| Orders | `orders` | item `image?` | — |
| Reviews | `reviews` | — | — |

**Real-time sync:** use Firestore `onSnapshot` on the storefront so image/price changes appear without refresh.

---

## Firestore schemas (canonical field names)

### `products/{id}`
```json
{
  "title": "string",
  "slug": "string",
  "description": "string",
  "shortDescription": "string",
  "price": 999,
  "salePrice": 799,
  "stock": 10,
  "sku": "string",
  "categoryId": "string",
  "tags": ["string"],
  "images": ["https://firebasestorage.googleapis.com/..."],
  "variants": [{ "type": "size|color", "value": "string" }],
  "featured": true,
  "active": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```
Storefront: query `where("active", "==", true)`.

### `categories/{id}`
```json
{ "name": "string", "slug": "string", "image": "https://...", "active": true }
```

### `banners/{id}`
```json
{
  "title": "string",
  "subtitle": "string",
  "image": "https://...",
  "redirectUrl": "/collections/sale",
  "position": 1,
  "active": true
}
```
Storefront: `where("active", "==", true)`, order by `position`.

### `settings/general`
```json
{
  "storeName": "MY ROACH",
  "logo": "https://...",
  "storeDescription": "string",
  "contactEmail": "string",
  "phone": "string",
  "address": "string",
  "shippingCharge": 99,
  "freeShippingThreshold": 999,
  "taxPercentage": 18,
  "socialLinks": { "facebook": "", "instagram": "", "twitter": "" },
  "footerContent": "string",
  "policies": { "returnPolicy": "", "privacyPolicy": "", "termsAndConditions": "" }
}
```

### `settings/homepage`
```json
{
  "featuredCollectionIds": ["categoryId"],
  "bestSellerIds": ["productId"],
  "newArrivalIds": ["productId"],
  "promoTitle": "string",
  "promoSubtitle": "string",
  "showFeatured": true,
  "showBestSellers": true,
  "showNewArrivals": true,
  "showPromo": true
}
```

### `orders/{id}` (written by storefront on checkout)
```json
{
  "userId": "string",
  "customerName": "string",
  "customerEmail": "string",
  "items": [{ "productId": "", "title": "", "quantity": 1, "price": 0, "image": "" }],
  "subtotal": 0, "tax": 0, "shippingCharge": 0, "discount": 0, "total": 0,
  "status": "pending",
  "paymentStatus": "paid",
  "shippingAddress": { "name": "", "email": "", "phone": "", "address": "", "city": "", "state": "", "zip": "", "country": "IN" },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### `carts/{userId}` (storefront writes when logged in)
```json
{
  "items": [{ "productId": "", "title": "", "quantity": 1, "price": 0, "image": "" }],
  "updatedAt": "Timestamp"
}
```

### `users/{uid}` (signup)
```json
{ "name": "string", "email": "string", "role": "customer", "active": true, "createdAt": "Timestamp" }
```

---

## Cursor prompt — paste into customer site project

```
Connect my Next.js customer storefront (https://myroach-34ws.vercel.app) to Firebase project myroach-6cc80 so it shares the same backend as the admin panel (myroach_admin on GitHub).

GOAL: Everything the admin changes in the admin panel (especially images) must appear on the live site in real time via Firestore + Firebase Storage URLs.

1. FIREBASE SETUP
   - Add the same NEXT_PUBLIC_FIREBASE_* env vars as the admin panel (project myroach-6cc80).
   - Set NEXT_PUBLIC_USE_MOCK_DATA=false.
   - Initialize Firebase client: Auth, Firestore, Storage (client SDK only).
   - Add next.config image remotePatterns for:
     firebasestorage.googleapis.com
     myroach-6cc80.firebasestorage.app

2. FIRESTORE — READ WITH onSnapshot (real-time)
   - products: active only. Fields: title, slug, description, shortDescription, price, salePrice, stock, sku, categoryId, tags, images[], variants[], featured, active.
   - categories: active only. Fields: name, slug, image.
   - banners: active only, sort by position. Fields: title, subtitle, image, redirectUrl.
   - settings/general: storeName, logo, storeDescription, contactEmail, phone, address, shippingCharge, freeShippingThreshold, taxPercentage, socialLinks, footerContent, policies.
   - settings/homepage: featuredCollectionIds, bestSellerIds, newArrivalIds, promoTitle, promoSubtitle, showFeatured, showBestSellers, showNewArrivals, showPromo.
   - coupons: active, not expired. Fields: code, discountType, discountValue, minimumOrderAmount, expiryDate.
   - reviews: approved === true only.

3. IMAGES — CRITICAL
   - NEVER hardcode product/banner/category/logo URLs.
   - Render product.images[0] (and gallery from images[]) on product cards and PDP.
   - Render category.image on collection tiles.
   - Render banner.image on homepage hero carousel (use next/image or img with Firebase Storage URLs).
   - Render settings/general.logo in header/footer.
   - All image fields are full HTTPS URLs from Firebase Storage (uploaded via admin panel).

4. HOMEPAGE
   - Hero: onSnapshot on banners where active==true, orderBy position.
   - Featured / best sellers / new arrivals: resolve product IDs from settings/homepage against live products collection.
   - Promo block: promoTitle, promoSubtitle from settings/homepage when showPromo is true.

5. PRODUCT PAGES
   - List/grid: filter active products, show images[0], price, salePrice, stock.
   - Detail page: slug route, full images[] gallery, stock check, add to cart.
   - Category pages: filter products where categoryId matches and active==true.

6. AUTH (customers)
   - Firebase Auth email/password signup & login.
   - On signup create Firestore users/{uid} with role: "customer", active: true.
   - Do NOT use role "admin" on storefront signups.

7. CART
   - Guests: localStorage cart.
   - Logged-in: sync to Firestore carts/{uid} with items[{ productId, title, quantity, price, image }] and updatedAt serverTimestamp.
   - Merge guest cart into Firestore on login.

8. CHECKOUT → ORDERS
   - On payment success write orders collection (schema above).
   - Decrement products.stock for each line item.
   - Use settings/general for shippingCharge, freeShippingThreshold, taxPercentage (INR ₹).

9. REVIEWS & NEWSLETTER
   - Customers write reviews (approved: false); only show approved reviews.
   - Newsletter signup writes to subscribers collection: { email, active: true, createdAt }.

10. SECURITY
    - Deploy firestore.rules and storage.rules from myroach_admin repo.
    - Public read: products, categories, banners, settings, approved reviews.
    - Authenticated customers: read/write own carts, create orders, create reviews.

11. VERIFY
    - Upload a banner image in admin → homepage hero updates on site.
    - Change product image in admin → product card updates on site.
    - Change logo in admin Settings → site header logo updates.
    - Complete test order → appears in admin Orders page.
```

---

## Admin login

- URL: http://localhost:3000/login
- Use your Firebase admin account (`role: "admin"` in Firestore `users/{uid}`).
- Dev bypass: **Skip login (dev only)** — dashboard works but **image upload requires real Firebase sign-in**

## Image upload note

Uploads require Firebase Auth with `role: "admin"` in `users/{uid}` (storage.rules). Use real login, not dev bypass, when testing Storage uploads.

Restart dev server after changing `.env.local`:
```bash
npm run dev
```
