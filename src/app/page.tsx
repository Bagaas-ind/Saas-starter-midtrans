import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  Database,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/CheckoutButton";
import type { Plan, PlanTier } from "@/types/database";

const FALLBACK_PLANS: Plan[] = [
  {
    id: "free",
    name: "Starter Free",
    description: "For solo builders validating ideas and testing core workflows.",
    price_idr: 0,
    features: [
      "Up to 3 active projects",
      "Community support",
      "Basic analytics dashboard",
      "Standard API rate limits",
    ],
    is_popular: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "pro",
    name: "Pro Builder",
    description: "Everything you need to launch and monetize your SaaS fast.",
    price_idr: 149000,
    features: [
      "Unlimited active projects",
      "Priority email & chat support",
      "Advanced revenue & usage analytics",
      "Custom webhook integrations",
      "Higher API rate limits",
    ],
    is_popular: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "enterprise",
    name: "Scale Team",
    description: "Dedicated infrastructure and controls for growing teams.",
    price_idr: 499000,
    features: [
      "Everything in Pro Builder",
      "Unlimited team members",
      "99.9% uptime SLA guarantee",
      "Dedicated account engineer",
      "Custom security & audit logs",
    ],
    is_popular: false,
    created_at: new Date().toISOString(),
  },
];

function formatRupiah(amount: number): string {
  if (amount === 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function LandingPage() {
  let isAuthenticated = false;
  let currentPlan: PlanTier | null = null;
  let plans: Plan[] = FALLBACK_PLANS;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_tier")
        .eq("id", user.id)
        .single();

      if (profile?.plan_tier) {
        currentPlan = profile.plan_tier as PlanTier;
      }
    }

    const { data: dbPlans } = await supabase
      .from("plans")
      .select("*")
      .order("price_idr", { ascending: true });

    if (dbPlans && dbPlans.length > 0) {
      plans = dbPlans as Plan[];
    }
  } catch {
    // Graceful fallback when environment variables are not yet configured locally
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              saas-starter
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-900">
              Features
            </a>
            <a href="#architecture" className="transition hover:text-slate-900">
              Stack
            </a>
            <a href="#pricing" className="transition hover:text-slate-900">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Log in
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <span>Start Building</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next.js 15 + Supabase SSR + Midtrans Snap</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                Ship your profitable SaaS in{" "}
                <span className="text-indigo-600">hours, not weeks.</span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                A zero-bloat, production-grade full-stack boilerplate pre-wired
                with Supabase authentication, PostgreSQL Row Level Security, and
                Midtrans Snap payments (QRIS, Virtual Accounts, GoPay &
                ShopeePay).
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href={isAuthenticated ? "/dashboard" : "/login?mode=signup"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
                >
                  <span>
                    {isAuthenticated ? "Go to Your Dashboard" : "Launch Demo App"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="#pricing"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-50 sm:w-auto"
                >
                  <span>Explore Pricing Flow</span>
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>SHA-512 Webhook Verification</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  <span>Strict PostgreSQL RLS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-emerald-600" />
                  <span>100% Type-Safe TypeScript</span>
                </div>
              </div>
              <a
                href="https://github.com/Bagaas-ind/Saas-starter-midtrans#-checklist-sebelum-produksi"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                Security checklist · hardening in progress
              </a>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-base font-semibold uppercase tracking-wider text-indigo-600">
                Production Architecture
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Everything wired together cleanly
              </p>
              <p className="mt-4 text-base text-slate-600">
                Stop rewriting auth callbacks, webhook signature checks, and
                subscription state logic on every new project.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  SSR Auth & Middleware
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Powered by <code>@supabase/ssr</code> with automatic token
                  refreshing and route-level protection for{" "}
                  <code>/dashboard</code>.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  Database & Triggers
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  PostgreSQL schema with automatic profile provisioning triggers
                  on signup and strict Row Level Security policies.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  Midtrans QRIS & VA
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Accept QRIS, BCA/BNI/BRI/Mandiri Virtual Accounts, GoPay, and
                  ShopeePay with webhook idempotency (partial — concurrent protection in progress).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  Zod Runtime Safety
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Every API endpoint and environment configuration is strictly
                  validated at runtime with Zod schemas and clean error states.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Highlight */}
        <section
          id="architecture"
          className="border-y border-slate-200 bg-white py-16"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-slate-900 p-6 text-slate-200 shadow-lg sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  End-to-End Payment & Entitlement Flow
                </span>
                <span className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-300">
                  POST /api/payment/webhook
                </span>
              </div>
              <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-slate-300 sm:text-sm">
{`1. User clicks Upgrade  -> POST /api/payment/create (Validates session & plan via Zod)
2. Server creates order -> Inserts 'pending' row in Supabase transactions table
3. Midtrans Snap Popup  -> User pays via QRIS / Virtual Account / E-Wallet
4. Midtrans Webhook     -> Verifies SHA-512(order_id + status_code + gross_amount + server_key)
5. Atomic Fulfillment (in progress) -> Database RPC updates transaction & plan together`}
              </pre>
            </div>
          </div>
        </section>

        {/* Interactive Pricing Table */}
        <section id="pricing" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-base font-semibold uppercase tracking-wider text-indigo-600">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Test the live Midtrans checkout flow
              </p>
              <p className="mt-4 text-base text-slate-600">
                Sign in and click any paid tier to trigger the Midtrans Snap
                payment modal in Sandbox or Production mode.
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => {
                const isPopular = plan.is_popular;
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl bg-white p-8 shadow-sm transition ${
                      isPopular
                        ? "border-2 border-indigo-600 ring-4 ring-indigo-600/10"
                        : "border border-slate-200"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3.5 right-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {plan.name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                        {formatRupiah(plan.price_idr)}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        / one-time
                      </span>
                    </div>

                    <ul className="mt-8 flex-1 space-y-3.5 text-sm text-slate-600">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 shrink-0 text-indigo-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      <CheckoutButton
                        planId={plan.id}
                        planName={plan.name}
                        priceIdr={plan.price_idr}
                        currentPlan={currentPlan}
                        isAuthenticated={isAuthenticated}
                        variant={isPopular ? "primary" : "outline"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>saas-starter</span>
          </div>
          <p>
            Built with Next.js 15, Supabase & Midtrans. Open-source under MIT
            License.
          </p>
        </div>
      </footer>
    </div>
  );
}
