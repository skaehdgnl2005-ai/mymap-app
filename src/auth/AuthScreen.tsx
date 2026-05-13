// Auth screen — first surface for unauthenticated users (Phase 6).
//
// Layout per Phase 6 doc § "Auth screen":
//   1. App brand mark + name
//   2. Apple Sign In button       ← WIRED in this phase via
//                                    expo-apple-authentication +
//                                    supabase.auth.signInWithIdToken
//   3. Google Sign In button      ← Still stub at v1 Phase 6; full impl
//                                    deferred to follow-up session or
//                                    Phase 10 (needs Google Cloud OAuth
//                                    client + SHA-1 + Supabase dashboard
//                                    config; ~1-2h dashboard work)
//   4. "이메일로 시작하기" form    ← Working (works against Supabase out
//                                    of the box; primary verification
//                                    path during Phase 6 dev)
//   5. Privacy / ToS links
//
// Apple Sign In availability:
//   - expo-apple-authentication ships AppleAuthenticationButton which we
//     MUST use (Apple HIG: Sign In With Apple buttons must use Apple's
//     official component on iOS — custom styling = App Store rejection).
//   - isAvailableAsync() returns true only on iOS 13+. On Android the
//     button is hidden entirely (no Android Sign In With Apple flow).
//   - End-to-end Apple flow requires a separate Supabase-dashboard config
//     step (Apple Service ID + return URL). Without it, the
//     signInWithIdToken call returns "Provider not enabled" — surfaced
//     verbatim so the dev knows which dashboard config remains.
//
// Email auth supports both sign-in and sign-up via a single toggle:
//   - signInWithPassword → existing account
//   - signUp             → new account (Supabase project's auth.config has
//                          enable_confirmations=false; account is usable
//                          immediately after signUp returns)
// Phase 10 adds: password recovery + email verification gate per PIPA.

import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../supabase';

type Mode = 'signin' | 'signup';

// v1 placeholder URLs — replaced at Phase 10 with real hosted policy pages
// (required for App Store + Play Store submission). The links exist now
// so the layout is final; copy is honest about the gap.
const PRIVACY_URL = 'https://jaguk.app/privacy';
const TOS_URL = 'https://jaguk.app/terms';

interface Props {
  // Optional callback fired after successful sign-in/up; the global session
  // listener in App.tsx is the canonical observer, but a parent component
  // can use this hook to trigger an immediate transition without waiting
  // for the listener's microtask.
  onAuthed?: () => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuthed }) => {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Apple Sign In: iOS 13+ only. Hidden on Android (where Apple offers no
  // native flow) and on iOS < 13 (unsupported).
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AppleAuthentication.isAvailableAsync()
      .then((v) => {
        if (!cancelled) setAppleAvailable(v);
      })
      .catch(() => {
        /* swallow — Android etc. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAppleSignIn = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setSubmitting(false);
        setError('Apple 인증 토큰을 받지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      setSubmitting(false);
      if (authError) {
        // Most common Phase 6 error: "Unsupported provider" / "Provider not
        // enabled" — Supabase dashboard config not landed yet. Surface
        // verbatim so the dev knows the remaining setup.
        setError(authError.message);
        return;
      }
      onAuthed?.();
    } catch (e) {
      setSubmitting(false);
      const msg = e instanceof Error ? e.message : String(e);
      // User dismissed the Apple modal → silent. ERR_REQUEST_CANCELED is
      // the documented error code; the message also contains "canceled".
      if (/canceled|cancelled|ERR_REQUEST_CANCELED/i.test(msg)) return;
      setError(msg);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    setSubmitting(true);
    setError(null);

    // Branch explicitly: signInWithPassword and signUp have different return
    // type unions (signUp's data.user may be present without a session when
    // email confirmation is required). Both share `data.session` shape, so
    // post-call handling is unified.
    const result =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        : await supabase.auth.signUp({ email: trimmedEmail, password });
    const { data, error: authError } = result;
    setSubmitting(false);
    if (authError) {
      setError(toFriendlyError(authError.message, mode));
      return;
    }
    if (!data.session) {
      // signUp with confirmations enabled returns no session. v1 project
      // config has enable_confirmations=false so this branch is defensive.
      setError('인증 메일을 확인해주세요.');
      return;
    }
    onAuthed?.();
  };

  const handleProviderStub = (provider: 'Apple' | 'Google'): void => {
    Alert.alert(
      `${provider} 로그인 준비 중`,
      '베타 기간에는 이메일로 가입해주세요. 정식 출시 때 추가될 예정이에요.',
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>자국</Text>
        <Text style={styles.brandTagline}>가본 곳, 가고 싶은 곳</Text>
      </View>

      <View style={styles.providers}>
        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleNativeBtn}
            onPress={handleAppleSignIn}
          />
        )}

        <Pressable
          style={[styles.providerBtn, styles.googleBtn]}
          onPress={() => handleProviderStub('Google')}
        >
          <Text style={styles.googleBtnText}>Google로 계속하기</Text>
        </Pressable>
        <Text style={styles.providerHint}>곧 추가될 예정이에요</Text>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>또는 이메일로</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
        placeholderTextColor="#9A9A95"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor="#9A9A95"
        secureTextEntry
        textContentType={mode === 'signin' ? 'password' : 'newPassword'}
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>{mode === 'signin' ? '로그인' : '회원가입'}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))} hitSlop={8}>
        <Text style={styles.toggle}>
          {mode === 'signin' ? '처음이세요? 회원가입' : '이미 계정이 있나요? 로그인'}
        </Text>
      </Pressable>

      <View style={styles.policyRow}>
        <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)} hitSlop={8}>
          <Text style={styles.policyLink}>개인정보처리방침</Text>
        </Pressable>
        <Text style={styles.policySep}>·</Text>
        <Pressable onPress={() => void Linking.openURL(TOS_URL)} hitSlop={8}>
          <Text style={styles.policyLink}>이용약관</Text>
        </Pressable>
      </View>
    </View>
  );
};

function toFriendlyError(msg: string, mode: Mode): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return mode === 'signin'
      ? '이메일이나 비밀번호가 일치하지 않아요.'
      : '가입 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
  }
  if (lower.includes('already registered') || lower.includes('user already')) {
    return '이미 가입된 이메일이에요. 로그인을 시도해보세요.';
  }
  if (lower.includes('password')) {
    return '비밀번호 형식을 확인해주세요.';
  }
  if (lower.includes('email')) {
    return '이메일 형식을 확인해주세요.';
  }
  return msg;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
    backgroundColor: '#FAFAFA',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brand: {
    fontSize: 40,
    fontWeight: '700',
    color: '#2D2A6B', // brand_indigo per D9
    letterSpacing: -0.5,
  },
  brandTagline: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B6B6B',
  },
  providers: {
    marginBottom: 8,
  },
  providerBtn: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appleNativeBtn: {
    // Apple HIG: button must be at least 30pt tall and use Apple's
    // official component. expo-apple-authentication's
    // AppleAuthenticationButton renders the wordmark/glyph internally.
    height: 48,
    marginBottom: 12,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0DED7',
    marginTop: 8,
  },
  googleBtnText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  providerHint: {
    fontSize: 11,
    color: '#9A9A95',
    textAlign: 'right',
    marginBottom: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D0CEC7',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#9A9A95',
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
    marginBottom: 10,
  },
  error: {
    fontSize: 13,
    color: '#C04545',
    marginTop: 4,
    marginBottom: 8,
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#2D2A6B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: '#2D2A6B',
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  policyLink: {
    fontSize: 12,
    color: '#6B6B6B',
    textDecorationLine: 'underline',
  },
  policySep: {
    marginHorizontal: 8,
    fontSize: 12,
    color: '#9A9A95',
  },
});
