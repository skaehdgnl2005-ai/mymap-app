-- Phase 3 — OG resolver rate limit
--
-- Per-user 60-calls/min cap on the og-resolver Edge Function. Closes the
-- "use Supabase as an OG-fetching proxy" abuse vector. Real users save 1-2
-- places/min and never approach the cap; abusers get rejected at 61.

CREATE TABLE public.og_resolver_rate (
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX og_resolver_rate_user_called_idx
  ON public.og_resolver_rate (user_id, called_at DESC);

ALTER TABLE public.og_resolver_rate ENABLE ROW LEVEL SECURITY;
-- No policies = deny by default for both anon and authenticated. The
-- check_og_rate_limit function below uses SECURITY DEFINER to bypass RLS.
REVOKE ALL ON public.og_resolver_rate FROM anon, authenticated;

-- Atomic check-and-bump: returns TRUE if the call is allowed (and records it),
-- FALSE if the user is over the per-minute cap. Opportunistic cleanup of rows
-- older than 5 minutes keeps the table small without a scheduled job.
--
-- The user identity is derived from auth.uid() (JWT claim), not a caller-
-- supplied argument, to prevent a malicious caller from bypassing their own
-- rate limit by passing another user's UUID. SECURITY DEFINER runs the body
-- as the function owner, but auth.uid() still reads the request JWT context.
CREATE OR REPLACE FUNCTION public.check_og_rate_limit(
  p_max_per_min INT DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  count_in_window INT;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN FALSE; -- no JWT = deny
  END IF;

  DELETE FROM public.og_resolver_rate
   WHERE called_at < now() - interval '5 minutes';

  SELECT COUNT(*) INTO count_in_window
    FROM public.og_resolver_rate
   WHERE user_id = current_user_id
     AND called_at > now() - interval '1 minute';

  IF count_in_window >= p_max_per_min THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.og_resolver_rate (user_id) VALUES (current_user_id);
  RETURN TRUE;
END;
$$;

-- Authenticated callers can invoke the function. SECURITY DEFINER means the
-- function body runs as the function owner (postgres) regardless of caller,
-- so the REVOKE on the table doesn't block the function's own writes.
GRANT EXECUTE ON FUNCTION public.check_og_rate_limit(INT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.check_og_rate_limit(INT) FROM anon;
