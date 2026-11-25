<!--
  SaaS Starter — Midtrans
  A clean, visual README for the project.
-->

<div align="center">

# ⚡ SaaS Starter — Midtrans

### A modern SaaS starter built with Next.js, Supabase, PostgreSQL, and Midtrans.

<p>
  <a href="https://saas-starter-midtrans.vercel.app/"><strong>🌐 Live Demo</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Bagaas-ind/Saas-starter-midtrans/issues">🐛 Report a Bug</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Bagaas-ind/Saas-starter-midtrans/pulls">🤝 Contribute</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-UI-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Midtrans-Snap-00A5E5" alt="Midtrans Snap">
</p>

<p>
  <img src="https://img.shields.io/badge/Status-Early_Development-orange" alt="Early development">
  <img src="https://img.shields.io/badge/Payments-Sandbox_Only-yellow" alt="Sandbox only">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

</div>

---

## ✨ Overview

**SaaS Starter — Midtrans** is a starter project for developers who want to build a subscription-based web application. It brings together authentication, a protected dashboard, subscription plan examples, and a Midtrans Snap checkout flow.

Instead of starting from an empty folder, use this as a foundation and customize it for your own SaaS idea.

> [!WARNING]
> **Early development — not production-ready.** Payment integration is intended for the Midtrans Sandbox only. The live demo is for interface preview; checkout may be disabled. Do not enter sensitive or real payment information.

## 🧰 Built with

<div align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,supabase,postgres&theme=dark" alt="Technology stack icons">
  </a>
</div>

| Technology | Role |
| --- | --- |
| Next.js 15 | Full-stack React framework and App Router |
| React 19 | User interface |
| TypeScript | Type-safe application code |
| Tailwind CSS | Styling |
| Supabase Auth | User authentication |
| Supabase PostgreSQL | Database and Row Level Security |
| Midtrans Snap | Payment checkout |
| Zod | Environment validation |

## 🚀 Features

- 🔐 **Authentication** — sign up and sign in with Supabase Auth.
- 📊 **Protected dashboard** — dashboard pages for authenticated users.
- 💳 **Payment checkout** — Midtrans Snap transaction creation.
- 📦 **Plan examples** — Free, Pro, and Enterprise plan records.
- 🧾 **Transaction history** — basic payment history in the dashboard.
- 🛡️ **Database safeguards** — Row Level Security and a trigger preventing users from changing their own plan tier.
- ⚙️ **Validated configuration** — environment variables validated with Zod.
- 🔄 **Continuous integration** — GitHub Actions checks TypeScript and production builds.

### Not included yet

This is a starter, not a complete subscription platform. Automatic recurring billing, invoices, team management, usage metering, and a full subscription lifecycle still need to be implemented.

---

## ⚡ Quick start

### Requirements

Make sure you have:

- [Node.js 22 or newer](https://nodejs.org/)
- npm
- Git
- A [Supabase](https://supabase.com/) project

### 1. Clone the repository

```bash
git clone https://github.com/Bagaas-ind/Saas-starter-midtrans.git
cd Saas-starter-midtrans
npm ci
```

### 2. Configure environment variables

Create your local environment file:

**Windows PowerShell**
```powershell
Copy-Item .env.example .env.local
```

**Windows CMD**
```cmd
copy .env.example .env.local
```

**macOS / Linux**
```bash
cp .env.example .env.local
```

Fill in `.env.local` with your own credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SANDBOX_SERVER_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_SANDBOX_CLIENT_KEY
MIDTRANS_IS_PRODUCTION=false

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> 🔒 Never commit `.env.local`. Keep `SUPABASE_SERVICE_ROLE_KEY` and `MIDTRANS_SERVER_KEY` private.

### 3. Prepare Supabase

1. Create a project in Supabase.
2. Open **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` in this repository.
4. Copy the complete SQL file into the SQL Editor and run it.
5. Confirm that the `plans`, `profiles`, and `transactions` tables exist.

The schema also sets up the signup profile trigger, initial plans, and Row Level Security policies.

### 4. Configure authentication URLs

In **Supabase → Authentication → URL Configuration**:

- Set the Site URL to `http://localhost:3000`.
- Add `http://localhost:3000/auth/callback` to the allowed redirect URLs.

### 5. Run the development server

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## 🧪 Try it locally

1. Open the application.
2. Register with an email address you control.
3. Confirm your email if confirmation is enabled in Supabase.
4. Sign in and open the dashboard.
5. Check that the account starts on the Free plan.
6. Configure Midtrans Sandbox before testing a paid plan.

If a profile is not created after signup, inspect the Supabase Auth user, database trigger, and Supabase logs.

## 💸 Test payments with Midtrans Sandbox

**Use Sandbox credentials only. Do not use real customer payment data.**

1. Open your Midtrans dashboard and switch to **Sandbox**.
2. Copy the Sandbox Server Key and Client Key into `.env.local`.
3. Keep `MIDTRANS_IS_PRODUCTION=false`.
4. Set the notification URL to `https://YOUR_PUBLIC_HOST/api/payment/webhook`.
5. For local testing, expose your app through an HTTPS tunnel. Midtrans cannot call `localhost`.
6. Restart the development server and select a paid plan.
7. Complete checkout with test details from the Midtrans Sandbox Simulator.
8. Check the dashboard for the updated transaction status.

### Payment flow

```text
┌────────────────────┐
│ User selects a plan│
└─────────┬──────────┘
          ▼
┌────────────────────────────┐
│ POST /api/payment/create   │
│ Validate user and plan     │
│ Create Snap transaction   │
│ Save pending transaction  │
└─────────┬──────────────────┘
          ▼
┌────────────────────────────┐
│    Midtrans Snap Checkout  │
└─────────┬──────────────────┘
          ▼
┌────────────────────────────┐
│ POST /api/payment/webhook  │
│ Verify notification        │
│ Update transaction status  │
└─────────┬──────────────────┘
          ▼
┌────────────────────────────┐
│ Supabase → User Dashboard  │
└────────────────────────────┘
```

The browser redirect is not proof of payment. The server-side notification is used to update the transaction. Before production, webhook handling still needs stronger amount reconciliation and atomic, concurrency-safe fulfillment.

---

## 📁 Project structure

```text
.
├── .github/
│   └── workflows/       # CI workflow
├── src/
│   ├── app/
│   │   ├── api/payment/ # Payment creation and webhook
│   │   ├── auth/        # Authentication callback
│   │   └── dashboard/   # Protected dashboard
│   ├── components/      # Reusable UI components
│   ├── lib/
│   │   ├── supabase/    # Supabase clients
│   │   ├── env.ts       # Environment validation
│   │   └── midtrans.ts  # Midtrans integration
│   ├── middleware.ts
│   └── types/
├── supabase/
│   └── schema.sql       # Database schema and policies
├── .env.example
├── CONTRIBUTING.md
├── SECURITY.md
└── package.json
```

## 🛠️ Available commands

| Command | Description |
| --- | --- |
| `npm ci` | Install dependencies |
| `npm run dev` | Start development server |
| `npx tsc --noEmit` | Check TypeScript types |
| `npm run lint` | Run lint command |
| `npm run build` | Build for production |
| `npm run start` | Run production build locally |

Before opening a Pull Request, run:

```bash
npx tsc --noEmit
npm run build
```

## 🔐 Production checklist

Do not deploy this starter to handle real payments until the relevant security and payment work is complete.

- [x] Prevent users from changing their own `plan_tier` through client-side database access.
- [ ] Reconcile webhook amount, currency, order ID, status, and expected plan price.
- [ ] Make webhook fulfillment atomic and safe against duplicate notifications.
- [ ] Review Midtrans payment and fraud-status transitions.
- [ ] Add rate limiting, request-size limits, and robust error handling.
- [ ] Review database permissions, RLS policies, and privileged server operations.
- [ ] Add automated unit, integration, and webhook tests.
- [ ] Add monitoring, alerting, backups, and credential rotation.
- [ ] Verify HTTPS, callback URLs, privacy requirements, and applicable legal obligations.

See [SECURITY.md](SECURITY.md) for the vulnerability-reporting process.

## 🤝 Contributing

Contributions are welcome — bug fixes, tests, documentation, accessibility improvements, and useful features.

1. Create a branch for your change.
2. Make a focused improvement.
3. Run the checks listed above.
4. Open a Pull Request with a clear description and test results.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

## 📄 License

Released under the [MIT License](LICENSE).

---

<div align="center">

**Built as a starting point. Make it yours.** ⚡

<sub>Provided “as is”, without warranty. Review, secure, and test the application before using it with real customers.</sub>

</div>
