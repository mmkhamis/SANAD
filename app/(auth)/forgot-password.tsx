import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { Mail, CheckCircle } from 'lucide-react-native';

import { notifyError, impactMedium } from '../../utils/haptics';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { useForgotPassword } from '../../hooks/useForgotPassword';
import { STRINGS } from '../../constants/strings';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { AnimatedAuroraBg } from '../../components/ui/AnimatedAuroraBg';
import { COLORS } from '../../constants/colors';

function validateEmail(email: string): string | null {
  if (!email.trim()) return STRINGS.AUTH_ERROR_INVALID_EMAIL;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : STRINGS.AUTH_ERROR_INVALID_EMAIL;
}

function ForgotPasswordContent(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate, isPending, isSuccess, error, reset } = useForgotPassword();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const t = useT();
  const { isRTL, textAlign, rowDir } = useRTL();

  const handleSubmit = (): void => {
    const err = validateEmail(email);
    if (err) { setEmailError(err); notifyError(); return; }
    setEmailError(null); reset(); impactMedium();
    mutate(email.trim().toLowerCase());
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.claude.bg0 }}>
      <AnimatedAuroraBg variant="form" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Center content on large screens */}
          <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 36, alignSelf: 'flex-start' }}>
            <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: 15 }}>{isRTL ? '→' : '←'} {t('COMMON_BACK')}</Text>
          </Pressable>

          {isSuccess ? (
            <Animated.View entering={FadeInDown.springify()} style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: 'rgba(52,211,153,0.20)', borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.40)',
                alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              }}>
                <CheckCircle size={36} color="#34d399" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' }}>{t('FORGOT_PASSWORD_CHECK_EMAIL')}</Text>
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.60)', marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
                {t('FORGOT_PASSWORD_CHECK_EMAIL_DESC')}{'\n'}
                <Text style={{ color: '#fff', fontWeight: '600' }}>{email}</Text>
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={{ marginTop: 32, height: 54, borderRadius: 16, paddingHorizontal: 40,
                  backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.claude.p600 }}>{t('AUTH_BACK_TO_SIGN_IN')}</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(80).springify()} style={{ marginBottom: 32 }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5, textAlign }}>
                  {t('FORGOT_PASSWORD_TITLE')}
                </Text>
                <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.60)', marginTop: 6, lineHeight: 24, textAlign }}>
                  {t('FORGOT_PASSWORD_SUBTITLE')}
                </Text>
              </Animated.View>

              {error ? (
                <View style={{
                  backgroundColor: 'rgba(251,113,133,0.18)', borderWidth: 1,
                  borderColor: 'rgba(251,113,133,0.35)', borderRadius: 14, padding: 12, marginBottom: 16,
                }}>
                  <Text style={{ color: '#fda4af', fontSize: 14, textAlign: 'center' }}>{error.message}</Text>
                </View>
              ) : null}

              <Animated.View entering={FadeInDown.delay(140).springify()} style={{ marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textAlign }}>
                  {t('AUTH_LABEL_EMAIL')}
                </Text>
                <View style={{
                  alignItems: 'center', height: 54, borderRadius: 16, paddingHorizontal: 16,
                  backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5,
                  flexDirection: rowDir,
                  borderColor: emailError ? '#fb7185' : 'rgba(255,255,255,0.22)',
                }}>
                  <Mail size={18} color="rgba(255,255,255,0.50)" strokeWidth={1.8} />
                  <TextInput
                    style={{ flex: 1, marginStart: 12, fontSize: 16, color: '#fff', textAlign }}
                    placeholder={t('AUTH_EMAIL_PLACEHOLDER')}
                    placeholderTextColor="rgba(255,255,255,0.40)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!isPending}
                    autoFocus
                  />
                </View>
                {emailError ? <Text style={{ color: '#fda4af', fontSize: 12, marginTop: 5, textAlign }}>{emailError}</Text> : null}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).springify()}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={isPending}
                  style={({ pressed }) => ({
                    height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: '#fff', opacity: isPending ? 0.7 : pressed ? 0.92 : 1,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.claude.p600 }}>
                    {isPending ? t('FORGOT_PASSWORD_SENDING') : STRINGS.FORGOT_PASSWORD_BUTTON}
                  </Text>
                </Pressable>
              </Animated.View>
            </>
          )}
          </View>{/* end contentCap */}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function ForgotPasswordScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <ForgotPasswordContent />
    </ErrorBoundary>
  );
}
