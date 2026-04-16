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
import { Wallet, Mail, Lock, UserRound } from 'lucide-react-native';

import { notifyError, impactMedium } from '../../utils/haptics';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { useRegister } from '../../hooks/useRegister';
import { useThemeColors } from '../../hooks/useThemeColors';
import { STRINGS } from '../../constants/strings';

// ─── Validation ──────────────────────────────────────────────────────

function validateName(name: string): string | null {
  if (!name.trim()) return STRINGS.AUTH_ERROR_NAME_REQUIRED;
  return null;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return STRINGS.AUTH_ERROR_INVALID_EMAIL;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return STRINGS.AUTH_ERROR_INVALID_EMAIL;
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return STRINGS.AUTH_ERROR_WEAK_PASSWORD;
  return null;
}

// ─── Screen ──────────────────────────────────────────────────────────

function RegisterContent(): React.ReactElement {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate: registerMutate, isPending, isError, error, reset } = useRegister();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const handleRegister = (): void => {
    const nameError = validateName(fullName);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (nameError || emailError || passwordError) {
      setFieldErrors({
        name: nameError ?? undefined,
        email: emailError ?? undefined,
        password: passwordError ?? undefined,
      });
      notifyError();
      return;
    }

    setFieldErrors({});
    reset();
    impactMedium();
    registerMutate({
      email: email.trim().toLowerCase(),
      password,
      full_name: fullName.trim(),
    });
  };

  const goToLogin = (): void => {
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Brand */}
        <View className="items-center mb-10">
          <View
            className="h-16 w-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Wallet size={32} color={colors.textInverse} strokeWidth={2} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary }}>
            {STRINGS.REGISTER_TITLE}
          </Text>
          <Text
            className="mt-2"
            style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}
          >
            {STRINGS.REGISTER_SUBTITLE}
          </Text>
        </View>

        {/* Server error */}
        {isError && error ? (
          <View
            className="rounded-xl p-3 mb-4"
            style={{ backgroundColor: colors.expenseBg }}
          >
            <Text style={{ fontSize: 14, color: colors.expense, textAlign: 'center' }}>
              {error.message}
            </Text>
          </View>
        ) : null}

        {/* Full Name */}
        <View className="mb-4">
          <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
            {STRINGS.FULL_NAME_LABEL}
          </Text>
          <View
            className="flex-row items-center rounded-xl px-4"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: fieldErrors.name ? colors.expense : colors.border,
              height: 52,
            }}
          >
            <UserRound size={18} color={colors.textTertiary} strokeWidth={1.8} />
            <TextInput
              className="flex-1 ml-3"
              style={{ fontSize: 16, color: colors.textPrimary }}
              placeholder={STRINGS.FULL_NAME_PLACEHOLDER}
              placeholderTextColor={colors.textTertiary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              editable={!isPending}
            />
          </View>
          {fieldErrors.name ? (
            <Text className="mt-1" style={{ fontSize: 12, color: colors.expense }}>
              {fieldErrors.name}
            </Text>
          ) : null}
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
            {STRINGS.EMAIL_LABEL}
          </Text>
          <View
            className="flex-row items-center rounded-xl px-4"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: fieldErrors.email ? colors.expense : colors.border,
              height: 52,
            }}
          >
            <Mail size={18} color={colors.textTertiary} strokeWidth={1.8} />
            <TextInput
              className="flex-1 ml-3"
              style={{ fontSize: 16, color: colors.textPrimary }}
              placeholder={STRINGS.EMAIL_PLACEHOLDER}
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!isPending}
            />
          </View>
          {fieldErrors.email ? (
            <Text className="mt-1" style={{ fontSize: 12, color: colors.expense }}>
              {fieldErrors.email}
            </Text>
          ) : null}
        </View>

        {/* Password */}
        <View className="mb-6">
          <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
            {STRINGS.PASSWORD_LABEL}
          </Text>
          <View
            className="flex-row items-center rounded-xl px-4"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: fieldErrors.password ? colors.expense : colors.border,
              height: 52,
            }}
          >
            <Lock size={18} color={colors.textTertiary} strokeWidth={1.8} />
            <TextInput
              className="flex-1 ml-3"
              style={{ fontSize: 16, color: colors.textPrimary }}
              placeholder={STRINGS.PASSWORD_PLACEHOLDER}
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isPending}
            />
          </View>
          {fieldErrors.password ? (
            <Text className="mt-1" style={{ fontSize: 12, color: colors.expense }}>
              {fieldErrors.password}
            </Text>
          ) : null}
        </View>

        {/* Register Button */}
        <Pressable
          onPress={handleRegister}
          disabled={isPending}
          className="rounded-xl items-center justify-center"
          style={{
            backgroundColor: colors.primary,
            height: 52,
            opacity: isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textInverse }}>
            {isPending ? '...' : STRINGS.REGISTER_BUTTON}
          </Text>
        </Pressable>

        {/* Login link */}
        <Pressable onPress={goToLogin} className="mt-6 items-center">
          <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500' }}>
            {STRINGS.LOGIN_LINK}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function RegisterScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <RegisterContent />
    </ErrorBoundary>
  );
}
