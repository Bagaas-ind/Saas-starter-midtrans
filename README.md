# SaaS Starter Midtrans

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Midtrans](https://img.shields.io/badge/Midtrans-Snap-002855)](https://midtrans.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An open-source starting point for building subscription-based SaaS products with **Next.js 15, React 19, TypeScript, Supabase, PostgreSQL, and Midtrans Snap**.

Includes an authentication flow, protected dashboard, plan data, payment creation, and a Midtrans notification endpoint. Use it as a foundation and adapt the product logic to your own application.

> **Project status: Early development.** The payment integration is intended for Midtrans Sandbox testing. Review the security notes and complete the production-readiness checklist before accepting real payments. This repository is not a certified or production-ready billing platform.

## Features

- Next.js App Router with React 19 and TypeScript.
- Supabase Auth using `@supabase/ssr` and cookie-based sessions.
- PostgreSQL schema for plans, user profiles, and transactions.
- Row Level Security policies for user-scoped profile and transaction reads.
- Midtrans Snap token creation from a server-side route.
- SHA-512 signature verification for Midtrans payment notifications.
- Zod validation for environment variables and request payloads.
- Starter landing page, sign-in/sign-up screen, and protected dashboard.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19 |
| Language | TypeScript |
| Authentication & database | Supabase / PostgreSQL |
| Payment gateway | Midtrans Snap |
| Validation | Zod |
| Styling | Tailwind CSS |

## Getting started

### Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- A Midtrans account (Sandbox is sufficient for development)

### 1. Clone the repository

```bash
git clone https://github.com/Bagaas-ind/Saas-starter-midtrans.git
cd Saas-starter-midtrans
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from your Supabase and Midtrans dashboards.

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service role key |
| `MIDTRANS_SERVER_KEY` | Server-only Midtrans server key |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Midtrans client key used by Snap.js |
| `MIDTRANS_IS_PRODUCTION` | `false` for Sandbox; `true` for production |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the application |

Never commit `.env.local`, service-role keys, Midtrans server keys, or real credentials.

### 3. Set up Supabase

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Run the contents of [`supabase/schema.sql`](./supabase/schema.sql).
4. Review the RLS policies for your application's requirements before deploying.

The current schema creates three application tables: `plans`, `profiles`, and `transactions`. A signup trigger creates a profile for new users.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Midtrans Sandbox setup

1. Keep `MIDTRANS_IS_PRODUCTION=false`.
2. Use Sandbox server and client keys in `.env.local`.
3. Configure the Payment Notification URL in the Midtrans Sandbox dashboard to point to:

```text
https://YOUR_PUBLIC_HOST/api/payment/webhook
```

4. For local testing, expose port 3000 with a secure tunnel such as Cloudflare Tunnel or ngrok.
5. Complete a test payment using the [Midtrans Sandbox Simulator](https://simulator.sandbox.midtrans.com/).

Do not switch to production keys until the production-readiness checklist below has been completed and tested.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run Next.js ESLint checks |

## Project structure

```text
src/
├── app/
│   ├── api/payment/
│   │   ├── create/route.ts
│   │   └── webhook/route.ts
│   ├── auth/callback/route.ts
│   ├── dashboard/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
│   ├── supabase/
│   ├── env.ts
│   └── midtrans.ts
├── middleware.ts
└── types/
supabase/
└── schema.sql
```

## Security and production-readiness

Before production use, review and test at least the following:

- Restrict profile updates so authenticated users cannot change privileged fields such as `plan_tier` directly.
- Verify the webhook signature and reconcile `order_id`, transaction amount, currency, and expected payment status against the stored transaction.
- Make payment fulfillment atomic and safe against concurrent or repeated notifications.
- Add request size limits, rate limiting, robust error handling, and monitoring to public API routes.
- Keep service-role and Midtrans server keys server-side only.
- Test payment states including pending, settlement, capture, deny, cancel, and expire.
- Configure HTTPS, trusted callback URLs, backups, and production secrets.
- Review Supabase RLS policies and database privileges with a least-privilege approach.

The current webhook includes signature verification and a basic already-paid check. That check alone should not be treated as a guarantee of atomic idempotency under concurrent webhook delivery.

See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Roadmap

- [ ] Harden profile RLS and privileged subscription updates.
- [ ] Add a dedicated subscriptions model and payment event history.
- [ ] Make webhook fulfillment atomic and fully idempotent.
- [ ] Add automated unit and integration tests.
- [ ] Add API rate limiting and request-size protections.
- [ ] Expand setup, deployment, and troubleshooting documentation.

## Contributing

Contributions, bug reports, and feature requests are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

This project is licensed under the [MIT License](./LICENSE).
