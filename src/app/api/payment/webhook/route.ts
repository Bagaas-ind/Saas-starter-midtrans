import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TransactionStatus } from "@/types/database";

const midtransWebhookSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  signature_key: z.string().min(1),
  transaction_status: z.string().min(1),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = midtransWebhookSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Malformed Midtrans webhook payload" },
        { status: 400 }
      );
    }

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
      fraud_status,
    } = parsed.data;

    // 1. Cryptographic SHA-512 signature check
    const isValidSignature = verifyMidtransSignature({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      signatureKey: signature_key,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // 2. Fetch existing transaction record
    const { data: transaction, error: txError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction order not found" },
        { status: 404 }
      );
    }

    // 3. Idempotency guard: if already paid, do not re-process
    if (transaction.status === "paid") {
      return NextResponse.json({
        received: true,
        message: "Transaction already settled",
      });
    }

    // 4. Map Midtrans transaction_status to internal status
    let nextStatus: TransactionStatus = "pending";

    if (transaction_status === "capture") {
      nextStatus = fraud_status === "accept" ? "paid" : "pending";
    } else if (transaction_status === "settlement") {
      nextStatus = "paid";
    } else if (transaction_status === "expire") {
      nextStatus = "expired";
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "failure"
    ) {
      nextStatus = "failed";
    } else if (transaction_status === "pending") {
      nextStatus = "pending";
    }

    // 5. Update transaction record
    const { error: updateTxError } = await adminSupabase
      .from("transactions")
      .update({
        status: nextStatus,
        payment_type: payment_type ?? transaction.payment_type,
      })
      .eq("id", transaction.id);

    if (updateTxError) {
      return NextResponse.json(
        { error: "Failed to update transaction status" },
        { status: 500 }
      );
    }

    // 6. Upgrade user plan_tier when payment is settled
    if (nextStatus === "paid") {
      const { error: upgradeError } = await adminSupabase
        .from("profiles")
        .update({ plan_tier: transaction.plan_id })
        .eq("id", transaction.user_id);

      if (upgradeError) {
        return NextResponse.json(
          { error: "Payment recorded, but failed to upgrade user profile" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      received: true,
      order_id,
      status: nextStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
