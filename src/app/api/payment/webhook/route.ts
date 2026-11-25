import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TransactionStatus } from "@/types/database";

const midtransWebhookSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  // Midtrans may omit currency for IDR notifications; IDR is the configured default.\n  currency: z.string().length(3).optional(),
  signature_key: z.string().regex(/^[a-fA-F0-9]{128}$/),
  transaction_status: z.enum([
    "pending",
    "capture",
    "settlement",
    "deny",
    "cancel",
    "expire",
  ]),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
});

function isValidMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const { MIDTRANS_SIGNATURE_SECRET_KEY } = getServerEnv();
  const signaturePayload =
    params.orderId +
    params.statusCode +
    params.grossAmount +
    MIDTRANS_SIGNATURE_SECRET_KEY;

  const expected = createHash("sha512")
    .update(signaturePayload, "utf8")
    .digest();
  const received = Buffer.from(params.signatureKey, "hex");

  // timingSafeEqual throws when buffer lengths differ; validate first.
  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

function mapMidtransStatus(
  status: z.infer<typeof midtransWebhookSchema>["transaction_status"],
  fraudStatus?: string
): TransactionStatus {
  switch (status) {
    case "settlement":
      return "paid";
    case "capture":
      // A card capture is only fulfilled when Midtrans marks the fraud check
      // as accepted. "challenge" remains pending for manual review.
      return fraudStatus === "accept" ? "paid" : "pending";
    case "deny":
    case "cancel":
      return "failed";
    case "expire":
      return "expired";
    case "pending":
      return "pending";
  }
}

export async function POST(request: Request) {
  try {
    const rawBody: unknown = await request.json();
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
      currency,
      signature_key,
      transaction_status,
      payment_type,
      fraud_status,
    } = parsed.data;

    console.info("[payment:webhook] Notification received", {\n      orderId: order_id,\n      transactionStatus: transaction_status,\n      paymentType: payment_type ?? null,\n      currency: currency ?? "IDR (default)",\n    });\n\n    // 1. Verify the SHA-512 signature before trusting any notification fields.
    if (
      !isValidMidtransSignature({
        orderId: order_id,
        statusCode: status_code,
        grossAmount: gross_amount,
        signatureKey: signature_key,
      })
    ) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // This starter currently prices all plans in Indonesian Rupiah.
    if (currency && currency !== "IDR") {
      return NextResponse.json(
        { error: "Unsupported payment currency" },
        { status: 422 }
      );
    }

    const adminSupabase = createAdminClient();

    // 2. Load the server-side order and validate its expected amount.
    const { data: transaction, error: transactionError } =
      await adminSupabase
        .from("transactions")
        .select("order_id, user_id, plan_id, amount, status")
        .eq("order_id", order_id)
        .maybeSingle();

    if (transactionError) {
      console.error("Failed to load webhook transaction", transactionError);
      return NextResponse.json(
        { error: "Unable to load transaction" },
        { status: 500 }
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction order not found" },
        { status: 404 }
      );
    }

    const notifiedAmount = Number(gross_amount);
    const recordedAmount = Number(transaction.amount);

    if (
      !Number.isSafeInteger(notifiedAmount) ||
      !Number.isSafeInteger(recordedAmount) ||
      notifiedAmount !== recordedAmount
    ) {
      return NextResponse.json(
        { error: "Webhook amount does not match the recorded transaction" },
        { status: 422 }
      );
    }

    // Only a pending order may transition. The database RPC repeats this
    // condition atomically to protect against two requests arriving together.
    if (transaction.status !== "pending") {
      return NextResponse.json({
        received: true,
        already_processed: true,
        order_id,
        status: transaction.status,
      });
    }

    // 3. Map only the supported Midtrans transitions to internal DB statuses.
    const nextStatus = mapMidtransStatus(transaction_status, fraud_status);

    // A pending notification does not change the entitlement or transaction
    // state, so acknowledge it without invoking the fulfillment RPC.
    if (nextStatus === "pending") {
      return NextResponse.json({
        received: true,
        already_processed: false,
        order_id,
        status: "pending",
        payment_type: payment_type ?? null,
      });
    }

    // 4. A single PostgreSQL function updates the transaction and entitlement
    //    in one DB transaction. Its conditional UPDATE serializes duplicates.
    const { data: fulfillment, error: fulfillmentError } =
      await adminSupabase.rpc("fulfill_transaction", {
        p_order_id: order_id,
        p_new_status: nextStatus,
      });

    if (fulfillmentError) {
      console.error("Atomic transaction fulfillment failed", fulfillmentError);
      return NextResponse.json(
        { error: "Failed to process payment notification" },
        { status: 500 }
      );
    }

    const result = fulfillment as {
      already_processed?: boolean;
      order_id?: string;
      status?: TransactionStatus;
    } | null;

    if (result?.already_processed) {
      return NextResponse.json({
        received: true,
        already_processed: true,
        order_id,
      });
    }

    return NextResponse.json({
      received: true,
      already_processed: false,
      order_id,
      status: result?.status ?? nextStatus,
      payment_type: payment_type ?? null,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON webhook payload" },
        { status: 400 }
      );
    }

    console.error("Midtrans webhook processing error", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
