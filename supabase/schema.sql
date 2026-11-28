-- SaaS Starter — Supabase schema
-- Safe to re-run on an existing project. Apply in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_idr INTEGER NOT NULL CHECK (price_idr >= 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plans (id,name,description,price_idr,features,is_popular) VALUES
('free','Starter Free','For solo builders validating ideas and testing core workflows.',0,'["Up to 3 active projects","Community support","Basic analytics dashboard","Standard API rate limits"]'::jsonb,false),
('pro','Pro Builder','Everything you need to launch and monetize your SaaS fast.',149000,'["Unlimited active projects","Priority email & chat support","Advanced revenue & usage analytics","Custom webhook integrations","Higher API rate limits"]'::jsonb,true),
('enterprise','Scale Team','Dedicated infrastructure and controls for growing teams.',499000,'["Everything in Pro Builder","Unlimited team members","99.9% uptime SLA guarantee","Dedicated account engineer","Custom security & audit logs"]'::jsonb,false)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
 price_idr=EXCLUDED.price_idr, features=EXCLUDED.features, is_popular=EXCLUDED.is_popular;

CREATE TABLE IF NOT EXISTS public.profiles (
 id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email TEXT NOT NULL, full_name TEXT,
 plan_tier TEXT NOT NULL DEFAULT 'free' REFERENCES public.plans(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check
 CHECK (subscription_status IN ('inactive','active','expired','past_due','canceled'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,email,full_name,plan_tier)
 VALUES(NEW.id,COALESCE(NEW.email,''),COALESCE(NEW.raw_user_meta_data->>'full_name',split_part(COALESCE(NEW.email,''),'@',1)),'free')
 ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.transactions (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 order_id TEXT UNIQUE NOT NULL,
 user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 plan_id TEXT NOT NULL REFERENCES public.plans(id),
 amount INTEGER NOT NULL CHECK(amount>0),
 status TEXT NOT NULL DEFAULT 'pending',
 snap_token TEXT, payment_type TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check
 CHECK(status IN ('pending','paid','failed','expired','settlement','capture','expire','cancel','fraud_or_mismatch','deny'));
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

CREATE TABLE IF NOT EXISTS public.webhook_events (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 order_id TEXT NOT NULL,
 transaction_status TEXT NOT NULL,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT webhook_events_order_status_unique UNIQUE(order_id,transaction_status)
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON public.transactions
 FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans are publicly readable" ON public.plans;
CREATE POLICY "Plans are publicly readable" ON public.plans FOR SELECT USING(true);
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING(auth.uid()=id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING(auth.uid()=id) WITH CHECK(auth.uid()=id);
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING(auth.uid()=user_id);
-- No browser policies are defined for webhook_events: only service_role can access it.

CREATE OR REPLACE FUNCTION public.prevent_profile_plan_tier_self_upgrade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF auth.role()='authenticated' AND (
   NEW.plan_tier IS DISTINCT FROM OLD.plan_tier OR
   NEW.subscription_status IS DISTINCT FROM OLD.subscription_status OR
   NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
 ) THEN
   RAISE EXCEPTION 'Subscription fields can only be changed by trusted payment processing.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS prevent_profile_plan_tier_self_upgrade ON public.profiles;
CREATE TRIGGER prevent_profile_plan_tier_self_upgrade BEFORE UPDATE OF plan_tier,subscription_status,current_period_end
 ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_plan_tier_self_upgrade();

-- Legacy RPC retained for backwards compatibility; new webhook uses the hardened RPC below.
CREATE OR REPLACE FUNCTION public.fulfill_transaction(p_order_id TEXT,p_new_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_transaction public.transactions%ROWTYPE;
BEGIN
 IF p_new_status NOT IN ('pending','paid','failed','expired') THEN
  RAISE EXCEPTION 'Unsupported transaction status' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_transaction FROM public.transactions WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found' USING ERRCODE='P0002'; END IF;
 IF v_transaction.status NOT IN ('pending') THEN
  RETURN jsonb_build_object('already_processed',true,'order_id',p_order_id);
 END IF;
 UPDATE public.transactions SET status=p_new_status WHERE id=v_transaction.id;
 IF p_new_status='paid' THEN
  UPDATE public.profiles SET plan_tier=v_transaction.plan_id,subscription_status='active',
   current_period_end=GREATEST(COALESCE(current_period_end,NOW()),NOW())+INTERVAL '30 days'
  WHERE id=v_transaction.user_id;
 END IF;
 RETURN jsonb_build_object('already_processed',false,'order_id',p_order_id,'status',p_new_status);
END; $$;

CREATE OR REPLACE FUNCTION public.fulfill_midtrans_transaction(
 p_order_id TEXT,p_gross_amount NUMERIC,p_currency TEXT,p_transaction_status TEXT,
 p_payment_type TEXT,p_raw_payload JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_tx public.transactions%ROWTYPE;
 v_new_status TEXT;
 v_event_rows INTEGER;
 v_period_start TIMESTAMPTZ;
BEGIN
 IF p_order_id IS NULL OR length(trim(p_order_id))=0 THEN
  RAISE EXCEPTION 'order_id is required' USING ERRCODE='22023';
 END IF;
 IF p_currency IS DISTINCT FROM 'IDR' THEN
  RAISE EXCEPTION 'Only IDR currency is accepted' USING ERRCODE='22023';
 END IF;
 IF p_transaction_status NOT IN ('pending','capture','settlement','deny','cancel','expire') THEN
  RAISE EXCEPTION 'Unsupported Midtrans status: %',p_transaction_status USING ERRCODE='22023';
 END IF;

 INSERT INTO public.webhook_events(order_id,transaction_status,payload)
 VALUES(p_order_id,p_transaction_status,COALESCE(p_raw_payload,'{}'::jsonb))
 ON CONFLICT(order_id,transaction_status) DO NOTHING;
 GET DIAGNOSTICS v_event_rows = ROW_COUNT;
 IF v_event_rows = 0 THEN
  RETURN jsonb_build_object('already_processed',true,'order_id',p_order_id);
 END IF;

 SELECT * INTO v_tx FROM public.transactions WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found: %',p_order_id USING ERRCODE='P0002'; END IF;
 IF p_gross_amount IS NULL OR p_gross_amount < v_tx.amount THEN
  RAISE EXCEPTION 'Gross amount is below the recorded amount' USING ERRCODE='22023';
 END IF;

 v_new_status := CASE
  WHEN p_transaction_status='settlement' THEN 'settlement'
  WHEN p_transaction_status='capture' THEN 'capture'
  WHEN p_transaction_status='pending' THEN 'pending'
  WHEN p_transaction_status='expire' THEN 'expire'
  WHEN p_transaction_status='cancel' THEN 'cancel'
  WHEN p_transaction_status='deny' THEN 'fraud_or_mismatch'
 END;

 -- Do not downgrade a fulfilled order due to late/reordered notifications.
 IF v_tx.status IN ('paid','settlement','capture') AND v_new_status NOT IN ('settlement','capture') THEN
  RETURN jsonb_build_object('already_processed',true,'order_id',p_order_id,'status',v_tx.status);
 END IF;

 UPDATE public.transactions SET
  status=v_new_status,
  payment_type=COALESCE(p_payment_type,payment_type)
 WHERE id=v_tx.id;

 IF p_transaction_status IN ('settlement','capture') THEN
  v_period_start := CASE WHEN v_tx.plan_id=(
    SELECT plan_tier FROM public.profiles WHERE id=v_tx.user_id
   ) THEN GREATEST(COALESCE((SELECT current_period_end FROM public.profiles WHERE id=v_tx.user_id),NOW()),NOW())
   ELSE NOW() END;
  UPDATE public.profiles SET plan_tier=v_tx.plan_id,subscription_status='active',
   current_period_end=v_period_start+INTERVAL '30 days'
  WHERE id=v_tx.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found for order %',p_order_id USING ERRCODE='P0002'; END IF;
 END IF;
 RETURN jsonb_build_object('already_processed',false,'order_id',p_order_id,'status',v_new_status,'plan_id',v_tx.plan_id);
END; $$;

REVOKE ALL ON FUNCTION public.fulfill_transaction(TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_transaction(TEXT,TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.fulfill_midtrans_transaction(TEXT,NUMERIC,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_midtrans_transaction(TEXT,NUMERIC,TEXT,TEXT,TEXT,JSONB) TO service_role;
REVOKE ALL ON TABLE public.webhook_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.webhook_events TO service_role;
