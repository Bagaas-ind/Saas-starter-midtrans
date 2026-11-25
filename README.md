# SaaS Starter — Midtrans

A practical starting point for building a SaaS application with **Next.js, Supabase, PostgreSQL, and Midtrans Snap**.

Use this project to explore authentication, a protected dashboard, sample subscription plans, and a payment checkout flow — then adapt the code to your own product.

<p align="center">
  <a href="https://saas-starter-midtrans.vercel.app/"><strong>▶ Open Live Demo</strong></a>
</p>

> **Project status: Early development · Sandbox only**
>
> This is a learning and development starter, not a production-ready billing platform. The public demo is for interface preview; payment checkout is disabled and you should not enter sensitive personal information.

---

## What you get

- **Authentication** — sign up and sign in with Supabase Auth.
- **Protected dashboard** — authenticated users can access their dashboard.
- **Plan examples** — Free, Pro, and Enterprise records stored in PostgreSQL.
- **Midtrans Snap** — server-side transaction creation and notification signature verification.
- **Transaction history** — a basic payment history in the dashboard.
- **Database security foundation** — PostgreSQL Row Level Security policies and a trigger that prevents users from changing their own plan tier.
- **Typed configuration** — environment validation with Zod.
- **CI checks** — GitHub Actions runs TypeScript and production-build checks.

### What is not included yet

This starter does not provide recurring automatic billing, a complete subscription lifecycle, invoices, team management, usage metering, or production-grade payment guarantees. These need to be designed and implemented for your product.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19, Tailwind CSS |
| Language | TypeScript |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Payment | Midtrans Snap |
| Validation | Zod |
| CI | GitHub Actions |

---

## Getting started

Follow these steps in order. You will need **Node.js 22 or newer**, npm, Git, and your own Supabase project.

### 1. Download the project

```bash
git clone https://github.com/Bagaas-ind/Saas-starter-midtrans.git
cd Saas-starter-midtrans
npm ci
```

### 2. Create your environment file

Copy the example file:

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

Open `.env.local` and fill in the values from your own provider accounts:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SANDBOX_SERVER_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_SANDBOX_CLIENT_KEY
MIDTRANS_IS_PRODUCTION=false

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Keep `SUPABASE_SERVICE_ROLE_KEY` and `MIDTRANS_SERVER_KEY` private. Never commit `.env.local` or expose server-side secrets in browser code.

### 3. Set up the database

1. Create a project in Supabase.
2. Open its **SQL Editor**.
3. Open `supabase/schema.sql` from this repository.
4. Copy the full SQL file into the SQL Editor and run it.
5. Confirm that the `plans`, `profiles`, and `transactions` tables were created.

The SQL script also configures the signup profile trigger, initial plan records, and Row Level Security policies.

### 4. Configure Supabase authentication

In your Supabase project's **Authentication → URL Configuration** settings:

- Set the local Site URL to `http://localhost:3000`.
- Add `http://localhost:3000/auth/callback` to the allowed redirect URLs.

When you deploy your own instance, add your HTTPS domain and its `/auth/callback` URL too.

### 5. Start the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Try the application

Once the app is running:

1. Open the landing page.
2. Create an account with an email address you control.
3. Confirm your email if email confirmation is enabled in Supabase.
4. Sign in and open the dashboard.
5. Check that your account starts with the Free plan.
6. Configure Midtrans Sandbox before trying a paid plan.

If signup succeeds but no profile appears, check the Supabase Auth user record, the database trigger, and the Supabase logs.

## Test payments with Midtrans Sandbox

**Do not use production payment credentials while developing.**

1. Sign in to your Midtrans dashboard and switch to the **Sandbox** environment.
2. Copy your Sandbox Server Key and Client Key into `.env.local`.
3. Keep `MIDTRANS_IS_PRODUCTION=false`.
4. Configure the Midtrans notification URL as `https://YOUR_PUBLIC_HOST/api/payment/webhook`.
5. For local testing, expose your local app through an HTTPS tunnel. Midtrans cannot send notifications to `localhost`.
6. Restart the development server, sign in, and select a paid plan.
7. Complete the checkout using test payment details from the Midtrans Sandbox Simulator.
8. Wait for the server notification, then refresh the dashboard to inspect the transaction status.

Sandbox transactions are test transactions, not real charges. Never test with real customer payment data.

## How payment processing works

```text
User selects a paid plan
        |
        v
POST /api/payment/create
        |
        +--> Verify signed-in user
        +--> Validate plan and read database records
        +--> Create a Midtrans Snap transaction
        +--> Save a pending transaction
        |
        v
Browser opens Midtrans Snap checkout
        |
        v
Midtrans sends server notification
        |
        v
POST /api/payment/webhook
        |
        +--> Verify notification signature
        +--> Find the matching transaction
        +--> Map payment status
        +--> Update transaction and plan when paid
        |
        v
Supabase PostgreSQL → Dashboard
```

The browser redirect is not proof of payment. This starter uses the server-side Midtrans notification to update the transaction and plan. The webhook still needs stronger amount reconciliation and atomic, concurrency-safe fulfillment before production use.

---

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Start the development server |
| `npx tsc --noEmit` | Check TypeScript types |
| `npm run lint` | Run the configured lint command |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build locally |

Before submitting a change, run:

```bash
npx tsc --noEmit
npm run build
```

## Project structure

```text
.
├── .github/
│   └── workflows/       # CI workflow
├── src/
│   ├── app/
│   │   ├── api/payment/ # Create payment and webhook endpoints
│   │   ├── auth/        # Authentication callback
│   │   ├── dashboard/   # Protected dashboard
│   │   └── ...          # App pages and layouts
│   ├── components/      # Reusable UI components
│   ├── lib/
│   │   ├── supabase/    # Supabase clients
│   │   ├── env.ts       # Environment validation
│   │   └── midtrans.ts  # Midtrans integration
│   ├── middleware.ts
│   └── types/
├── supabase/
│   └── schema.sql      # Database schema and policies
├── .env.example
├── CONTRIBUTING.md
├── SECURITY.md
└── package.json
```

## Before production

The project is **not production-ready**. At minimum, complete and test these items before handling real payments or customer data:

- [x] Prevent users from changing their own `plan_tier` through client-side database access.
- [ ] Reconcile webhook amount, currency, order ID, payment status, and expected plan price with the saved transaction.
- [ ] Make webhook fulfillment atomic and safe against duplicate or simultaneous notifications.
- [ ] Review all Midtrans payment and fraud-status transitions.
- [ ] Add rate limiting, request-size limits, and robust error handling.
- [ ] Review database permissions, RLS policies, and privileged server operations.
- [ ] Add automated unit, integration, and webhook tests.
- [ ] Add monitoring, alerting, backups, and a credential-rotation procedure.
- [ ] Verify HTTPS, callback URLs, privacy requirements, and applicable legal obligations.

Use Sandbox credentials and non-sensitive test data until the checklist is complete. See `SECURITY.md` for the vulnerability-reporting process.

## Contributing

Bug fixes, tests, documentation improvements, accessibility fixes, and useful features are welcome.

1. Create a branch for your change.
2. Make a focused improvement.
3. Run the checks listed above.
4. Open a Pull Request and describe what you changed and how you tested it.

Please read `CONTRIBUTING.md` before submitting a contribution. Report security vulnerabilities privately using the process in `SECURITY.md`.

## License

This project is released under the **MIT License**. See the `LICENSE` file for the full terms. Third-party dependencies and services remain subject to their own licenses, pricing, and terms.

## Disclaimer

Provided “as is”, without warranty. You are responsible for reviewing the code, securing your deployment, complying with provider terms, and thoroughly testing payment behavior before using this project with real customers.
