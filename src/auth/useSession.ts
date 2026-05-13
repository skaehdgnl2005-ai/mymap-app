// Session hook: subscribes to Supabase auth state changes and exposes the
// current user id (or null when signed out).
//
// Replaces Phase 5's ensureDevSession boot-time test-user sign-in. Phase 6
// onwards the app boots unauthenticated; AuthScreen handles sign-in, and
// onAuthStateChange propagates the new session here without needing a
// manual refetch.
//
// Loading distinction matters: on cold boot, getSession is async — the
// JS bundle has to read AsyncStorage to restore the persisted session.
// During that window we should NOT show the AuthScreen (it'd flash for
// returning users), so callers gate on `loading`.

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../supabase';

export interface SessionState {
  session: Session | null;
  userId: string | null;
  loading: boolean;
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, userId: session?.user.id ?? null, loading };
}
