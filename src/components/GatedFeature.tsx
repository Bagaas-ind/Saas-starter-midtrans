import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";
import { getUserEntitlements } from "@/lib/subscription";

export async function GatedFeature() {
  const entitlements = await getUserEntitlements();
  const unlocked = entitlements.effectiveTier === "pro" || entitlements.effectiveTier === "enterprise";
  return <section className="mt-8 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-2 text-indigo-700"><Sparkles className="h-5 w-5" /><h2 className="font-bold">Pro Analytics</h2></div>
    {unlocked ? <div className="mt-3"><p className="text-sm text-slate-600">Advanced analytics is unlocked for your {entitlements.effectiveTier} plan.</p><div className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">Your server-verified subscription grants access to this Pro feature.</div></div>
    : <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Advanced analytics is available on Pro and Enterprise plans.</p><Link href="/dashboard/billing" className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><LockKeyhole className="h-4 w-4" /> Upgrade plan</Link></div>}
  </section>;
}
