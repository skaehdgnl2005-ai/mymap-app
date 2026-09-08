// Phase 8 — Pin detail popover.
//
// Opens on saved-pin tap at zoom ≥ 16 (D11 lock — zoom-gating happens
// in App.tsx via PersonalMapHandle.getZoom; this component is presence-
// driven and doesn't know about zoom). Delivers the D6 "source_url +
// OG cache = the magic" thesis: tap a pin from 3 months ago, instantly
// remember WHY you saved it.
//
// Inline BottomSheet (not BottomSheetModal) per Phase 7's Fabric +
// Reanimated 4 portal compatibility constraint (see PROJECT_STATE.md
// Phase 7 mid-phase decision on the swap).
//
// Snap points 25/60/95% per phase-8 doc. Initial expand at index 1
// (60%) — surfaces the OG card + name + key edit rows without the
// keyboard yet. Pulling to 95% gives note-typing room; collapsing to
// 25% peeks just the header for "I want to see the map underneath
// while keeping the popover handy."
//
// Edit pattern: drafts for free-text fields (name, note) — synced from
// `place` only on place.id change so parent re-renders mid-keystroke
// don't stomp the in-progress text. Picker fields (category, color_tag)
// patch immediately on tap. Visited toggle patches immediately.
//
// Attribution per D5b: "Powered by Naver" (phase-8 doc said Kakao —
// substitution carried through since D5b reopen.)

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementRef } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

import type { ColorTag, SavedPlace, SavedPlaceCategory } from '../../spec/data-shapes';
import type { SavedPlacePatch } from '../places/repo';
import { COLOR_OPTIONS } from './ColorTagSheet';

interface Props {
  place: SavedPlace | null;
  onClose: () => void;
  onPatch: (placeId: string, patch: SavedPlacePatch) => void;
  onDelete: (place: SavedPlace) => void;
}

// Non-anchor categories — same set + order as SaveModal. Anchor pins
// (HOME/SCHOOL/WORK) keep their category (re-categorizing an anchor
// from the popover would orphan the user's home-base; not a v1 path).
const EDITABLE_CATEGORIES: SavedPlaceCategory[] = [
  'CAFE',
  'RESTAURANT',
  'BAR',
  'SHOP',
  'LANDMARK',
  'OTHER',
];

const CATEGORY_LABELS: Record<SavedPlaceCategory, string> = {
  CAFE: '카페',
  RESTAURANT: '식당',
  BAR: '술집',
  SHOP: '가게',
  LANDMARK: '명소',
  OTHER: '기타',
  HOME: '집',
  SCHOOL: '학교',
  WORK: '회사',
};

// Korean ISO timestamp → "2026년 5월 14일" via Intl. Defensive against
// the rare null and the rarer invalid string (DB defaults guarantee
// saved_at is set, but visited_at can be null).
const formatKoreanDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

// OG status → display strategy. The 'fetching' state is the parent's
// to render (popover doesn't track fetch lifecycle); here we just
// switch on the persisted og_fetch_status field.
type OgDisplayKind = 'image' | 'gated' | 'link' | 'none';

const resolveOgKind = (place: SavedPlace): OgDisplayKind => {
  if (!place.source_url) return 'none';
  if (place.og_fetch_status === 'OK' && place.og_image_url) return 'image';
  if (place.og_fetch_status === 'GATED') return 'gated';
  return 'link';
};

// Hostname extraction without throwing on bad input. Returns the
// hostname or a best-effort tail of the URL.
const safeHostname = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// Domain → platform display name for the GATED card CTA.
const platformLabel = (url: string): string => {
  const host = safeHostname(url);
  if (host.includes('instagram')) return 'Instagram';
  if (host.includes('threads')) return 'Threads';
  return host;
};

export function PinDetailPopover({ place, onClose, onPatch, onDelete }: Props) {
  const ref = useRef<ElementRef<typeof BottomSheet>>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  // Open/close lifecycle from `place` presence.
  useEffect(() => {
    if (place) {
      void Haptics.selectionAsync();
      ref.current?.snapToIndex(1); // open at 60%
    } else {
      ref.current?.close();
    }
  }, [place]);

  // Re-sync drafts ONLY when the place id changes — i.e. a different
  // pin's popover is being shown. Re-syncing on every `place` object
  // change (e.g. when an optimistic visited toggle bumps the object
  // reference) would stomp in-flight TextInput keystrokes.
  const placeId = place?.id;
  useEffect(() => {
    if (place) {
      setNameDraft(place.name);
      setNoteDraft(place.note ?? '');
    }
  }, [placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderBackdrop = useMemo(
    () =>
      function Backdrop(props: BottomSheetBackdropProps) {
        return (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.35}
          />
        );
      },
    [],
  );

  // -- field commits --------------------------------------------------------

  const commitName = () => {
    if (!place) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === place.name) return;
    onPatch(place.id, { name: trimmed });
  };

  const commitNote = () => {
    if (!place) return;
    const trimmed = noteDraft.trim();
    const newNote = trimmed.length > 0 ? trimmed : null;
    if (newNote === place.note) return;
    onPatch(place.id, { note: newNote });
  };

  const pickCategory = (category: SavedPlaceCategory) => {
    if (!place || place.category === category) return;
    void Haptics.selectionAsync();
    onPatch(place.id, { category });
  };

  const pickColor = (color_tag: ColorTag) => {
    if (!place || place.color_tag === color_tag) return;
    void Haptics.selectionAsync();
    onPatch(place.id, { color_tag });
  };

  const toggleVisited = () => {
    if (!place) return;
    void Haptics.selectionAsync();
    const newVisited = !place.visited;
    onPatch(place.id, {
      visited: newVisited,
      visited_at: newVisited ? new Date().toISOString() : null,
    });
  };

  const openSource = () => {
    if (!place?.source_url) return;
    Linking.openURL(place.source_url).catch((err: unknown) => {
      console.warn('[popover] openURL failed:', err);
    });
  };

  const handleDelete = () => {
    if (!place) return;
    Alert.alert('정말 삭제할까요?', `"${place.name}" 핀이 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(place) },
    ]);
  };

  // -- render --------------------------------------------------------------

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['25%', '60%', '95%']}
      index={-1}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {place && (
          <>
            <OgCard place={place} onOpenSource={openSource} />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>이름</Text>
              <BottomSheetTextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                onBlur={commitName}
                style={styles.nameInput}
                placeholder="장소 이름"
                placeholderTextColor="#9A9A95"
                returnKeyType="done"
              />
            </View>

            {(place.address || place.region) && (
              <View style={styles.section}>
                {place.address && <Text style={styles.address}>{place.address}</Text>}
                {place.region && <Text style={styles.region}>{place.region}</Text>}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                메모 <Text style={styles.counter}>{noteDraft.length}/200</Text>
              </Text>
              <BottomSheetTextInput
                value={noteDraft}
                onChangeText={(t) => setNoteDraft(t.slice(0, 200))}
                onBlur={commitNote}
                style={styles.noteInput}
                placeholder="이 장소에 대한 메모를 남겨보세요"
                placeholderTextColor="#9A9A95"
                multiline
                maxLength={200}
              />
            </View>

            {/* Anchors keep their category fixed — re-categorizing an
                anchor pin would orphan the user's home base. */}
            {!isAnchorCategory(place.category) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>분야</Text>
                <View style={styles.chipRow}>
                  {EDITABLE_CATEGORIES.map((cat) => {
                    const active = place.category === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => pickCategory(cat)}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[styles.categoryChipText, active && styles.categoryChipTextActive]}
                        >
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>색상 태그</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((opt) => {
                  const active = place.color_tag === opt.tag;
                  return (
                    <Pressable
                      key={opt.tag}
                      onPress={() => pickColor(opt.tag)}
                      style={styles.colorPressable}
                      accessibilityRole="button"
                      accessibilityLabel={opt.label}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: opt.hex },
                          active && styles.colorSwatchActive,
                        ]}
                      />
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => pickColor('NONE')}
                  style={[styles.colorNone, place.color_tag === 'NONE' && styles.colorNoneActive]}
                  accessibilityRole="button"
                  accessibilityLabel="태그 없음"
                >
                  <Text style={styles.colorNoneText}>없음</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.rowSection}>
              <Text style={styles.rowLabel}>다녀왔어요</Text>
              <Switch
                value={place.visited}
                onValueChange={toggleVisited}
                trackColor={{ false: '#D1D1D6', true: '#2D2A6B' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Metadata block — read-only. */}
            <View style={styles.metaSection}>
              {(() => {
                const saved = formatKoreanDate(place.saved_at);
                return saved ? <Text style={styles.metaText}>저장 {saved}</Text> : null;
              })()}
              {place.visited &&
                (() => {
                  const visited = formatKoreanDate(place.visited_at);
                  return visited ? <Text style={styles.metaText}>방문 {visited}</Text> : null;
                })()}
            </View>

            {place.source_url && (
              <Pressable style={styles.sourceRow} onPress={openSource} accessibilityRole="link">
                <Text style={styles.sourceLabel}>원본 보기</Text>
                <Text style={styles.sourceUrl} numberOfLines={1}>
                  {safeHostname(place.source_url)}
                </Text>
              </Pressable>
            )}

            <Pressable onPress={handleDelete} style={styles.deleteRow} accessibilityRole="button">
              <Text style={styles.deleteText}>삭제</Text>
            </Pressable>

            <Text style={styles.attribution}>Powered by Naver</Text>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const isAnchorCategory = (c: SavedPlaceCategory): boolean =>
  c === 'HOME' || c === 'SCHOOL' || c === 'WORK';

// --- OG card --------------------------------------------------------------
// Three rendering branches (D7 R1/R2): image / gated platform / plain link.
// Plus a no-source branch where the card collapses (anchors have no
// source_url; the popover skips the card entirely).

interface OgCardProps {
  place: SavedPlace;
  onOpenSource: () => void;
}

function OgCard({ place, onOpenSource }: OgCardProps) {
  const kind = resolveOgKind(place);
  if (kind === 'none') return null;

  if (kind === 'image' && place.og_image_url) {
    return (
      <Pressable style={styles.ogCard} onPress={onOpenSource}>
        <Image
          source={{ uri: place.og_image_url }}
          style={styles.ogImage}
          contentFit="cover"
          // expo-image caches by URL on disk by default; explicit policy
          // 'disk' lets the cache persist across app launches without
          // re-downloading the same OG image each popover open (phase-8
          // task 10).
          cachePolicy="disk"
          transition={150}
        />
        {(place.og_title || place.og_description) && (
          <View style={styles.ogTextBlock}>
            {place.og_title && (
              <Text style={styles.ogTitle} numberOfLines={2}>
                {place.og_title}
              </Text>
            )}
            {place.og_description && (
              <Text style={styles.ogDescription} numberOfLines={2}>
                {place.og_description}
              </Text>
            )}
          </View>
        )}
      </Pressable>
    );
  }

  if (kind === 'gated' && place.source_url) {
    const platform = platformLabel(place.source_url);
    return (
      <Pressable style={styles.gatedCard} onPress={onOpenSource}>
        <View style={styles.gatedBadge}>
          <Text style={styles.gatedBadgeText}>{platform}</Text>
        </View>
        <Text style={styles.gatedCta}>{platform}에서 보기 →</Text>
      </Pressable>
    );
  }

  // 'link' — FAILED or null status with a non-null source_url.
  if (place.source_url) {
    return (
      <Pressable style={styles.linkCard} onPress={onOpenSource}>
        <Text style={styles.linkLabel}>외부 링크</Text>
        <Text style={styles.linkUrl} numberOfLines={1}>
          {safeHostname(place.source_url)}
        </Text>
      </Pressable>
    );
  }

  return null;
}

// --- styles ---------------------------------------------------------------

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FAFAFA',
  },
  handleIndicator: {
    backgroundColor: '#C7C7CC',
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  section: {
    paddingVertical: 10,
  },
  rowSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '500',
    marginBottom: 6,
  },
  counter: {
    fontSize: 12,
    color: '#9A9A95',
    fontWeight: '400',
  },
  rowLabel: {
    fontSize: 16,
    color: '#0E0E0E',
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0E0E0E',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  noteInput: {
    fontSize: 15,
    color: '#0E0E0E',
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    textAlignVertical: 'top',
  },
  address: {
    fontSize: 14,
    color: '#3C3C43',
  },
  region: {
    fontSize: 12,
    color: '#9A9A95',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: '#F0EEE7',
    borderWidth: 1,
    borderColor: '#E0DED7',
  },
  categoryChipActive: {
    backgroundColor: '#2D2A6B',
    borderColor: '#2D2A6B',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  colorPressable: {
    padding: 2,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#0E0E0E',
  },
  colorNone: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorNoneActive: {
    borderColor: '#0E0E0E',
  },
  colorNoneText: {
    fontSize: 13,
    color: '#6E6E73',
  },
  metaSection: {
    paddingVertical: 10,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9A9A95',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D1D6',
  },
  sourceLabel: {
    fontSize: 15,
    color: '#2D2A6B',
    fontWeight: '500',
  },
  sourceUrl: {
    fontSize: 13,
    color: '#9A9A95',
    flexShrink: 1,
    marginLeft: 12,
  },
  deleteRow: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D1D6',
  },
  deleteText: {
    fontSize: 15,
    color: '#E5484D',
    fontWeight: '500',
  },
  attribution: {
    marginTop: 16,
    fontSize: 10,
    color: '#9A9A95',
    textAlign: 'center',
  },
  // --- OG card variants ---
  ogCard: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0DED7',
  },
  ogImage: {
    width: '100%',
    aspectRatio: 1.91, // OG canonical 1200×630
    backgroundColor: '#F0EEE7',
  },
  ogTextBlock: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ogTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0E0E0E',
  },
  ogDescription: {
    fontSize: 13,
    color: '#6E6E73',
    marginTop: 4,
  },
  gatedCard: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gatedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#0E0E0E',
  },
  gatedBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  gatedCta: {
    fontSize: 14,
    color: '#2D2A6B',
    fontWeight: '500',
  },
  linkCard: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F2F2F7',
  },
  linkLabel: {
    fontSize: 12,
    color: '#9A9A95',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 14,
    color: '#0E0E0E',
  },
});
