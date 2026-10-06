# Nexus Market

A production-oriented multi-vendor e-commerce marketplace built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma + MongoDB, and Auth.js (NextAuth v5).

> **Status: Phase 1 — foundation.** Scaffold, design system, database schema, authentication/RBAC, base layouts, and payment/storage abstractions are in place. Catalog, cart/checkout, orders, seller & admin tooling arrive in later phases.

> **Temporary brand:** "Nexus Market". Rebrand from a single place: [`src/config/brand.ts`](src/config/brand.ts) + the palette in [`src/app/globals.css`](src/app/globals.css).

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`) |
| Language / UI | TypeScript, Tailwind CSS v4, shadcn/ui (Base UI) |
| Database | MongoDB Atlas via Prisma ORM **v6.19** |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta`) — Credentials + JWT sessions |
| Payments | Provider abstraction: COD (built-in) + Stripe (env-ready) |
| Storage | Provider abstraction: local disk (default), S3 planned |
| Validation | Zod |

**Why Prisma 6?** MongoDB is not yet supported by Prisma 7/8 (official Prisma docs direct MongoDB users to `prisma@6.19`). Do not "upgrade" Prisma without checking MongoDB support.

## Quickstart

```bash
npm install
cp .env.example .env       # then fill DATABASE_URL + generate AUTH_SECRET
npm run db:push            # create collections/indexes in MongoDB
npm run seed               # demo accounts, categories, products
npm run dev                # http://localhost:3000
```

### Seeded demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@nexusmarket.local` | `Password123!` |
| Seller | `seller@nexusmarket.local` | `Password123!` |
| Customer | `customer@nexusmarket.local` | `Password123!` |

(Override with `SEED_*` env vars — see `.env.example`. Change `SEED_PASSWORD` before any real deployment.)

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Regenerate the Prisma client (`src/generated/prisma`) |
| `npm run db:push` | Push schema to MongoDB (MongoDB has no migrations) |
| `npm run db:studio` | Prisma Studio |
| `npm run seed` | Idempotent development seed |

## Project structure

```
prisma/
  schema.prisma          # ~25 models (MongoDB), integer minor-unit money
  seed.ts                # idempotent dev seed
prisma.config.ts         # Prisma config (loads DATABASE_URL)
src/
  app/
    (auth)/              # /login, /register (auth shell)
    (storefront)/        # / , /account (header + footer shell)
    admin/               # /admin — SUPER_ADMIN only
    seller/              # /seller — SELLER (and SUPER_ADMIN)
    api/
      auth/[...nextauth]/ # Auth.js route handlers
      health/             # GET /api/health
      me/                 # GET /api/me (session or 401)
  components/
    ui/                   # shadcn components
    layout/               # site header/footer
    auth/                 # sign-out button
  lib/
    auth/                 # auth config, DAL (requireUser/requireRole), actions
    db/prisma.ts          # Prisma singleton
    payments/             # PaymentProvider: cod + stripe
    storage/              # StorageProvider: local (+ s3 later)
    permissions.ts        # role → permission matrix, homeForRole()
  proxy.ts                # optimistic route protection (Next.js 16 middleware)
  config/brand.ts         # single rebrand point
```

## Auth & RBAC

- **Roles:** `SUPER_ADMIN`, `SELLER`, `CUSTOMER` (Prisma enum `Role`).
- **Sessions:** JWT (30 days) via Auth.js. Login/register are Server Actions (`src/lib/auth/actions.ts`) using `useActionState`.
- **Two layers of protection:**
  1. [`src/proxy.ts`](src/proxy.ts) — *optimistic* checks only (decodes the session cookie, no DB): redirects unauthenticated users away from `/admin`, `/seller`, `/account`, and signed-in users away from `/login`/`/register`.
  2. **DAL** ([`src/lib/auth/dal.ts`](src/lib/auth/dal.ts)) — *secure* checks close to the data: `requireUser()` / `requireRole()` in pages, Server Actions, and route handlers. Proxy is never the only line of defense.
- Permission checks: `can(role, permission)` in [`src/lib/permissions.ts`](src/lib/permissions.ts).

## Conventions

- **Money is integer minor units** (e.g. `1299900` = Rs. 12,999.00). Never floats. Currency: lowercase ISO 4217 (`"pkr"`).
- **IDs** are ObjectId strings (`String @id @default(auto()) @map("_id") @db.ObjectId`).
- **Referential integrity** is enforced in the application layer (`relationMode = "prisma"` semantics) — always scope queries by `userId` / `sellerId` / `shopId`.
- Route-group layouts (`(auth)`, `(storefront)`) use plain `{ children: React.ReactNode }` props; path layouts use `LayoutProps<"/admin">` (generated types).

## Payments & storage

```ts
import { getPaymentProvider, providerForMethod } from "@/lib/payments";

const provider = getPaymentProvider(providerForMethod(order.paymentMethod)); // "cod" | "stripe"
const intent = await provider.createIntent({ orderId, amountMinor, currency: "pkr" });
```

- **COD** works with zero configuration (intent lifecycle: pending → captured on delivery → refunded).
- **Stripe** activates automatically when `STRIPE_SECRET_KEY` is set; webhooks additionally need `STRIPE_WEBHOOK_SECRET` and are verified in `parseWebhook()`.
- **Storage:** `getStorageProvider()` returns the local-disk driver by default (`public/uploads` → `/uploads/<key>`). An S3-compatible driver is planned for a later phase.

## Environment variables

See [`.env.example`](.env.example) for the full documented list: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, Stripe keys, storage settings, seed overrides.

## Roadmap (later phases)

Catalog & search · product detail · cart & checkout · orders/returns/refunds · seller center (products, orders, payouts) · admin console (moderation, finance, settings) · reviews & coupons · notifications · real search & media pipeline.
