// Database type — adapter between spec/data-shapes.ts (single source of truth)
// and Supabase JS createClient<Database>(). HAND-WRITTEN per the Phase 3 type-
// strategy decision (Pattern A); not generated.
//
// Why the Identity<T> wrapper:
//   SavedPlace is declared as an `interface` in spec/data-shapes.ts. TypeScript
//   treats interfaces as openable (declaration merging may add keys later), so
//   they do not satisfy `Record<string, unknown>` — which is exactly the
//   constraint Supabase JS uses for GenericTable.Row/Insert/Update. Without
//   the conversion, the client infers Schema as `never` and every typed call
//   to .from('saved_places').insert(...) becomes uncallable. Identity<T>
//   re-walks the keys via a mapped type, producing a structurally identical
//   shape that DOES satisfy the index-signature constraint, while keeping
//   spec/data-shapes.ts untouched (it's approval-gated per CLAUDE.md).
//
// The og_resolver_rate table and check_og_rate_limit RPC are intentionally
// excluded — they are internals invoked only by the Edge Function (which has
// its own untyped supabase-js instance). Excluding them prevents accidental
// client-side use.
//
// When changing the schema:
//   1. Update spec/data-shapes.ts (canonical SavedPlace shape).
//   2. Update supabase/migrations/<timestamp>_*.sql (storage realization).
//   3. Update this file (Insert/Update derivations).
//   4. Run `pnpm db:gen-types` and visually diff build/db.types.generated.ts
//      against this file. CI gate is deferred to Phase 5/6.

import type { SavedPlace } from '../../spec/data-shapes';

type Identity<T> = { [K in keyof T]: T[K] };

type SavedPlaceRow = Identity<SavedPlace>;

type SavedPlaceInsert = Identity<
  Omit<SavedPlace, 'id' | 'saved_at' | 'visited' | 'color_tag'> & {
    id?: string;
    saved_at?: string;
    visited?: boolean;
    color_tag?: SavedPlace['color_tag'];
  }
>;

type SavedPlaceUpdate = Identity<Partial<Omit<SavedPlace, 'id' | 'user_id' | 'saved_at'>>>;

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      saved_places: {
        Row: SavedPlaceRow;
        Insert: SavedPlaceInsert;
        Update: SavedPlaceUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
