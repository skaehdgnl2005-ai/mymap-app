// useOnboardingComplete — determines whether the signed-in user should see
// the onboarding flow on this boot.
//
// Two-layer gate (skipping-everything vs. completed-with-anchors both count
// as "done"):
//
//   1. AsyncStorage flag `onboarding_complete:<userId>`. Set when the user
//      explicitly completes or skips Step 2. Per-device, per-user.
//   2. Fallback: query saved_places for any HOME/SCHOOL/WORK anchor. If the
//      user has anchors but the flag is missing (e.g. first install on a
//      new device with an existing account), they're treated as done — no
//      reason to re-walk onboarding when their anchors already exist.
//
// Returns `{ status: 'loading' | 'pending' | 'done' }`. Callers route on
// status — show AuthScreen while !userId, OnboardingStepHome when pending,
// the map when done.
//
// `markComplete(userId)` is exported so the onboarding screens can flip
// the flag on done/skip without re-querying.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../supabase';

export type OnboardingStatus = 'loading' | 'pending' | 'done';

const flagKey = (userId: string): string => `onboarding_complete:${userId}`;

export async function markOnboardingComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(flagKey(userId), '1');
}

export function useOnboardingComplete(userId: string | null): {
  status: OnboardingStatus;
  // Allow the caller to optimistically flip status to 'done' after the
  // onboarding screens finish without waiting for the AsyncStorage round-trip
  // to settle through the effect again.
  setDone: () => void;
} {
  const [status, setStatus] = useState<OnboardingStatus>('loading');

  useEffect(() => {
    if (!userId) {
      setStatus('loading');
      return;
    }
    let cancelled = false;

    void (async () => {
      // Fast path: AsyncStorage flag check.
      const flag = await AsyncStorage.getItem(flagKey(userId));
      if (cancelled) return;
      if (flag === '1') {
        setStatus('done');
        return;
      }
      // Slow path: query saved_places for any anchor (HOME/SCHOOL/WORK).
      // We don't trust the rows beyond their existence — the goal is just
      // "does this user have at least one anchor we'd render?" If yes,
      // we backfill the flag so subsequent boots take the fast path.
      const { data, error } = await supabase
        .from('saved_places')
        .select('id')
        .in('category', ['HOME', 'SCHOOL', 'WORK'])
        .limit(1);
      if (cancelled) return;
      if (error) {
        // Network failure on cold boot — fail SAFE by treating as pending.
        // Re-walking onboarding is a worse-case rare cost vs. silently
        // landing the user on an empty map and confusing them.
        setStatus('pending');
        return;
      }
      if ((data ?? []).length > 0) {
        await AsyncStorage.setItem(flagKey(userId), '1');
        if (cancelled) return;
        setStatus('done');
      } else {
        setStatus('pending');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    status,
    setDone: () => setStatus('done'),
  };
}
