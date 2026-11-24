-- ============================================================================
-- saas-starter PostgreSQL Schema & Row Level Security (RLS) Policies
-- Run this entire script in your Supabase SQL Editor.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PLANS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_idr INTEGER NOT NULL CHECK (price_idr >= 0),
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default subscription plans (IDR pricing for Midtrans)
INSERT INTO public.plans (id, name, description, price_idr, features, is_popular)
VALUES
    (
        'free',
        'Starter Free',
        'For solo builders validating ideas and testing core workflows.',
        0,
        '["Up to 3 active projects", "Community support", "Basic analytics dashboard", "Standard API rate limits"]'::jsonb,
        false
    ),
    (
        'pro',
        'Pro Builder',
        'Everything you need to launch and monetize your SaaS fast.',
        149000,
        '["Unlimited active projects", "Priority email & chat support", "Advanced revenue & usage analytics", "Custom webhook integrations", "Higher API rate limits"]'::jsonb,
        true
    ),
    (
        'enterprise',
        'Scale Team',
        'Dedicated infrastructure and controls for growing teams.',
        499000,
        '["Everything in Pro Builder", "Unlimited team members", "99.9% uptime SLA guarantee", "Dedicated account engineer", "Custom security & audit logs"]'::jsonb,
        false
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_idr = EXCLUDED.price_idr,
    features = EXCLUDED.features,
    is_popular = EXCLUDED.is_popular;

-- ----------------------------------------------------------------------------
-- 2. PROFILES TABLE (Linked to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'free' REFERENCES public.plans(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, plan_tier)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
        'free'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.plans(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
    snap_token TEXT,
    payment_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);

-- ----------------------------------------------------------------------------
-- 4. UPDATED_AT TIMESTAMP TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Plans: Readable by everyone (public landing page pricing)
DROP POLICY IF EXISTS "Plans are publicly readable" ON public.plans;
CREATE POLICY "Plans are publicly readable"
    ON public.plans
    FOR SELECT
    USING (true);

-- Profiles: Users can only view and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Transactions: Users can read their own transactions; inserts/updates handled via server/service-role
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
    ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Prevent authenticated users from changing their own subscription tier.
-- Trusted server-side operations (using the service_role key) remain allowed.
CREATE OR REPLACE FUNCTION public.prevent_profile_plan_tier_self_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF auth.role() = 'authenticated'
       AND NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
        RAISE EXCEPTION
            'Users cannot change their own plan_tier; subscription changes must be performed by trusted server-side payment processing.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_plan_tier_self_upgrade
    ON public.profiles;

CREATE TRIGGER prevent_profile_plan_tier_self_upgrade
    BEFORE UPDATE OF plan_tier ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_plan_tier_self_upgrade();
