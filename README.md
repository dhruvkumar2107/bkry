# Chotulal Sweets — Online Ordering & Delivery Platform

A complete, production-ready sweets & bakery ordering platform for **Chotulal Sweets (Bijapur Locality)** — inspired by quick-commerce apps like Blinkit. It ships with three apps in one monorepo:

| App | URL (dev) | Description |
| --- | --- | --- |
| Customer store | http://localhost:5173 | Browse, cart, checkout, OTP login, live order tracking |
| Admin panel | http://localhost:5173/admin | Dashboard, catalog, orders, inventory, riders, reports, settings |
| Delivery panel | http://localhost:5173/delivery | Accept deliveries, live GPS sharing, status updates |

All three are served by a single React (Vite) client that talks to one Express + Prisma API on port **4000**.

---

## Features

**Customer**
- Homescreen with editable banner slider, category strip and product carousels
- Catalog with categories, search (with suggestions), sorting, price & stock filters, pagination
- Product pages with variants (250g / 500g / 1kg), related products, stock indicators
- Persistent guest cart (no login needed) that merges on sign-in
- OTP phone login (dev mode) + saved addresses
- Checkout: saved address / live GPS location / manual address, coupons, COD or online (Razorpay)
- Order confirmation, order history and **live order tracking** (status timeline + rider on a map)
- **Shareable secure tracking link** (`/track-order/:orderNumber?t=<signed-JWT>`) — copyable from the confirmation page; opens tracking in any browser, no login required

**Admin**
- Dashboard KPIs, 7-day sales chart, bestsellers, low/out-of-stock alerts, recent activity
- Products CRUD with image upload, multi-variant editor, categories, flags, **CSV import/export**, bulk price/stock updates, duplicate
- Categories CRUD with drag-order, home visibility, icon/image
- Homepage editor: banners + section layout (featured, bestsellers, new arrivals, offers, category carousels)
- Orders: filter/search, full detail, status workflow, assign riders, cancel (auto stock restore), printable invoice, **copy/open the customer tracking link** and see the rider's latest GPS ping
- Customers: search, profiles, lifetime value, order history, enable/disable
- Inventory: stock levels, adjustments and per-variant movement history
- Live deliveries map (customer destination + moving rider), stale-GPS detection
- Delivery partners management
- Reports: sales trend (daily/weekly/monthly), top products, category performance, payments, rider performance, inventory valuation + CSV export
- Settings: shop details, delivery/tax/checkout toggles, coupons, admin users, audit log

**Delivery**
- New assignments (accept), active deliveries, history
- Start/stop **live location sharing** (browser GPS), advance status (picked up → out for delivery → delivered / failed)
- COD collect amount, one-tap call & Google Maps directions

---

## Tech Stack

- **Backend:** Node.js, Express 4 (ESM), Prisma ORM, JWT auth, Zod validation, Socket.IO, Multer
- **Frontend:** React 18, Vite 5, Tailwind CSS 3, Zustand, React Router 6, React-Leaflet + OpenStreetMap, Socket.IO client, lucide-react
- **Database:** SQLite in dev (zero-config), PostgreSQL for production (one-line switch)
- **Payments:** Razorpay (COD default; online enabled when keys present)

---

## Quick Start

Prerequisites: **Node.js 18+** (tested on 22). No database server required for development.

```bash
# 1. install dependencies for server + client
npm run install:all

# 2. create the database, generate the Prisma client and seed demo data
npm --prefix server run setup

# 3. run both apps together
npm run dev
```

Then open http://localhost:5173

> The seeded catalogue contains 5 categories, 44 products, banners, homepage sections and 3 coupons.

### Windows note
If `npm` is blocked by the PowerShell execution policy, run npm commands through cmd:
`cmd /c "npm run dev"`.

---

## Default Accounts

| Role | Login | Password |
| --- | --- | --- |
| Admin | `9999999999` | `admin123` |
| Delivery | `8888888881` | `delivery123` |
| Delivery (2) | `8888888882` | `delivery123` |
| Customer | any 10-digit phone | OTP `123456` (dev mode) |

> **Change these before going live.** Admin users can be managed in Admin → Settings → Admins.

---

## Environment Variables

Copy `server/.env.example` to `server/.env` and adjust. Sensible dev defaults are already provided.

Key variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` (SQLite) or a Postgres URL |
| `JWT_SECRET` | Token signing secret (set a long random value in prod) |
| `PORT` | API port (default 4000) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `OTP_DEV_MODE`, `OTP_DEV_CODE` | Dev OTP behaviour (`true` / `123456`) |
| `STORAGE_DRIVER` | `local` (default) or `cloudinary` |
| `CLOUDINARY_*` | Cloudinary credentials when using the cloud driver |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Enable online payments |
| `TWILIO_* / WHATSAPP_* / SMTP_*` | SMS / WhatsApp / email notifications |
| `GOOGLE_MAPS_API_KEY` | Optional; maps work without a key via OpenStreetMap |
| `DEFAULT_*` | Default delivery fee, free-delivery threshold, min order, tax % |

---

## Database

### Development (SQLite)
`DATABASE_URL="file:./dev.db"`. Schema lives at `server/prisma/schema.prisma`.

### Production (PostgreSQL)
The repo ships a ready-to-use Postgres schema at `server/prisma/schema.postgres.prisma` (same models, `provider = "postgresql"` plus serverless-friendly Prisma binary targets). You do **not** need to edit `schema.prisma`.

1. Provision Postgres (Neon, Supabase, Vercel Postgres, RDS, …).
2. Set `DATABASE_URL` to the connection string (use the **pooled** string for serverless; append `&pgbouncer=true&connection_limit=1` when using PgBouncer, e.g. Neon/Supabase poolers).
3. Create the schema + seed:
   ```bash
   npm --prefix server run vercel:db
   ```
   This runs `prisma generate` + `prisma db push` against `schema.postgres.prisma` and then seeds demo data.

> Keep `schema.prisma` (SQLite) and `schema.postgres.prisma` (Postgres) in sync when you change models.

Seeding is idempotent-ish (upserts the catalogue). The seeded catalogue ships with **real, bundled product/category/banner photographs** under `client/public/images` (served by the client/CDN, so they work on any host). Photos are the property of their respective authors and used under Creative Commons licences — see [`client/public/images/CREDITS.md`](client/public/images/CREDITS.md). Replace any image from **Admin → Products / Homepage**; if a photo is missing, the app falls back to a bundled branded placeholder (`/images/fallback.svg`) and finally to an on-the-fly SVG via `/api/placeholder/*.svg`.

---

## Project Structure

```
chotulal/
├─ package.json                 # root scripts (install:all, dev, setup, seed, build, vercel-build)
├─ vercel.json                  # Vercel build/install/rewrites config
├─ api/index.js                 # Vercel serverless entry (exports the Express app)
├─ server/
│  ├─ prisma/
│  │  ├─ schema.prisma          # data model (SQLite, local development)
│  │  ├─ schema.postgres.prisma # data model (PostgreSQL, production/Vercel)
│  │  ├─ image-manifest.json    # slug -> bundled photo + attribution
│  │  └─ seed.js                # demo data (uses bundled real photos)
│  ├─ scripts/fetch-images.mjs  # downloads curated Commons photos -> client/public/images
│  ├─ src/
│  │  ├─ app.js                 # Express app (exported; no listen)
│  │  ├─ index.js               # node entry: http server + Socket.IO + static client
│  │  ├─ config/env.js
│  │  ├─ lib/{prisma,socket,storage,otpStore}.js
│  │  ├─ middleware/{auth,validate,error}.js
│  │  ├─ services/{orderService,orderStatus,inventory,pricing,settings,
│  │  │            notifications,audit}.js
│  │  └─ routes/
│  │     ├─ auth / catalog / cart / orders / tracking / uploads / payments
│  │     ├─ placeholder.routes.js # on-the-fly SVG placeholders
│  │     ├─ delivery.routes.js
│  │     └─ admin/…             # dashboard, products, categories, homepage,
│  │                             # orders, customers, inventory, delivery,
│  │                             # reports, settings
│  └─ uploads/                  # local image storage (dev only)
└─ client/
   └─ src/
      ├─ App.jsx                # all routes
      ├─ lib/{api,socket,format}.js
      ├─ store/{auth,cart,toast,location}.js
      ├─ components/…           # ui, MapView, ProductCard, ImageUploader, …
      ├─ layouts/{Customer,Admin,Delivery}Layout.jsx
      └─ pages/{customer,admin,delivery}/…
```

---

## Key Flows

**Order status machine**

```
PENDING_CONFIRMATION → CONFIRMED → PREPARING → READY_FOR_PICKUP
   → ASSIGNED_FOR_DELIVERY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
also: CANCELLED (restores stock) | FAILED_DELIVERY
```

- An order must be **CONFIRMED** (or PREPARING / READY_FOR_PICKUP) before a rider can be assigned.
- Cancelling restores stock; COD is auto-marked **PAID** on delivery.
- Stock is decremented transactionally at checkout to prevent overselling.

**Live tracking**
- The delivery panel shares GPS via `navigator.geolocation.watchPosition` while a delivery is active.
- Pings are stored, broadcast over Socket.IO, and shown to the customer on a Leaflet map.
- GPS older than 60s is flagged **stale**.
- The customer's confirmation page exposes a **copy tracking link** button containing a signed JWT (`?t=`) valid for 14 days; the tracking API authorises the owner, staff, or a valid token, so a shared link never leaks other orders.

**OTP login (dev)**
- `OTP_DEV_MODE=true` logs the code and returns the fixed `OTP_DEV_CODE`.
- Production requires a real SMS provider; until wired the endpoint returns 501/503 and never fakes delivery.

---

## Notifications & Integrations

- **Razorpay:** server-side order creation, HMAC signature verification and webhook handling. Disabled until keys are set.
- **Cloudinary / inline storage:** `STORAGE_DRIVER=cloudinary` pushes uploads to Cloudinary (REST, no SDK); `STORAGE_DRIVER=inline` stores uploads as `data:` URLs in the database (no external service, good for serverless).
- **SMS/WhatsApp/Email:** notification records are always created in-app; external delivery activates only when the corresponding provider env vars are present.
- **Maps:** Leaflet + OpenStreetMap tiles (no API key). "Navigation" uses Google Maps deep links.

---

## Deployment

### Option A — Vercel (serverless)

**Live:** https://chotulal-mu.vercel.app (Neon Postgres, `STORAGE_DRIVER=inline`)
- Admin: `9999999999` / `admin123` · Delivery: `8888888881` / `delivery123` — **change these.**

The repo is pre-configured for Vercel via `vercel.json` and the root `api/index.js` function:

- `client/` → static site (`client/dist`)
- `api/index.js` → Express app as a Node serverless function; `/api/*` and `/uploads/*` are rewritten to it
- The DB schema is pushed and seeded at build time (`npm run vercel-build`)

**Steps**
1. Create a Postgres database (e.g. [Neon](https://neon.tech) free tier) and copy its **pooled** connection string.
2. On Vercel: **Add New → Project → Import** `dhruvkumar2107/bkry`. Vercel reads `vercel.json` automatically (no framework preset needed).
3. Add **Environment Variables** (Production + Preview):
   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled URL (add `&pgbouncer=true&connection_limit=1`) |
   | `DIRECT_URL` | Neon **unpooled/direct** URL (used by `prisma db push` at build time) |
   | `JWT_SECRET` | a long random string |
   | `STORAGE_DRIVER` | `inline` (uploads stored in the DB) |
   | `PUBLIC_BASE_URL` | `https://<your-app>.vercel.app` |
   | `OTP_DEV_MODE` | `false` once you wire SMS (keep `true` to demo with code `123456`) |
   | `CORS_ORIGINS` | `https://<your-app>.vercel.app` |
   | *(optional)* `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | only if you switch `STORAGE_DRIVER=cloudinary` |
4. **Deploy.** The build installs server + client deps, builds the client, pushes the Postgres schema and seeds the catalogue.
5. Open the site and log in as admin (`9999999999` / `admin123`) — **change immediately**.

> **Realtime note:** Vercel serverless cannot host Socket.IO. Realtime is therefore opt-in via the client env `VITE_ENABLE_SOCKETS` (leave unset/false on Vercel); the UI automatically polls the REST API every ~15s instead, so live tracking still updates.

### Option B — Single long-lived Node server (VPS / Render / Railway / Docker)
```bash
npm run build                                  # outputs client/dist
NODE_ENV=production npm --prefix server start   # serves API + client on PORT
```
The server serves the built client and `/uploads` from one origin. Recommended:
- Put it behind a reverse proxy (Nginx/Caddy) with TLS.
- Use PostgreSQL (see Database above).
- Set a strong `JWT_SECRET`, rotate default staff credentials, restrict `CORS_ORIGINS`.
- For persistent uploads either mount a volume for `server/uploads` or use `STORAGE_DRIVER=cloudinary`.

---

## Manual smoke test

With both apps running:

1. Store home loads banners/sections; add a product to cart.
2. Checkout (guest allowed) → order placed → confirmation page.
3. Admin login → Orders → confirm the order → assign a rider.
4. Delivery login → accept → share location → mark picked up / out for delivery / delivered.
5. Customer tracking page shows the timeline and rider marker.
6. Admin → cancel another order and confirm stock is restored in Inventory.

---

## Notes & Limitations

- Seeded product/category/banner images are **real photographs bundled with the repo** (`client/public/images`); attribution lives in [`client/public/images/CREDITS.md`](client/public/images/CREDITS.md). Replace any image via Admin → Products/Homepage or the uploader.
- Online payments, SMS/WhatsApp/email and the Cloudinary driver require credentials to activate.
- Dev OTP is intentionally insecure; disable `OTP_DEV_MODE` and wire a provider for production.
- Socket.IO realtime is unavailable on serverless (Vercel); the client polls instead. Set `VITE_ENABLE_SOCKETS=true` on a long-lived server to enable it.
