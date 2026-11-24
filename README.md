# saas-starter

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20RLS-3ecf8e?logo=supabase)](https://supabase.com/)
[![Midtrans](https://img.shields.io/badge/Midtrans-Snap%20API-002855)](https://midtrans.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**A clean, zero-bloat, production-grade SaaS boilerplate built with Next.js 15 (App Router), React 19, Strict TypeScript, Supabase SSR Auth, and Midtrans Snap Payments.**

Stop wiring authentication callbacks, Row Level Security policies, and payment webhook signature checks from scratch. Clone `saas-starter` and ship your monetized SaaS product today.

---

## Why `saas-starter`?

- **Zero Heavy Payment SDK Bloat:** Uses native `fetch` + Basic Auth + Node `crypto` for Midtrans Snap API and cryptographic SHA-512 webhook verification—no outdated or untyped third-party wrappers.
- **Indonesian & Southeast Asian Payment Ready:** Out-of-the-box support for **QRIS**, **Virtual Accounts (BCA, BNI, BRI, Mandiri, Permata)**, **GoPay**, and **ShopeePay** via Midtrans Snap popup.
- **Supabase SSR + Strict RLS:** Cookie-based session refreshing in `src/middleware.ts`, automatic profile creation via PostgreSQL triggers, and strict Row Level Security policies so users only ever access their own data.
- **Idempotent Webhook Fulfillment:** Prevents duplicate plan upgrades if Midtrans retries webhook delivery.
- **Runtime Type Safety with Zod:** Validates environment variables and incoming API/webhook payloads before touching your database.

---

## Architecture & Payment Webhook Flow

```text
+-------------------+        1. Clicks Upgrade         +---------------------------+
|   Next.js Client  | -------------------------------> | POST /api/payment/create  |
|  (Dashboard/Home) |                                  | (Zod + Auth Validation)   |
+-------------------+                                  +---------------------------+
         ^                                                           |
         | 3. Opens Snap Popup                                       | 2. Insert 'pending' tx
         |    (QRIS / VA / E-Wallet)                                 v
+-------------------+                                  +---------------------------+
|   Midtrans Snap   | <----- Requests Snap Token ----- |   Supabase PostgreSQL     |
|  Payment Gateway  |                                  |  (profiles, transactions) |
+-------------------+                                  +---------------------------+
         |                                                           ^
         | 4. Async Payment Notification (POST)                      |
         v                                                           | 6. Upgrade plan_tier
+---------------------------+                                        |    & mark tx 'paid'
| POST /api/payment/webhook | -- 5. Verify SHA-512 Signature --------+
+---------------------------+
```

---

## Project Structure

```text
saas-starter/
├── supabase/
│   └── schema.sql                  # Tables, signup trigger, seed plans, and RLS policies
├── src/
│   ├── app/
│   │   ├── api/payment/
│   │   │   ├── create/route.ts     # Protected endpoint creating Midtrans Snap tokens
│   │   │   └── webhook/route.ts    # Public SHA-512 verified Midtrans webhook handler
│   │   ├── auth/callback/route.ts  # Supabase email/OAuth code exchange route
│   │   ├── dashboard/page.tsx      # Protected user dashboard & billing history
│   │   ├── login/page.tsx          # Unified Sign-In & Sign-Up screen
│   │   ├── globals.css             # Tailwind base styles
│   │   ├── layout.tsx              # Root layout + dynamic Snap.js script loader
│   │   └── page.tsx                # Conversion-focused SaaS landing page
│   ├── components/
│   │   ├── CheckoutButton.tsx      # Client button triggering Midtrans Snap modal
│   │   └── SignOutButton.tsx       # Clean Supabase session sign-out button
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── admin.ts            # Service-role client for webhook fulfillment
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   └── server.ts           # Server Component / Route Handler client
│   │   ├── env.ts                  # Zod environment variable validator
│   │   └── midtrans.ts             # Snap REST client & SHA-512 signature verifier
│   ├── types/
│   │   └── database.ts             # Strict TypeScript interfaces for DB tables
│   └── middleware.ts               # Auth session refresh & /dashboard route guard
├── .env.example                    # Environment variables template
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 5-Minute Quickstart Guide

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/saas-starter.git
cd saas-starter
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials from Supabase and the Midtrans Dashboard:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

MIDTRANS_SERVER_KEY=SB-Mid-server-your-server-key
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-your-client-key
MIDTRANS_IS_PRODUCTION=false

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Initialize Supabase Database

1. Open your **Supabase Project Dashboard** -> **SQL Editor**.
2. Copy the entire contents of `supabase/schema.sql` and click **Run**.
3. This automatically creates `plans`, `profiles`, `transactions`, the `on_auth_user_created` signup trigger, and all Row Level Security policies.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing Webhooks Locally (ngrok / cloudflared)

Midtrans needs a public HTTPS URL to send payment status notifications to `/api/payment/webhook`:

1. Start a tunnel to port `3000`:
   ```bash
   # Using Cloudflare Tunnel (no account required)
   npx cloudflared tunnel --url http://localhost:3000

   # Or using ngrok
   ngrok http 3000
   ```
2. Copy the generated HTTPS URL (e.g., `https://random-subdomain.trycloudflare.com`).
3. Open **Midtrans Dashboard (Sandbox)** -> **Settings** -> **Configuration**.
4. Set **Payment Notification URL** to:
   ```text
   https://random-subdomain.trycloudflare.com/api/payment/webhook
   ```
5. Upgrade a plan in your app, complete the payment using the [Midtrans Sandbox Payment Simulator](https://simulator.sandbox.midtrans.com/), and refresh `/dashboard` to see your upgraded tier and `paid` status.

---

## Contributing & Support

Contributions, issues, and feature requests are welcome!
If this starter kit saved you setup time, consider giving the repository a **Star** so more builders can discover it.

## License

Distributed under the [MIT License](./LICENSE).
