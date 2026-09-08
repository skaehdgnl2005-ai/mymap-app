// Phase 9 — top-of-map keyword search bar.
//
// Floating input under the status bar (safe-area-padded). Tap to focus,
// type Korean, debounced live search via Naver. Results bubble up to the
// parent via onResults; the parent renders them as a search-overlay
// ShapeSource in PersonalMap (already wired in Phase 5) and shows a
// SearchResultPreview on result tap.
//
// Naver provider per D5b (same substitution all prior search code took).
// Debounce 300ms matches SaveModal's manual search.
//
// Korean IME: TextInput composing events are part of onChangeText's
// emitted value on RN/Android+iOS; the 300ms debounce covers the
// composition window — final committed Hangul lands as one settled value.
// No special IME guard needed for v1 (revisit if real users surface
// "search fires mid-composition" friction).

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { KakaoPlaceResult } from '../../spec/data-shapes';
import { naverSearchByKeyword } from '../naver/client';

interface Props {
  // Results from the latest debounced search. Empty array = search ran,
  // no matches. null = search not active (overlay should clear).
  onResults: (results: KakaoPlaceResult[] | null) => void;
  // Fired when the user explicitly dismisses (X tap or empty + blur).
  // Parent clears searchResults + searchPreview.
  onDismiss: () => void;
}

const DEBOUNCE_MS = 300;

export function SearchBar({ onResults, onDismiss }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True only when a search has run AND returned 0 results. Distinct
  // from "search not started yet" (initial state) — that one renders no
  // empty message. The phase-9 doc locks the copy: "검색 결과가 없어요".
  const [noResults, setNoResults] = useState(false);
  const inputRef = useRef<TextInput>(null);
  // Latest-wins guard against out-of-order debounce results: if the user
  // types "강" → "강남" within 300ms, the first call may resolve after
  // the second; without this, the older "강" results would overwrite the
  // newer "강남" results. Each debounce tick bumps the seq; only the
  // matching seq's response is allowed to call onResults.
  const seqRef = useRef(0);

  // Debounced search effect — runs whenever the query text changes.
  // Empty query: clear results (and skip the Naver call).
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPending(false);
      setError(null);
      setNoResults(false);
      onResults(null);
      return;
    }
    setPending(true);
    setError(null);
    setNoResults(false);
    const mySeq = ++seqRef.current;
    const handle = setTimeout(() => {
      naverSearchByKeyword(trimmed).then((r) => {
        if (mySeq !== seqRef.current) return; // stale, ignore
        setPending(false);
        if (r.error) {
          setError(r.error.message);
          onResults([]);
          return;
        }
        setNoResults(r.data.length === 0);
        onResults(r.data);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // onResults intentionally omitted — parent passes a stable ref via
    // useCallback; including it would re-fire the timer on every parent
    // re-render unrelated to the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setError(null);
    setPending(false);
    setNoResults(false);
    seqRef.current++;
    Keyboard.dismiss();
    inputRef.current?.blur();
    onDismiss();
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.bar, focused && styles.barFocused]}>
        <Text style={styles.searchIcon} accessibilityElementsHidden>
          🔍
        </Text>
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="장소 검색"
          placeholderTextColor="#9A9A95"
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {pending && <ActivityIndicator size="small" color="#9A9A95" style={styles.spinner} />}
        {query.length > 0 && !pending && (
          <Pressable onPress={handleClear} hitSlop={12} accessibilityLabel="검색 닫기">
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        )}
      </View>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
      {!error && noResults && (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyBannerText}>검색 결과가 없어요</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56, // below status bar; Phase 10 SafeAreaView refines
    left: 16,
    right: 16,
    zIndex: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0DED7',
    // Soft shadow per Toss-minimal aesthetic; brand_indigo NOT used on
    // input chrome (D8 lock — brand color reserved for pins/CTAs).
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  barFocused: {
    borderColor: '#9A98C8',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#6B6B6B',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1A1850',
    paddingVertical: 0, // strip RN's default vertical padding
  },
  spinner: {
    marginLeft: 8,
  },
  closeIcon: {
    fontSize: 14,
    color: '#9A9A95',
    paddingHorizontal: 4,
  },
  errorBanner: {
    marginTop: 6,
    backgroundColor: '#FCE7E5',
    borderLeftWidth: 3,
    borderLeftColor: '#C04545',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  errorBannerText: {
    color: '#7A2828',
    fontSize: 12,
  },
  emptyBanner: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0DED7',
  },
  emptyBannerText: {
    color: '#6B6B6B',
    fontSize: 12,
    textAlign: 'center',
  },
});
