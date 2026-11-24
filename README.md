# SaaS Starter Midtrans

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Midtrans](https://img.shields.io/badge/Midtrans-Snap-002855)](https://midtrans.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://saas-starter-midtrans.vercel.app/)

**Live Demo:** https://saas-starter-midtrans.vercel.app/  
**Source Code:** https://github.com/Bagaas-ind/Saas-starter-midtrans

## Application screenshots

The following screenshots show the deployed application's landing page, architecture/features section, and pricing plans.

### Landing page

![SaaS Starter Midtrans landing page](./docs/screenshots/homepage.jpg)

### Architecture and features

![SaaS Starter Midtrans architecture and features](./docs/screenshots/architecture.jpg)

### Pricing plans

![SaaS Starter Midtrans pricing plans](./docs/screenshots/pricing.jpg)

[Open the live demo](https://saas-starter-midtrans.vercel.app/)

**An open-source starter template for developers who want to build and customize a SaaS application with authentication, a user dashboard, subscription-plan examples, and Midtrans Snap payment integration.**

Built with Next.js 15, React 19, TypeScript, Supabase, PostgreSQL, and Midtrans.

> **Project maturity: early development / Sandbox-oriented.** This repository is a learning and development foundation, not a finished SaaS product or production-certified billing system. Review the security limitations and complete the production checklist before using real customer data or accepting live payments.

---

## Table of contents

- [Live demo](#live-demo)
- [Application screenshots](#application-screenshots)
- [What is this project?](#what-is-this-project)
- [What you get](#what-you-get)
- [How the application works](#how-the-application-works)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Run the application](#run-the-application)
- [Try the application](#try-the-application)
- [Midtrans Sandbox setup](#midtrans-sandbox-setup)
- [Developer workflow](#developer-workflow)
- [Project structure](#project-structure)
- [Database overview](#database-overview)
- [Available commands](#available-commands)
- [Deployment notes](#deployment-notes)
- [Security limitations and production checklist](#security-limitations-and-production-checklist)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License and open-source terms](#license-and-open-source-terms)
- [Disclaimer](#disclaimer)

## Live demo

The application is deployed on Vercel and can be opened here:

**https://saas-starter-midtrans.vercel.app/**

The live deployment is intended for preview and evaluation. You can explore the public pages and try the authentication flow using your own test account. The deployment is connected to the project owner's Supabase environment, so do not enter sensitive personal information or use it as a production service.

**Payment status:** Midtrans is not configured with real Sandbox or Production credentials in the current demo deployment. Placeholder values are used for configuration only, so checkout and payment processing are not available. Do not attempt real payments. To test payments locally, configure your own Midtrans Sandbox Server Key and Client Key as described in [Midtrans Sandbox setup](#midtrans-sandbox-setup).

## What is this project?

SaaS Starter Midtrans is a **starter kit**, not a ready-made business application. It gives you a small working foundation that you can adapt into your own SaaS product.

For example, you can use it as a starting point for:

- A membership application with Free and Pro access.
- A digital product platform.
- A small business dashboard.
- A subscription-based web application.
- An Indonesian SaaS prototype that needs to experiment with Midtrans checkout.

You are expected to replace the sample branding, plans, prices, page content, business rules, and database fields with the needs of your own product.

### What this project does not provide yet

This repository does not currently include a complete subscription lifecycle, automatic recurring billing, team management, usage metering, invoice generation, admin panel, or production-grade billing guarantees. Those are possible extensions, not existing features.

## What you get

- Next.js App Router application using React and TypeScript.
- Sign-up and sign-in using Supabase Auth.
- Cookie-based Supabase server sessions.
- A protected `/dashboard` page.
- Sample Free, Pro, and Enterprise plan records.
- PostgreSQL schema and Row Level Security (RLS) policies.
- Server-side creation of Midtrans Snap transactions.
- Midtrans notification signature verification.
- A sample transaction history in the dashboard.
- Environment-variable validation using Zod.
- GitHub Actions workflow for TypeScript and production-build checks.

## How the application works

### 1. Authentication flow

1. A visitor opens the landing page.
2. The visitor selects **Sign In** or **Create Account**.
3. Supabase Auth verifies the credentials and manages the session.
4. The database trigger creates a profile for a newly registered user.
5. Authenticated users can open `/dashboard`; unauthenticated visitors are redirected to `/login`.

### 2. Payment flow

The current implementation follows this simplified flow:

```text
User / Browser
    |
    | Selects a paid plan
    v
POST /api/payment/create
    |
    | Verify signed-in user
    | Validate plan ID
    | Read plan and profile from Supabase
    | Request a Snap transaction from Midtrans
    | Save a pending transaction
    v
Return Snap token to browser
    |
    | Open Midtrans Snap checkout
    v
Customer completes / leaves payment
    |
    | Midtrans sends server notification
    v
POST /api/payment/webhook
    |
    | Validate payload and SHA-512 signature
    | Find transaction by order_id
    | Map payment status
    | Update transaction and (on paid) profile plan
    v
Supabase PostgreSQL
    |
    v
Dashboard displays plan and transaction status
```

**Important:** the browser's success or pending callback is only a user-interface signal. The server-side Midtrans notification is the source used by this starter to update the transaction and plan. Do not grant paid access based only on a browser redirect.

The current webhook has a basic duplicate-paid guard, but it is **not yet a fully atomic, concurrency-safe idempotent fulfillment system**. It also needs stronger reconciliation against the stored transaction amount and additional production hardening. See [Security limitations and production checklist](#security-limitations-and-production-checklist).

## Technology stack

| Area | Technology |
| --- | --- |
| Web framework | Next.js 15 App Router |
| UI library | React 19 |
| Language | TypeScript |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Database access | Supabase JS and Supabase SSR |
| Payment | Midtrans Snap |
| Validation | Zod |
| Styling | Tailwind CSS |
| CI | GitHub Actions |

## Requirements

Install these before starting:

- **Node.js 22 LTS or newer** (the repository CI uses Node.js 22).
- npm (included with Node.js).
- Git.
- A Supabase project for authentication and PostgreSQL.
- A Midtrans account. Sandbox credentials are sufficient for local payment testing.

Check your installed versions:

```bash
node --version
npm --version
git --version
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Bagaas-ind/Saas-starter-midtrans.git
cd Saas-starter-midtrans
```

### 2. Install dependencies

```bash
npm ci
```

Use `npm ci` for a reproducible install from the committed lockfile. If you intentionally change dependencies, use `npm install` and commit the updated `package-lock.json`.

### 3. Create your local environment file

**Windows Command Prompt (CMD):**

```cmd
copy .env.example .env.local
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

Open `.env.local` and replace the example values with your own credentials. See [Environment variables](#environment-variables).

## Environment variables

The project reads configuration from `.env.local` while developing locally.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key used by the client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase service role key |
| `MIDTRANS_SERVER_KEY` | Yes | Server-only Midtrans server key |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Yes | Midtrans client key used by Snap.js |
| `MIDTRANS_IS_PRODUCTION` | Yes | `false` for Sandbox; `true` for live environment |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of this app, e.g. `http://localhost:3000` |

Example for local Sandbox development:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SANDBOX_SERVER_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_SANDBOX_CLIENT_KEY
MIDTRANS_IS_PRODUCTION=false

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

These are placeholders. Get the actual values from your own provider dashboards.

**Secret handling rules:**

- Never commit `.env.local`, real API keys, service-role keys, or payment credentials.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `MIDTRANS_SERVER_KEY` in browser code.
- Only variables prefixed with `NEXT_PUBLIC_` are intended to be exposed to the browser.
- If a secret is accidentally pushed to GitHub, revoke/rotate it immediately. Deleting the commit or file is not enough.

## Supabase setup

### 1. Create a Supabase project

1. Open [Supabase](https://supabase.com/) and create a project.
2. Open **Project Settings → API** (or the project's API keys section).
3. Copy the project URL and anon/publishable key into `.env.local`.
4. Copy the service-role key into `SUPABASE_SERVICE_ROLE_KEY`. Keep it server-side only.

### 2. Create the database schema

1. Open your Supabase project.
2. Select **SQL Editor**.
3. Open this repository's `supabase/schema.sql`.
4. Copy the complete SQL script into the editor.
5. Run it and confirm the tables and policies are created.

The starter schema creates:

| Table | Purpose |
| --- | --- |
| `plans` | Sample Free, Pro, and Enterprise plan definitions |
| `profiles` | User profile and current plan tier |
| `transactions` | Payment order, amount, plan, and status |

It also creates a signup trigger to create a profile when a new auth user is registered, plus initial plan records and RLS policies.

### 3. Configure authentication URLs

In Supabase **Authentication → URL Configuration**:

- Set the local Site URL to `http://localhost:3000` during local development.
- Add the callback URL `http://localhost:3000/auth/callback` to the allowed redirect URLs.
- When deploying, add your real HTTPS domain and its callback URL too.

Supabase dashboard labels may change over time; use the equivalent Site URL and Redirect URLs settings if the menu has moved.

## Run the application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production-mode local check:

```bash
npm run build
npm run start
```

## Try the application

1. Open the landing page.
2. Create an account using an email address you control.
3. If email confirmation is enabled in Supabase, open the confirmation email and follow its link.
4. Sign in and open the dashboard.
5. Confirm the account starts on the Free plan.
6. Configure Midtrans Sandbox before testing a paid plan.
7. Select a paid plan and complete a Sandbox checkout.
8. Check the dashboard transaction history after Midtrans sends its notification.

If the profile is not created after signup, inspect the Supabase Auth user record, database trigger, and Supabase logs.

## Midtrans Sandbox setup

Do not use live payment credentials for initial development.

### 1. Get Sandbox credentials

1. Sign in to the [Midtrans Dashboard](https://dashboard.midtrans.com/).
2. Switch to the **Sandbox** environment.
3. Open the Access Keys / API credentials section.
4. Copy the Sandbox Server Key and Client Key into `.env.local`.
5. Ensure `MIDTRANS_IS_PRODUCTION=false`.

### 2. Configure the notification URL

Midtrans must be able to reach your webhook endpoint over HTTPS.

For a deployed development environment, use:

```text
https://YOUR_PUBLIC_DOMAIN/api/payment/webhook
```

For local testing, expose port 3000 using a secure tunnel such as [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or [ngrok](https://ngrok.com/). Use the HTTPS tunnel URL in the Midtrans Sandbox notification settings:

```text
https://YOUR_TUNNEL_HOST/api/payment/webhook
```

Do not use `localhost` as the notification URL; Midtrans cannot reach your computer through that address.

### 3. Make a test payment

1. Start the app with `npm run dev`.
2. Open the public tunnel URL in a browser if you are testing a local webhook.
3. Sign in and select a paid plan.
4. Complete the checkout using the payment details provided by the [Midtrans Sandbox Simulator](https://simulator.sandbox.midtrans.com/).
5. Wait for Midtrans to send a notification to `/api/payment/webhook`.
6. Refresh the dashboard and inspect the transaction status.

Use only Sandbox test payment methods and data in this stage. Sandbox transactions are not real charges.

## Developer workflow

This section describes the recommended day-to-day workflow for anyone extending this starter kit.

### A. Build a feature locally

1. Create an issue or write down the feature and acceptance criteria.
2. Start from an up-to-date `main` branch.
3. Create a focused feature branch.
4. Install dependencies and configure a local `.env.local`.
5. Make a small, focused change.
6. Run TypeScript and production-build checks.
7. Test the relevant user flow manually, especially when changing authentication or payment code.
8. Commit your changes with a descriptive message.
9. Push your branch and open a Pull Request.
10. Review the CI checks and request review before merging.

Example Git commands:

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name

# Make your changes, then verify:
npx tsc --noEmit
npm run build

git add .
git commit -m "feat: describe your feature"
git push -u origin feat/your-feature-name
```

### B. Pull Request checklist

Before asking for review:

- [ ] The change has a clear purpose and scope.
- [ ] No secrets, private customer data, or real payment details are included.
- [ ] TypeScript check passes.
- [ ] Production build passes.
- [ ] Relevant manual tests are described.
- [ ] Database/schema changes are documented.
- [ ] README and `.env.example` are updated when needed.
- [ ] CI checks are green.

### C. What GitHub Actions checks

The workflow in `.github/workflows/ci.yml` runs on pushes to the configured development branches and on pull requests targeting `main`.

It currently:
1. Checks out the repository.
2. Sets up Node.js 22.
3. Installs dependencies with `npm ci`.
4. Runs `npx tsc --noEmit`.
5. Runs `npm run build`.

The CI environment uses placeholder configuration values. It does not connect to your Supabase or Midtrans account, perform a real payment, or replace manual integration testing.

## Project structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── payment/
│   │   │       ├── create/route.ts
│   │   │       └── webhook/route.ts
│   │   ├── auth/
│   │   │   └── callback/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── CheckoutButton.tsx
│   │   └── SignOutButton.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── admin.ts
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── env.ts
│   │   └── midtrans.ts
│   ├── middleware.ts
│   └── types/
│       └── database.ts
├── supabase/
│   └── schema.sql
├── .env.example
├── CONTRIBUTING.md
├── LICENSE
├── package.json
└── README.md
```

## Database overview

The current database is intentionally small. It is a starting schema, not a complete subscription platform.

- `plans`: sample plan catalog and IDR prices.
- `profiles`: user profile and a `plan_tier` field.
- `transactions`: payment orders and their current status.

The project does not yet have dedicated `subscriptions` or `payment_events` tables. Add these when implementing subscription periods, renewals, payment-event audit trails, or more advanced billing behavior. Create and document migrations carefully rather than adding tables without a clear use case.

## Available commands

| Command | Description |
| --- | --- |
| `npm ci` | Install exact dependencies from package-lock |
| `npm run dev` | Start the local development server |
| `npx tsc --noEmit` | Check TypeScript types |
| `npm run lint` | Run the configured Next.js lint command |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production build |

## Deployment notes

### Current hosted demo

- **Platform:** Vercel
- **Live URL:** https://saas-starter-midtrans.vercel.app/
- **Source repository:** https://github.com/Bagaas-ind/Saas-starter-midtrans
- **Deployment type:** Vercel Production deployment
- **Payment integration:** Not active in the public demo; Midtrans credentials are placeholders.

### Deploy your own instance

You can deploy the Next.js app to Vercel or another Node.js-compatible hosting provider and use your own hosted Supabase project. Before doing so:

1. Configure all environment variables in the hosting provider's secret/environment settings.
2. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS domain.
3. Add the production domain and `/auth/callback` to Supabase allowed redirect URLs.
4. Configure the Midtrans notification URL to the production `/api/payment/webhook` endpoint.
5. Use the matching Midtrans production keys and set `MIDTRANS_IS_PRODUCTION=true` only after the security checklist is complete.
6. Run a controlled end-to-end test and monitor server, database, and payment-provider logs.

For Vercel, import this GitHub repository as a Next.js project, set the environment variables in **Project Settings → Environment Variables**, and deploy. Set `NEXT_PUBLIC_APP_URL` to the exact deployed domain, then add that domain and its `/auth/callback` URL to Supabase Authentication → URL Configuration. Redeploy after changing environment variables. Never copy the project owner's credentials; use your own Supabase and Midtrans accounts.

Hosting, database, and payment-provider accounts may have their own pricing, usage limits, and terms. This repository does not include hosting or provider credits.

## Security limitations and production checklist

**Do not treat the current implementation as production-ready.** Before processing real payments or storing real customer data, address and independently test at least these items:

- [ ] Restrict profile updates. The current RLS update policy allows a user to update their own profile row and does not explicitly prevent changing privileged fields such as `plan_tier`.
- [ ] Reconcile webhook `gross_amount`, `order_id`, currency, transaction status, and expected plan amount against the saved transaction before fulfillment.
- [ ] Make webhook processing atomic and safe against simultaneous or repeated notifications (for example, a database transaction/RPC with appropriate constraints).
- [ ] Review all payment status transitions and fraud-status handling against the current Midtrans documentation.
- [ ] Add rate limiting, request-size limits, robust malformed-request handling, and safe error responses.
- [ ] Ensure service-role and payment secrets are never exposed to the browser or logs.
- [ ] Review RLS policies, database grants, and privileged server operations using least privilege.
- [ ] Add automated unit, integration, and webhook tests.
- [ ] Add monitoring, alerting, backups, and a documented incident/credential-rotation process.
- [ ] Verify HTTPS, callback URLs, privacy requirements, and applicable legal/tax obligations.

Until these items are addressed, use Sandbox credentials and non-sensitive test data only. Read [SECURITY.md](./SECURITY.md) for the vulnerability-reporting process.

## Roadmap

- [ ] Harden profile RLS and privileged plan changes.
- [ ] Validate webhook amounts and transaction details against database records.
- [ ] Implement atomic, concurrency-safe webhook fulfillment.
- [ ] Add subscription lifecycle and payment-event history.
- [ ] Add rate limiting and request-size protections.
- [ ] Add automated unit and integration tests.
- [ ] Improve deployment, monitoring, and troubleshooting guides.

## Contributing

Contributions are welcome: bug fixes, documentation improvements, tests, accessibility improvements, and new features.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request. For security vulnerabilities, follow [SECURITY.md](./SECURITY.md) and avoid posting exploitable details publicly.

## License and open-source terms

This repository's original source code and documentation are distributed under the **MIT License**. You may use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the project, subject to the license conditions. See the complete [LICENSE](./LICENSE) file.

To keep the project transparent and reusable:

- Keep the MIT copyright and license notice with copies or substantial portions of the project.
- Document material changes when redistributing modified versions.
- Check the licenses and terms of every third-party dependency and service you add.
- Do not commit credentials, personal data, or proprietary assets that you do not have permission to publish.

**What “open source” means here:** the repository source is publicly available under MIT. Supabase and Midtrans are external services with their own products, pricing, terms, and account requirements. Using this starter does not make those services free, self-hosted, or open source. The app's dependencies are third-party projects and retain their own licenses.

## Disclaimer

This project is provided “as is”, without warranty of any kind, under the terms of the MIT License. You are responsible for reviewing the code, securing your deployment, complying with provider terms, and testing payment behavior before use.
