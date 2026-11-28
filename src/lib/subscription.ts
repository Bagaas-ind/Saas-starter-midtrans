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

function freeEntitlements(): UserEntitlements {
  return {
    planTier: "free",
    effectiveTier: "free",
    subscriptionStatus: "inactive",
    currentPeriodEnd: null,
    isActive: true,
  };
}

export async function getUserEntitlements(): Promise<UserEntitlements> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[subscription] Failed to verify the current user session.", {
      code: authError.code,
      message: authError.message,
      status: authError.status,
    });
    redirect("/login");
  }

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("plan_tier,subscription_status,current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // Fail closed: a database/schema/RLS issue must never grant paid access or
    // take down the dashboard. The detailed error stays in server-side logs.
    console.error("[subscription] Failed to load profile entitlements.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      status: error.status,
    });
    return freeEntitlements();
  }

  if (!data) {
    // A newly authenticated user may briefly have no profile row if the
    // signup trigger has not created it yet. Treat the account as Free.
    console.warn("[subscription] No profile row found; using Free entitlements.");
    return freeEntitlements();
  }

  const validTiers: PlanTier[] = ["free", "pro", "enterprise"];
  const planTier = validTiers.includes(data.plan_tier as PlanTier)
    ? (data.plan_tier as PlanTier)
    : "free";

  if (planTier !== data.plan_tier) {
    console.error("[subscription] Invalid plan_tier value; access defaults to Free.", {
      value: data.plan_tier,
    });
  }

  const currentPeriodEnd = data.current_period_end ?? null;
  const periodEndTime = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : NaN;
  const hasNotExpired = Number.isFinite(periodEndTime) && periodEndTime > Date.now();
  const isActive =
    planTier === "free" ||
    (data.subscription_status === "active" && hasNotExpired);
  const effectiveTier: PlanTier = isActive ? planTier : "free";

  return {
    planTier,
    effectiveTier,
    subscriptionStatus: isActive
      ? (data.subscription_status ?? "inactive")
      : "expired",
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
