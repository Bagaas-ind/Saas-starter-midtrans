import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/types/database";

const rank: Record<PlanTier, number> = { free: 0, pro: 1, enterprise: 2 };

export interface UserEntitlements {
  planTier: PlanTier;
  effectiveTier: PlanTier;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  isActive: boolean;
}

export async function getUserEntitlements(): Promise<UserEntitlements> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("plan_tier,subscription_status,current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to load subscription entitlements.");
  const planTier = (data?.plan_tier ?? "free") as PlanTier;
  const currentPeriodEnd = data?.current_period_end ?? null;
  const hasNotExpired = !currentPeriodEnd || new Date(currentPeriodEnd).getTime() > Date.now();
  const isActive = planTier === "free" || (data?.subscription_status === "active" && hasNotExpired);
  const effectiveTier: PlanTier = isActive ? planTier : "free";

  return {
    planTier,
    effectiveTier,
    subscriptionStatus: isActive ? (data?.subscription_status ?? "inactive") : "expired",
    currentPeriodEnd,
    isActive: planTier === "free" ? true : isActive,
  };
}

/** Server-side authorization guard. Call from a Server Action or Route Handler. */
export async function requirePlan(minimumTier: PlanTier): Promise<UserEntitlements> {
  const entitlements = await getUserEntitlements();
  if (rank[entitlements.effectiveTier] < rank[minimumTier]) {
    throw new Error("PLAN_REQUIRED");
  }
  return entitlements;
}
