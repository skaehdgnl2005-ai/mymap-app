// CRUD layer over the saved_places table + OG resolver invocation.
//
// Every function returns a tagged Result<T> shape so the UI can branch on
// `error` without try/catch. RLS is the auth boundary: the supabase client
// must carry the user's JWT (set up by the auth UI in Phase 6) for any of
// these calls to return rows. Cross-user reads return [] not an error.

import type { PostgrestError, FunctionsError } from '@supabase/supabase-js';

import type { SavedPlace } from '../../spec/data-shapes';
import { supabase } from '../supabase';

type Result<T, E = PostgrestError> = { data: T; error: null } | { data: null; error: E };

// Insert payload: id + saved_at have DB defaults; visited and color_tag are
// also DB-defaulted (false / 'NONE'). user_id is required because RLS only
// matches rows where auth.uid() = user_id.
export type NewSavedPlace = Omit<SavedPlace, 'id' | 'saved_at' | 'visited' | 'color_tag'> & {
  visited?: boolean;
  color_tag?: SavedPlace['color_tag'];
};

// Update patch: identity (id, user_id) and saved_at are immutable post-insert.
export type SavedPlacePatch = Partial<Omit<SavedPlace, 'id' | 'user_id' | 'saved_at'>>;

// ---- Reads ----------------------------------------------------------------

export async function listPlaces(): Promise<Result<SavedPlace[]>> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('*')
    .order('saved_at', { ascending: false });
  if (error) return { data: null, error };
  return { data: data ?? [], error: null };
}

export async function listPlacesByRegion(region: string): Promise<Result<SavedPlace[]>> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('*')
    .eq('region', region)
    .order('saved_at', { ascending: false });
  if (error) return { data: null, error };
  return { data: data ?? [], error: null };
}

export async function getPlace(id: string): Promise<Result<SavedPlace | null>> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data, error: null };
}

// ---- Writes ---------------------------------------------------------------

export async function savePlace(place: NewSavedPlace): Promise<Result<SavedPlace>> {
  const { data, error } = await supabase.from('saved_places').insert(place).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updatePlace(id: string, patch: SavedPlacePatch): Promise<Result<SavedPlace>> {
  const { data, error } = await supabase
    .from('saved_places')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deletePlace(id: string): Promise<Result<true>> {
  const { error } = await supabase.from('saved_places').delete().eq('id', id);
  if (error) return { data: null, error };
  return { data: true, error: null };
}

// ---- OG resolver Edge Function --------------------------------------------
//
// Caching (skip if og_fetched_at < 30 days) is the CALLER's responsibility:
// check the existing row's og_fetched_at before invoking. This wrapper is
// stateless on the cache.

export interface OgResolverResult {
  og_title: string | null;
  og_image_url: string | null;
  og_description: string | null;
  og_fetch_status: 'OK' | 'FAILED' | 'GATED';
}

export async function resolveOgMetadata(
  url: string,
): Promise<Result<OgResolverResult, FunctionsError | Error>> {
  const { data, error } = await supabase.functions.invoke<OgResolverResult>('og-resolver', {
    body: { url },
  });
  if (error) return { data: null, error };
  if (!data) {
    return { data: null, error: new Error('OG resolver returned no body') };
  }
  return { data, error: null };
}
