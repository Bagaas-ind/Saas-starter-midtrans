import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Layers,
  Receipt,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/CheckoutButton";
import { SignOutButton } from "@/components/SignOutButton";
import type { Plan, PlanTier, Profile, Transaction, TransactionStatus } from "@/types/database";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Paid
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      );
    case "failed":
    case "expired":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          <XCircle className="h-3.5 w-3.5" />
          {status === "expired" ? "Expired" : "Failed"}
        </span>
      );
  }
}

interface DashboardPageProps {
  searchParams: Promise<{ payment?: string; order_id?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profileData }, { data: plansData }, { data: transactionsData }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("plans").select("*").order("price_idr", { ascending: true }),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const profile: Profile = (profileData as Profile | null) ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: user.user_metadata?.full_name ?? "Builder",
    plan_tier: "free",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const plans = (plansData as Plan[] | null) ?? [];
  const transactions = (transactionsData as Transaction[] | null) ?? [];
  const paidPlans = plans.filter((p) => p.price_idr > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              saas-starter
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {profile.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Payment Feedback Banner */}
        {resolvedSearchParams.payment === "success" && (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">
              Payment received! Your subscription tier updates automatically as
              soon as Midtrans confirms the webhook.
            </p>
            {resolvedSearchParams.order_id && (
              <p className="mt-1 font-mono text-xs text-emerald-700">
                Order ID: {resolvedSearchParams.order_id}
              </p>
            )}
          </div>
        )}

        {resolvedSearchParams.payment === "pending" && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">
              Payment is awaiting completion. Complete your Virtual Account or
              QRIS transfer to activate your upgraded plan.
            </p>
          </div>
        )}

        {/* Overview Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back, {profile.full_name || "Builder"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your active subscription plan and billing history.
            </p>
          </div>
        </div>

        {/* Active Subscription & Quick Upgrade Cards */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Active Plan Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Subscription
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase text-indigo-700">
                <Crown className="h-3.5 w-3.5" />
                {profile.plan_tier}
              </span>
            </div>

            <p className="mt-4 text-2xl font-extrabold capitalize text-slate-900">
              {profile.plan_tier} Plan
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {profile.plan_tier === "free"
                ? "You are currently on the Starter Free tier. Upgrade anytime for unlimited projects and priority access."
                : "Your paid tier is active. Thank you for supporting our platform!"}
            </p>

            <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
              Account ID: <span className="font-mono">{profile.id.slice(0, 8)}...</span>
            </div>
          </div>

          {/* Upgrade Options */}
          {paidPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">
                    {plan.name}
                  </span>
                  {plan.is_popular && (
                    <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {formatRupiah(plan.price_idr)}
                </p>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              </div>

              <div className="mt-6">
                <CheckoutButton
                  planId={plan.id as PlanTier}
                  planName={plan.name}
                  priceIdr={plan.price_idr}
                  currentPlan={profile.plan_tier}
                  isAuthenticated={true}
                  variant={plan.is_popular ? "primary" : "outline"}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Transaction History Table */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <Receipt className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Transaction History
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {transactions.length} record{transactions.length === 1 ? "" : "s"}
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <CreditCard className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-900">
                No transactions yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                When you upgrade your plan via Midtrans Snap, your order ID,
                payment method, and fulfillment status will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Order ID</th>
                    <th className="px-6 py-3.5">Plan</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-medium text-slate-900">
                        {tx.order_id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium capitalize text-slate-800">
                        {tx.plan_id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                        {formatRupiah(tx.amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs uppercase text-slate-600">
                        {tx.payment_type || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
