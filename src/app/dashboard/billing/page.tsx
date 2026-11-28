import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/CheckoutButton";
import { getUserEntitlements } from "@/lib/subscription";
import type { PlanTier, Transaction } from "@/types/database";

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
function Badge({ status }: { status: string }) {
 const styles: Record<string,string> = { paid:"bg-emerald-50 text-emerald-700", pending:"bg-amber-50 text-amber-700", failed:"bg-rose-50 text-rose-700", expired:"bg-slate-100 text-slate-600" };
 return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

export default async function BillingPage() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/login");
 const [entitlements, profileResult, plansResult, txResult] = await Promise.all([
  getUserEntitlements(),
  supabase.from("profiles").select("plan_tier").eq("id", user.id).maybeSingle(),
  supabase.from("plans").select("id,name,description,price_idr,is_popular").order("price_idr"),
  supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
 ]);
 const transactions = (txResult.data ?? []) as Transaction[];
 const plans = plansResult.data ?? [];
 const currentTier = entitlements.effectiveTier;
 const profileTier = (profileResult.data?.plan_tier ?? "free") as PlanTier;
 return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
  <div className="mx-auto max-w-6xl">
   <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
   <div className="mt-6"><h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing & subscription</h1><p className="mt-2 text-sm text-slate-600">Manage your plan and review your payment history.</p></div>
   <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
     <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current effective plan</p><h2 className="mt-2 text-2xl font-extrabold capitalize text-slate-900">{currentTier} plan</h2><p className="mt-1 text-sm text-slate-600">Subscription: {entitlements.subscriptionStatus}</p></div>
     <span className={`rounded-full px-3 py-1 text-xs font-bold ${entitlements.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{entitlements.isActive ? "Active" : "Inactive / expired"}</span>
    </div>
    <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600"><CalendarClock className="h-4 w-4" />{entitlements.currentPeriodEnd ? `Current period ends ${date(entitlements.currentPeriodEnd)}` : "No paid subscription period is active."}</div>
    {profileTier !== currentTier && <p className="mt-2 text-xs text-amber-700">Your stored plan has expired; feature access is downgraded to Free automatically.</p>}
   </section>
   <section className="mt-8"><h2 className="text-lg font-bold text-slate-900">Upgrade or renew</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
    {plans.filter(p => p.price_idr > 0).map(plan => <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex justify-between gap-2"><h3 className="font-bold text-slate-900">{plan.name}</h3>{plan.is_popular && <span className="text-xs font-semibold text-indigo-600">Popular</span>}</div><p className="mt-3 text-2xl font-extrabold text-slate-900">{money(plan.price_idr)}<span className="text-sm font-normal text-slate-500"> / 30 days</span></p><p className="mt-2 text-sm text-slate-600">{plan.description}</p><div className="mt-5"><CheckoutButton planId={plan.id as PlanTier} planName={plan.name} priceIdr={plan.price_idr} currentPlan={profileTier} isAuthenticated={true} variant={plan.is_popular ? "primary" : "outline"} /></div></article>)}
   </div></section>
   <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5"><CreditCard className="h-5 w-5 text-indigo-600" /><h2 className="font-bold text-slate-900">Transaction history</h2></div>
    {transactions.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-500">No transactions have been recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Order ID</th><th className="px-6 py-3">Method</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{transactions.map(tx => <tr key={tx.id}><td className="whitespace-nowrap px-6 py-4 font-mono text-xs">{tx.order_id}</td><td className="px-6 py-4">{tx.payment_type ?? "—"}</td><td className="whitespace-nowrap px-6 py-4 font-semibold">{money(tx.amount)}</td><td className="px-6 py-4"><Badge status={tx.status} /></td><td className="whitespace-nowrap px-6 py-4 text-slate-500">{date(tx.created_at)}</td></tr>)}</tbody></table></div>}
   </section>
  </div>
 </main>;
}
