// Phase 8 — OG cache refresh wrapper.
//
// Used in two call sites:
//   1. Post-save (SaveModal): every freshly-saved pin lands with
//      og_fetched_at=null, so refreshOgMetadata always fires.
//   2. Popover-open (PinDetailPopover via App): if the cached
//      og_fetched_at is older than 30 days, kick off a background
//      refresh. The popover renders the stale cached version
//      immediately and gets the updated row when the async write
//      lands (via parent state update).
//
// Both sites are non-blocking — UI never waits on OG fetch. Errors
// are logged via console.warn but never propagated; OG metadata is
// progressive enhancement, not load-bearing.
//
// Caller contract: the repo wrapper (resolveOgMetadata) handles the
// Edge Function invocation; this layer handles policy (cache-staleness
// check, DB write, lifecycle bookkeeping).

import type { SavedPlace } from '../../spec/data-shapes';
import { resolveOgMetadata, updatePlace } from './repo';

// 30 days in milliseconds — DESIGN.md D7 R3 ("OG fetch is best-effort
// + graceful degrade; cache 30 days then re-attempt").
const OG_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const isOgCacheStale = (place: SavedPlace): boolean => {
  if (!place.source_url) return false; // no source URL → nothing to fetch
  if (!place.og_fetched_at) return true; // never attempted
  const ts = new Date(place.og_fetched_at).getTime();
  if (Number.isNaN(ts)) return true; // corrupted timestamp → re-fetch
  return Date.now() - ts > OG_CACHE_TTL_MS;
};

// Fires the OG resolver Edge Function and persists the result to the
// row. Returns the updated SavedPlace on success, null on any failure
// (network, Edge Function error, DB write error). Never throws.
export async function refreshOgMetadata(place: SavedPlace): Promise<SavedPlace | null> {
  if (!place.source_url) return null;

  const r = await resolveOgMetadata(place.source_url);
  if (r.error) {
    console.warn('[og] resolver failed:', r.error.message);
    return null;
  }

  const fetchedAt = new Date().toISOString();
  const writeResult = await updatePlace(place.id, {
    og_title: r.data.og_title,
    og_image_url: r.data.og_image_url,
    og_description: r.data.og_description,
    og_fetch_status: r.data.og_fetch_status,
    og_fetched_at: fetchedAt,
  });

  if (writeResult.error) {
    console.warn('[og] cache write failed:', writeResult.error.message);
    return null;
  }
  return writeResult.data;
}
