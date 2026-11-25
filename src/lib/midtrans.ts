import crypto from "crypto";
import { getServerEnv } from "@/lib/env";

export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  planName: string;
  planId: string;
  customerEmail: string;
  customerName: string;
}

export interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

function getMidtransSnapApiUrl(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

export async function createMidtransSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<MidtransSnapResponse> {
  const env = getServerEnv();
  const apiUrl = getMidtransSnapApiUrl(env.MIDTRANS_IS_PRODUCTION);
  const authHeader = Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString("base64");

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    item_details: [
      {
        id: params.planId,
        price: params.grossAmount,
        quantity: 1,
        name: `SaaS Subscription - ${params.planName}`.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: params.customerName.slice(0, 50),
      email: params.customerEmail,
    },
    callbacks: {
      finish: `${env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success&order_id=${encodeURIComponent(
        params.orderId
      )}`,
      error: `${env.NEXT_PUBLIC_APP_URL}/dashboard?payment=error&order_id=${encodeURIComponent(
        params.orderId
      )}`,
      pending: `${env.NEXT_PUBLIC_APP_URL}/dashboard?payment=pending&order_id=${encodeURIComponent(
        params.orderId
      )}`,
    },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.token || !data.redirect_url) {
    const errorMessage =
      Array.isArray(data.error_messages) && data.error_messages.length > 0
        ? data.error_messages.join(", ")
        : "Failed to initialize Midtrans Snap transaction";
    throw new Error(errorMessage);
  }

  return {
    token: data.token as string,
    redirect_url: data.redirect_url as string,
  };
}

/**
 * Verifies Midtrans webhook authenticity using SHA-512:
 * SHA512(order_id + status_code + gross_amount + signature_secret_key)
 */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const env = getServerEnv();
  const rawString = `${params.orderId}${params.statusCode}${params.grossAmount}${env.MIDTRANS_SIGNATURE_SECRET_KEY}`;
  const expectedSignature = crypto
    .createHash("sha512")
    .update(rawString)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(params.signatureKey, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
