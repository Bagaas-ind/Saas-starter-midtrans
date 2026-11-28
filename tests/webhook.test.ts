import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const rpc = vi.fn();
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    MIDTRANS_SERVER_KEY: "test-server-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

import { POST } from "../src/app/api/payment/webhook/route";

function notification(overrides: Record<string, unknown> = {}) {
  const order_id = "SAAS-TEST-ORDER-1";
  const status_code = "200";
  const gross_amount = "149000.00";
  const signature_key = createHash("sha512")
    .update(order_id + status_code + gross_amount + "test-server-key")
    .digest("hex");
  return {
    order_id, status_code, gross_amount, currency: "IDR", signature_key,
    transaction_status: "settlement", payment_type: "bank_transfer",
    ...overrides,
  };
}

describe("Midtrans webhook", () => {
  beforeEach(() => rpc.mockReset().mockResolvedValue({ data: { already_processed: false }, error: null }));

  it("rejects an invalid signature with 401", async () => {
    const body = notification({ signature_key: "0".repeat(128) });
    const response = await POST(new Request("http://localhost/api/payment/webhook", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("processes a valid SHA-512 notification with 200", async () => {
    const response = await POST(new Request("http://localhost/api/payment/webhook", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(notification()),
    }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fulfill_midtrans_transaction", expect.objectContaining({
      p_order_id: "SAAS-TEST-ORDER-1", p_currency: "IDR", p_transaction_status: "settlement",
    }));
  });

  it("acknowledges duplicate notifications returned by the idempotent RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { already_processed: true }, error: null });
    const response = await POST(new Request("http://localhost/api/payment/webhook", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(notification()),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true, already_processed: true });
  });
});
