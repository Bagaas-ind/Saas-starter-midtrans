import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMidtransSnapTransaction } from "@/lib/midtrans";

const createPaymentSchema = z.object({
  planId: z.enum(["pro", "enterprise"], {
    errorMap: () => ({ message: "Invalid or non-billable subscription plan." }),
  }),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request payload" },
        { status: 400 }
      );
    }

    const { planId } = parsed.data;
    const adminSupabase = createAdminClient();

    // Fetch plan details & user profile
    const [{ data: plan, error: planError }, { data: profile }] =
      await Promise.all([
        adminSupabase.from("plans").select("*").eq("id", planId).single(),
        adminSupabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);

    if (planError || !plan || plan.price_idr <= 0) {
      // Keep database details in server logs only; never expose them to the client.
      console.error("[payment:create] Plan lookup failed", {
        planId,
        code: planError?.code,
        message: planError?.message,
        details: planError?.details,
        hint: planError?.hint,
        planFound: Boolean(plan),
        priceIdr: plan?.price_idr ?? null,
      });

      return NextResponse.json(
        { error: "Selected plan is unavailable for checkout." },
        { status: 404 }
      );
    }

    if (profile?.plan_tier === planId) {
      return NextResponse.json(
        { error: `You are already subscribed to the ${plan.name} plan.` },
        { status: 400 }
      );
    }

    const shortUserId = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderId = `SAAS-${shortUserId}-${Date.now()}-${randomSuffix}`;

    const snap = await createMidtransSnapTransaction({
      orderId,
      grossAmount: plan.price_idr,
      planName: plan.name,
      planId: plan.id,
      customerEmail: user.email ?? profile?.email ?? "customer@example.com",
      customerName:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "SaaS Customer",
    });

    const { error: insertError } = await adminSupabase
      .from("transactions")
      .insert({
        order_id: orderId,
        user_id: user.id,
        plan_id: plan.id,
        amount: plan.price_idr,
        status: "pending",
        snap_token: snap.token,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to record pending transaction." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: snap.token,
      redirect_url: snap.redirect_url,
      order_id: orderId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[payment:create] Unexpected checkout error", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
