// AddressSearchInput — shared by OnboardingStepHome and OnboardingStepWorkSchool.
//
// Layered over naverSearchByKeyword (the same provider Phase 5's SaveModal
// uses, per D5b). Naver has no separate geocoder, so the input behaves like
// a place search: "성수동" → places in 성수동; "스타벅스 성수점" → specific
// landmark. User picks any result.
//
// Phase 6 trade-off (vs. phase doc's "dong-only with Kakao geocoder"):
// Naver Local Search returns places, not admin centroids. A user typing
// just "성수동" gets cafe/restaurant results in that dong — they pick the
// most familiar one (their actual building or a nearby landmark) and save
// that as the anchor. This is acceptable signal for v1 — the anchor's
// purpose is "give me distance gauge", not "lat/lng of the dong centroid
// exactly". Phase 10 may revisit if friend-demo feedback says otherwise.
//
// Debounce 300ms — same as SaveModal for consistent feel.
// `autoFocus` keeps the keyboard up from screen mount so users go straight
// to typing.

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { KakaoPlaceResult } from '../../spec/data-shapes';
import { naverSearchByKeyword } from '../naver/client';

interface Props {
  placeholder?: string;
  onPick: (result: KakaoPlaceResult) => void;
  // When set, the input begins focused (default true on mount).
  autoFocus?: boolean;
  // Optional keyword appended to the search query to narrow results.
  // Mirrors SaveModal's CATEGORY_SEARCH_KEYWORDS pattern: passing "학교"
  // makes the search "{userQuery} 학교", which Naver Local Search uses
  // to bias results toward schools (university / high school / etc).
  // Empty string or undefined = no append (free-form search).
  // `| undefined` explicit because tsconfig has exactOptionalPropertyTypes:
  // callers (OnboardingStepWorkSchool) pass `string | undefined` from a
  // ternary, which `?: string` would reject under the strict flag.
  categoryKeyword?: string | undefined;
}

export const AddressSearchInput: React.FC<Props> = ({
  placeholder = '예: 성수동, 스타벅스 성수점',
  onPick,
  autoFocus = true,
  categoryKeyword,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [autoFocus]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }
    const queryForNaver = categoryKeyword ? `${trimmed} ${categoryKeyword}` : trimmed;
    const handle = setTimeout(() => {
      setLoading(true);
      void naverSearchByKeyword(queryForNaver).then((r) => {
        setLoading(false);
        if (r.error) {
          setError(r.error.message);
          setResults([]);
        } else {
          setError(null);
          setResults(r.data);
        }
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query, categoryKeyword]);

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={inputRef}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor="#9A9A95"
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {loading && results.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onPick(item)}>
            <Text style={styles.name}>{item.place_name}</Text>
            <Text style={styles.addr}>{item.address_name}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim() && !loading && !error ? (
            <Text style={styles.muted}>검색 결과가 없습니다.</Text>
          ) : null
        }
        ListFooterComponent={
          results.length > 0 ? (
            // Naver Open API TOS requires attribution when displaying results.
            <Text style={styles.attribution}>Powered by Naver</Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0DED7',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1850',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEE7',
  },
  name: {
    fontSize: 16,
    color: '#1A1850',
  },
  addr: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 2,
  },
  muted: {
    fontSize: 13,
    color: '#9A9A95',
    marginTop: 12,
    textAlign: 'center',
  },
  error: {
    fontSize: 12,
    color: '#C04545',
    marginBottom: 8,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  attribution: {
    paddingVertical: 12,
    fontSize: 10,
    color: '#9A9A95',
    textAlign: 'center',
  },
});
