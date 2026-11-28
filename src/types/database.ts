export type PlanTier = "free" | "pro" | "enterprise";
export type TransactionStatus = "pending" | "paid" | "failed" | "expired" | "settlement" | "capture" | "expire" | "cancel" | "fraud_or_mismatch" | "deny";
export interface Plan { id: PlanTier; name: string; description: string; price_idr: number; features: string[]; is_popular: boolean; created_at: string; }
export interface Profile {
 id: string; email: string; full_name: string | null; plan_tier: PlanTier;
 subscription_status?: "inactive" | "active" | "expired" | "past_due" | "canceled";
 current_period_end?: string | null; created_at: string; updated_at: string;
}
export interface Transaction {
 id: string; order_id: string; user_id: string; plan_id: PlanTier; amount: number;
 status: TransactionStatus; snap_token: string | null; payment_type: string | null;
 created_at: string; updated_at: string;
}
