import { createHash, timingSafeEqual } from "node:crypto";

export function verifyMidtransSignature(
  input: { order_id: string; status_code: string; gross_amount: string; signature_key: string },
  serverKey: string,
): boolean {
  const expected = createHash("sha512")
    .update(input.order_id + input.status_code + input.gross_amount + serverKey, "utf8")
    .digest();

  const received = Buffer.from(input.signature_key, "hex");
  return received.length === expected.length && timingSafeEqual(expected, received);
}
