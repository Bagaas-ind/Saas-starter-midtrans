-- Prevent authenticated users from granting themselves paid subscription tiers.
-- Apply this migration to an existing Supabase database.
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
