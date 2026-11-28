import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const midtransWebhookSchema = z.object({
  order_id: z.string().min(1).max(100),
  status_code: z.string().min(1),
  gross_amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  currency: z.string().length(3).default("IDR"),
  signature_key: z.string().regex(/^[a-fA-F0-9]{128}$/),
  transaction_status: z.enum(["pending","capture","settlement","deny","cancel","expire"]),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
}).passthrough();

export function verifyMidtransSignature(input: {
  order_id: string; status_code: string; gross_amount: string; signature_key: string;
}, serverKey: string): boolean {
  const expected = createHash("sha512")
    .update(input.order_id + input.status_code + input.gross_amount + serverKey, "utf8")
    .digest();
  let received: Buffer;
  try { received = Buffer.from(input.signature_key, "hex"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = midtransWebhookSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Malformed notification" }, { status: 400 });

  const payload = parsed.data;
  const safePayload = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "signature_key"));
  let env: ReturnType<typeof getServerEnv>;
  try { env = getServerEnv(); }
  catch (error) {
    console.error("[payment:webhook] Server configuration error", error);
    return NextResponse.json({ error: "Webhook configuration unavailable" }, { status: 500 });
  }

  if (!verifyMidtransSignature(payload, env.MIDTRANS_SERVER_KEY)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (payload.currency !== "IDR") {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 422 });
  }

  // Capture only grants entitlement after Midtrans accepts the fraud check.
  if (payload.transaction_status === "capture" && payload.fraud_status !== "accept") {
    // Record non-accepted capture as a pending review event; no entitlement is granted.
    const admin = createAdminClient();
    const { error } = await admin.rpc("fulfill_midtrans_transaction", {
      p_order_id: payload.order_id,
      p_gross_amount: Number(payload.gross_amount),
      p_currency: payload.currency,
      p_transaction_status: "pending",
      p_payment_type: payload.payment_type ?? null,
      p_raw_payload: safePayload,
    });
    if (error) {
      console.error("[payment:webhook] Pending capture could not be recorded", error);
      return NextResponse.json({ error: "Unable to record notification" }, { status: 500 });
    }
    return NextResponse.json({ received: true, review_required: true }, { status: 200 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fulfill_midtrans_transaction", {
    p_order_id: payload.order_id,
    p_gross_amount: Number(payload.gross_amount),
    p_currency: payload.currency,
    p_transaction_status: payload.transaction_status,
    p_payment_type: payload.payment_type ?? null,
    p_raw_payload: payload,
  });

  if (error) {
    console.error("[payment:webhook] Atomic fulfillment failed", {
      code: error.code, message: error.message, orderId: payload.order_id,
    });
    // Non-2xx tells Midtrans to retry transient/database failures.
    return NextResponse.json({ error: "Notification processing failed" }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    already_processed: Boolean((data as { already_processed?: boolean } | null)?.already_processed),
  }, { status: 200 });
}
