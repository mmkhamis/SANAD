import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { Mail, Lock, Eye, EyeOff, User, Calendar, Phone } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { notifyError, impactMedium, impactLight } from '../../utils/haptics';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { useLogin } from '../../hooks/useLogin';
import { useRegister } from '../../hooks/useRegister';
import { useOAuthLogin } from '../../hooks/useOAuthLogin';
import { STRINGS } from '../../constants/strings';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import { useT } from '../../lib/i18n';
import { useLanguageStore } from '../../store/language-store';
import { useRTL } from '../../hooks/useRTL';
import { COLORS } from '../../constants/colors';
import { AnimatedAuroraBg } from '../../components/ui/AnimatedAuroraBg';

// ─── Claude Design tokens (dark) ──────────────────────────────────────
const C = {
  bg:            COLORS.claude.bg0,
  surface:       COLORS.claude.bg2,
  card:          COLORS.claude.glass2,
  border:        COLORS.claude.stroke,
  text:          COLORS.claude.fg,
  textSecondary: COLORS.claude.fg3,
  textMuted:     COLORS.claude.fg4,
  accent:        COLORS.claude.p500,
  errorText:     COLORS.claude.red,
  errorBg:       'rgba(240,104,96,0.12)',
  errorBorder:   'rgba(240,104,96,0.30)',
};

// ─── Google Logo ──────────────────────────────────────────────────────

function GoogleLogo(): React.ReactElement {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <Path fill="none" d="M0 0h48v48H0z" />
    </Svg>
  );
}

// ─── Language Toggle ──────────────────────────────────────────────────

function LanguageToggle(): React.ReactElement {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  return (
    <View style={lt.row}>
      <Pressable
        onPress={() => { if (language !== 'ar') { impactLight(); setLanguage('ar'); } }}
        style={[lt.btn, language === 'ar' && lt.btnActive]}
        hitSlop={6}
      >
        <Text style={[lt.label, language === 'ar' && lt.labelActive]}>ع</Text>
      </Pressable>
      <Pressable
        onPress={() => { if (language !== 'en') { impactLight(); setLanguage('en'); } }}
        style={[lt.btn, language === 'en' && lt.btnActive]}
        hitSlop={6}
      >
        <Text style={[lt.label, language === 'en' && lt.labelActive]}>EN</Text>
      </Pressable>
    </View>
  );
}

const lt = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 3,
    backgroundColor: COLORS.claude.glass1, borderRadius: 10, padding: 3,
    borderWidth: 1, borderColor: COLORS.claude.stroke,
  },
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  btnActive: { backgroundColor: COLORS.claude.p500 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.claude.fg4 },
  labelActive: { color: '#fff' },
});

// ─── Input ────────────────────────────────────────────────────────────

function Input({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType = 'default',
  autoCapitalize = 'none', autoComplete, textContentType, hasError, editable = true,
  rightElement, rtl = false,
}: {
  icon: React.ReactElement; placeholder: string; value: string;
  onChangeText: (v: string) => void; secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad'; autoCapitalize?: 'none' | 'words';
  autoComplete?: string; textContentType?: string; hasError?: boolean;
  editable?: boolean; rightElement?: React.ReactElement; rtl?: boolean;
}): React.ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.input, focused && s.inputFocused, hasError && s.inputError,
      rtl && { flexDirection: 'row-reverse' }]}>
      <View style={{ marginRight: rtl ? 0 : 10, marginLeft: rtl ? 10 : 0 }}>{icon}</View>
      <TextInput
        style={[s.inputText, { textAlign: rtl ? 'right' : 'left' }]}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete as never}
        textContentType={textContentType as never}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightElement}
    </View>
  );
}

// ─── Birthday Picker ──────────────────────────────────────────────────

const CUR_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 90 }, (_, i) => CUR_YEAR - 5 - i);
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const PICKER_ITEM_H = 44;

function BirthdayPickerModal({
  visible, value, language, onConfirm, onClose,
}: {
  visible: boolean;
  value: Date | null;
  language: 'ar' | 'en';
  onConfirm: (d: Date) => void;
  onClose: () => void;
}): React.ReactElement {
  const init = value ?? new Date(CUR_YEAR - 25, 0, 1);
  const [selYear, setSelYear] = useState(init.getFullYear());
  const [selMonth, setSelMonth] = useState(init.getMonth());
  const [selDay, setSelDay] = useState(init.getDate());

  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const validDay = Math.min(selDay, daysInMonth);
  const months = language === 'ar' ? MONTHS_AR : MONTHS_EN;
  const t = useT();

  const dayRef = useRef<ScrollView>(null);
  const monRef = useRef<ScrollView>(null);
  const yrRef  = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      dayRef.current?.scrollTo({ y: (validDay - 1) * PICKER_ITEM_H, animated: false });
      monRef.current?.scrollTo({ y: selMonth * PICKER_ITEM_H, animated: false });
      const yIdx = BIRTH_YEARS.indexOf(selYear);
      if (yIdx >= 0) yrRef.current?.scrollTo({ y: yIdx * PICKER_ITEM_H, animated: false });
    }, 120);
    return () => clearTimeout(timer);
  }, [visible]);

  const confirm = (): void => {
    onConfirm(new Date(selYear, selMonth, validDay));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pb.overlay}>
        <Pressable style={pb.backdrop} onPress={onClose} />
        <View style={pb.sheet}>
          <View style={pb.handle} />
          <Text style={pb.title}>{t('AUTH_BIRTHDAY_MODAL_TITLE')}</Text>
          <View style={pb.cols}>
            {/* Day */}
            <ScrollView ref={dayRef} style={pb.col} showsVerticalScrollIndicator={false}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                <Pressable key={d} onPress={() => setSelDay(d)}
                  style={[pb.item, d === validDay && pb.itemSel]}>
                  <Text style={[pb.itemTxt, d === validDay && pb.itemTxtSel]}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* Month */}
            <ScrollView ref={monRef} style={pb.col} showsVerticalScrollIndicator={false}>
              {months.map((m, i) => (
                <Pressable key={i} onPress={() => setSelMonth(i)}
                  style={[pb.item, i === selMonth && pb.itemSel]}>
                  <Text style={[pb.itemTxt, i === selMonth && pb.itemTxtSel]}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* Year */}
            <ScrollView ref={yrRef} style={pb.col} showsVerticalScrollIndicator={false}>
              {BIRTH_YEARS.map(y => (
                <Pressable key={y} onPress={() => setSelYear(y)}
                  style={[pb.item, y === selYear && pb.itemSel]}>
                  <Text style={[pb.itemTxt, y === selYear && pb.itemTxtSel]}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Pressable onPress={confirm} style={pb.confirm}>
            <Text style={pb.confirmTxt}>{t('AUTH_CONFIRM')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const pb = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#1a1f2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(51,65,85,0.45)',
  },
  handle: {
    width: 36, height: 4, backgroundColor: 'rgba(148,163,184,0.25)',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#F1F5F9', textAlign: 'center', marginBottom: 14 },
  cols: { flexDirection: 'row', height: 220, gap: 6 },
  col: { flex: 1 },
  item: { height: PICKER_ITEM_H, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  itemSel: { backgroundColor: 'rgba(139,92,246,0.18)' },
  itemTxt: { fontSize: 15, color: '#94A3B8' },
  itemTxtSel: { color: '#8B5CF6', fontWeight: '700' },
  confirm: {
    marginTop: 14, height: 50, borderRadius: 14,
    backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center',
  },
  confirmTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ─── Validation ──────────────────────────────────────────────────────

function validateEmail(v: string): string | null {
  if (!v.trim()) return STRINGS.AUTH_ERROR_INVALID_EMAIL;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : STRINGS.AUTH_ERROR_INVALID_EMAIL;
}
function validatePassword(v: string): string | null {
  return v.length < 8 ? STRINGS.AUTH_ERROR_WEAK_PASSWORD : null;
}
function validateName(v: string): string | null {
  return v.trim().length < 2 ? STRINGS.AUTH_ERROR_NAME_REQUIRED : null;
}
function validatePhone(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return STRINGS.AUTH_ERROR_PHONE_REQUIRED;
  // Accept +, digits, spaces, dashes, parens — require at least 7 actual digits.
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return STRINGS.AUTH_ERROR_PHONE_INVALID;
  if (!/^\+?[\d\s\-()]+$/.test(trimmed)) return STRINGS.AUTH_ERROR_PHONE_INVALID;
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatBirthday(d: Date, language: 'ar' | 'en'): string {
  const day = d.getDate();
  const month = language === 'ar' ? MONTHS_AR[d.getMonth()] : MONTHS_EN[d.getMonth()];
  const year = d.getFullYear();
  return language === 'ar' ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
}

// ─── Screen ──────────────────────────────────────────────────────────

function AuthContent(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const { isRTL, textAlign, rowDir } = useRTL();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  // Sign in fields
  const [siEmail, setSiEmail] = useState('');
  const [siPw, setSiPw]       = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  const [siErr, setSiErr]     = useState<{ email?: string; password?: string }>({});

  // Sign up fields
  const [suFirstName, setSuFirstName] = useState('');
  const [suLastName,  setSuLastName]  = useState('');
  const [suEmail, setSuEmail]         = useState('');
  const [suPhone, setSuPhone]         = useState('');
  const [suPw, setSuPw]               = useState('');
  const [suShowPw, setSuShowPw]       = useState(false);
  const [suBirthday, setSuBirthday]   = useState<Date | null>(null);
  const [suBirthdayOpen, setSuBirthdayOpen] = useState(false);
  const [suErr, setSuErr]             = useState<{
    firstName?: string; lastName?: string;
    email?: string; phone?: string; password?: string; birthday?: string;
  }>({});

  const { mutate: doLogin,    isPending: loginPending,    error: loginErr,    reset: loginReset    } = useLogin();
  const { mutate: doRegister, isPending: registerPending, error: registerErr, reset: registerReset } = useRegister();
  const { mutate: doOAuth,    isPending: oauthPending,    error: oauthErr,    reset: oauthReset    } = useOAuthLogin();

  const busy = loginPending || registerPending || oauthPending;

  const handleSignIn = (): void => {
    const ee = validateEmail(siEmail), pe = validatePassword(siPw);
    if (ee || pe) { setSiErr({ email: ee ?? undefined, password: pe ?? undefined }); notifyError(); return; }
    setSiErr({}); loginReset(); impactMedium();
    doLogin({ email: siEmail.trim().toLowerCase(), password: siPw });
  };

  const handleSignUp = (): void => {
    const fe = validateName(suFirstName);
    const le = validateName(suLastName);
    const ee = validateEmail(suEmail);
    const phe = validatePhone(suPhone);
    const pe = validatePassword(suPw);
    const be = suBirthday ? null : STRINGS.AUTH_ERROR_BIRTHDAY_REQUIRED;
    if (fe || le || ee || phe || pe || be) {
      setSuErr({
        firstName: fe ?? undefined, lastName: le ?? undefined,
        email: ee ?? undefined, phone: phe ?? undefined,
        password: pe ?? undefined, birthday: be ?? undefined,
      });
      notifyError();
      return;
    }
    setSuErr({}); registerReset(); impactMedium();
    const fullName = `${suFirstName.trim()} ${suLastName.trim()}`;
    const birthDate = suBirthday ? suBirthday.toISOString().split('T')[0] : undefined;
    doRegister({
      full_name: fullName,
      email: suEmail.trim().toLowerCase(),
      password: suPw,
      birth_date: birthDate,
      phone: suPhone.trim(),
    });
  };

  const handleOAuth = (provider: 'google'): void => {
    oauthReset(); impactMedium(); doOAuth(provider);
  };

  const switchTab = (next: 'signin' | 'signup'): void => {
    setSiErr({}); setSuErr({}); loginReset(); registerReset(); oauthReset(); setTab(next);
  };

  const activeErr = tab === 'signin' ? (loginErr ?? oauthErr) : (registerErr ?? oauthErr);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <AnimatedAuroraBg variant="form" intensity={0.85} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.contentCap}>

            {/* Logo row + language toggle */}
            <Animated.View entering={FadeInDown.delay(0).springify()} style={s.logoRow}>
              <View style={s.logoBox}>
                <Text style={{ fontSize: 20 }}>💜</Text>
              </View>
              <Text style={s.wordmark}>Wallet</Text>
              <View style={{ flex: 1 }} />
              <LanguageToggle />
            </Animated.View>

            {/* Headline */}
            <Animated.View entering={FadeInDown.delay(50).springify()} style={{ marginBottom: 24 }}>
              <Text style={[s.title, { textAlign }]}>
                {tab === 'signin' ? t('AUTH_WELCOME_BACK_HEADLINE') : t('AUTH_GET_STARTED_HEADLINE')}
              </Text>
              <Text style={[s.subtitle, { textAlign }]}>
                {tab === 'signin' ? t('AUTH_SIGNIN_SUBTITLE') : t('AUTH_SIGNUP_SUBTITLE')}
              </Text>
            </Animated.View>

            {/* Form card */}
            <Animated.View entering={FadeInDown.delay(90).springify()} style={s.card}>

              {/* Error banner */}
              {activeErr ? (
                <View style={s.errBanner}>
                  <Text style={s.errBannerText}>{activeErr.message}</Text>
                </View>
              ) : null}

              {tab === 'signin' ? (
                <>
                  <View style={s.field}>
                    <Text style={[s.label, { textAlign }]}>
                      {t('AUTH_LABEL_EMAIL')}
                    </Text>
                    <Input icon={<Mail size={16} color={C.textMuted} strokeWidth={1.8} />}
                      placeholder={t('AUTH_EMAIL_PLACEHOLDER')}
                      value={siEmail} onChangeText={setSiEmail}
                      keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
                      hasError={!!siErr.email} editable={!busy} />
                    {siErr.email ? <Text style={[s.fieldErr, { textAlign }]}>{siErr.email}</Text> : null}
                  </View>

                  <View style={s.field}>
                    <View style={[s.labelRow, { flexDirection: rowDir }]}>
                      <Text style={s.label}>{t('AUTH_LABEL_PASSWORD')}</Text>
                      <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
                        <Text style={s.forgotLink}>{t('AUTH_FORGOT_SHORT')}</Text>
                      </Pressable>
                    </View>
                    <Input icon={<Lock size={16} color={C.textMuted} strokeWidth={1.8} />}
                      placeholder="••••••••" value={siPw} onChangeText={setSiPw}
                      secureTextEntry={!siShowPw} autoComplete="password" textContentType="password"
                      hasError={!!siErr.password} editable={!busy}
                      rightElement={
                        <Pressable onPress={() => setSiShowPw(p => !p)} hitSlop={8} style={{ padding: 4 }}>
                          {siShowPw ? <EyeOff size={16} color={C.textMuted} strokeWidth={1.8} /> : <Eye size={16} color={C.textMuted} strokeWidth={1.8} />}
                        </Pressable>
                      } />
                    {siErr.password ? <Text style={[s.fieldErr, { textAlign }]}>{siErr.password}</Text> : null}
                  </View>

                  {/* Primary CTA */}
                  <Pressable onPress={handleSignIn} disabled={busy}
                    style={({ pressed }) => [s.cta, { opacity: busy ? 0.7 : pressed ? 0.88 : 1 }]}>
                    {loginPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.ctaText}>{t('AUTH_SIGN_IN' as any)}</Text>}
                  </Pressable>

                  {/* Secondary: Sign up link */}
                  <View style={[s.switchRow, { flexDirection: rowDir }]}>
                    <Text style={s.switchText}>{t('AUTH_NO_ACCOUNT' as any)}</Text>
                    <Pressable onPress={() => switchTab('signup')} hitSlop={8}>
                      <Text style={s.switchLink}>{t('AUTH_SIGN_UP' as any)}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  {/* First name */}
                  <View style={s.field}>
                    <Text style={[s.label, { textAlign }]}>
                      {t('AUTH_LABEL_FIRST_NAME')}
                    </Text>
                    <Input icon={<User size={16} color={C.textMuted} strokeWidth={1.8} />}
                      placeholder={t('AUTH_FIRST_NAME_PLACEHOLDER')}
                      value={suFirstName} onChangeText={setSuFirstName}
                      autoCapitalize="words" autoComplete="given-name" textContentType="givenName"
                      hasError={!!suErr.firstName} editable={!busy} rtl={isRTL} />
                    {suErr.firstName ? <Text style={[s.fieldErr, { textAlign }]}>{suErr.firstName}</Text> : null}
                  </View>

                  {/* Last name */}
                  <View style={s.field}>
                    <Text style={[s.label, { textAlign }]}>
                      {t('AUTH_LABEL_LAST_NAME')}
                    </Text>
                    <Input icon={<User size={16} color={C.textMuted} strokeWidth={1.8} />}
                      placeholder={t('AUTH_LAST_NAME_PLACEHOLDER')}
                      value={suLastName} onChangeText={setSuLastName}
                      autoCapitalize="words" autoComplete="family-name" textContentType="familyName"
                      hasError={!!suErr.lastName} editable={!busy} rtl={isRTL} />
                    {suErr.lastName ? <Text style={[s.fieldErr, { textAlign }]}>{suErr.lastName}</Text> : null}
                  </View>

                  {/* Email */}
                  <View style={s.field}>
                    <Text style={[s.label, { textAlign }]}>
                      {t('AUTH_LABEL_EMAIL')}
                    </Text>
                    <Input icon={<Mail size={16} color={C.textMuted} strokeWidth={1.8} />}
                      placeholder={t('AUTH_EMAIL_PLACEHOLDER')}
                      value={suEmail} onChangeText={setSuEmail}
                      keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
                      hasError={!!suErr.email} editable={!busy} />
                    {suErr.email ? <Text style={[s.fieldErr, { textAlign }]}>{suErr.email}</Text> : null}
                  </View>

                  {/* Phone */}
                  <View style={s.field}>
                    <Text style={[s.label, { textAlign }]}>
                      {t('AUTH_LABEL_PHONE')}
                    </Text>
                    <Input icon={<Phone size={16} color={C.textMuted} strokeWidth={1.8} />}
                      placeholder={t('AUTH_PHONE_PLACEHOLDER')}
                      value={suPhone} onChangeText={setSuPhone}
                      keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
                      hasError={!!suErr.phone} editable={!busy} />
                    {suErr.phone ? <Text style={[s.fieldErr, { textAlign }]}>{suErr.phone}</Text> : null}
                  </View>

                  {/* Password */}
                  <View style={s.field}>
                    <Text style={[s.label, { textAlign }]}>
                      {t('AUTH_LABEL_PASSWORD')}
                    </Text>
                    <Input icon={<Lock size={16} color={C.textMuted} strokeWidth={1.8} />}
                      placeholder={t('AUTH_PASSWORD_MIN')}
                      value={suPw} onChangeText={setSuPw}
                      secureTextEntry={!suShowPw} autoComplete="new-password" textContentType="newPassword"
                      hasError={!!suErr.password} editable={!busy}
                      rightElement={
                        <Pressable onPress={() => setSuShowPw(p => !p)} hitSlop={8} style={{ padding: 4 }}>
                          {suShowPw ? <EyeOff size={16} color={C.textMuted} strokeWidth={1.8} /> : <Eye size={16} color={C.textMuted} strokeWidth={1.8} />}
                        </Pressable>
                      } />
                    {suErr.password ? <Text style={[s.fieldErr, { textAlign }]}>{suErr.password}</Text> : null}
                  </View>

                  {/* Birthday */}
                  <View style={s.field}>
                    <Text style={[s.label, { textAlign }]}>
                      {t('AUTH_LABEL_BIRTHDAY')}
                    </Text>
                    <Pressable
                      onPress={() => { if (!busy) setSuBirthdayOpen(true); }}
                      style={[s.input, suErr.birthday && s.inputError,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    >
                      <View style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }}>
                        <Calendar size={16} color={C.textMuted} strokeWidth={1.8} />
                      </View>
                      <Text style={[s.inputText, { color: suBirthday ? C.text : C.textMuted, flex: 1, textAlign }]}>
                        {suBirthday
                          ? formatBirthday(suBirthday, language)
                          : t('AUTH_BIRTHDAY_PLACEHOLDER')}
                      </Text>
                    </Pressable>
                    {suErr.birthday ? <Text style={[s.fieldErr, { textAlign }]}>{suErr.birthday}</Text> : null}
                  </View>

                  <BirthdayPickerModal
                    visible={suBirthdayOpen}
                    value={suBirthday}
                    language={language}
                    onConfirm={(d) => { setSuBirthday(d); setSuErr(e => ({ ...e, birthday: undefined })); }}
                    onClose={() => setSuBirthdayOpen(false)}
                  />

                  {/* Primary CTA */}
                  <Pressable onPress={handleSignUp} disabled={busy}
                    style={({ pressed }) => [s.cta, { opacity: busy ? 0.7 : pressed ? 0.88 : 1 }]}>
                    {registerPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.ctaText}>{t('AUTH_CREATE_ACCOUNT' as any)}</Text>}
                  </Pressable>

                  {/* Secondary: Sign in link */}
                  <View style={[s.switchRow, { flexDirection: rowDir }]}>
                    <Text style={s.switchText}>{t('AUTH_HAVE_ACCOUNT' as any)}</Text>
                    <Pressable onPress={() => switchTab('signin')} hitSlop={8}>
                      <Text style={s.switchLink}>{t('AUTH_SIGN_IN_LINK' as any)}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Divider */}
              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>{t('AUTH_OR_CONTINUE')}</Text>
                <View style={s.dividerLine} />
              </View>

              {/* Social — Google only */}
              <Pressable onPress={() => handleOAuth('google')} disabled={busy}
                style={({ pressed }) => [s.socialBtn, { opacity: busy ? 0.6 : pressed ? 0.75 : 1 }]}>
                {oauthPending
                  ? <ActivityIndicator color={C.text} size="small" />
                  : <><GoogleLogo /><Text style={s.socialText}>Google</Text></>}
              </Pressable>

            </Animated.View>

            {/* Legal */}
            <Animated.View entering={FadeInDown.delay(150).springify()} style={s.legalRow}>
              <Text style={s.legalText}>
                {t('AUTH_LEGAL_PREFIX')} <Text style={s.legalLink}>{t('AUTH_LEGAL_TERMS')}</Text> {t('AUTH_LEGAL_AND')} <Text style={s.legalLink}>{t('AUTH_LEGAL_PRIVACY')}</Text>
              </Text>
            </Animated.View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function LoginScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <AuthContent />
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  contentCap: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { fontSize: 22, fontWeight: '700', color: '#F1F5F9', letterSpacing: -0.3 },

  title: { fontSize: 30, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#94A3B8' },

  // Card
  card: {
    backgroundColor: '#151b27', borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(51,65,85,0.45)',
    padding: 20, marginBottom: 20,
  },

  // Error
  errBanner: {
    backgroundColor: 'rgba(251,113,133,0.12)',
    borderWidth: 1, borderColor: 'rgba(251,113,133,0.30)',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errBannerText: { color: '#FDA4AF', fontSize: 13, textAlign: 'center' },

  // Fields
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1.2, marginBottom: 8 },
  labelRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotLink: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
  fieldErr: { color: '#FDA4AF', fontSize: 12, marginTop: 5 },

  // Input
  input: {
    flexDirection: 'row', alignItems: 'center', height: 50,
    borderRadius: 13, paddingHorizontal: 14,
    backgroundColor: '#1e2535',
    borderWidth: 1.5, borderColor: 'rgba(51,65,85,0.45)',
  },
  inputFocused: { borderColor: 'rgba(139,92,246,0.55)', backgroundColor: '#252d3f' },
  inputError: { borderColor: 'rgba(251,113,133,0.45)' },
  inputText: { flex: 1, fontSize: 15, color: '#F1F5F9' },

  // CTA
  cta: {
    height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 2,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

  // Switch (sign up / sign in) link
  switchRow: { alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16 },
  switchText: { fontSize: 14, color: '#64748B' },
  switchLink: { fontSize: 14, color: '#8B5CF6', fontWeight: '600' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(51,65,85,0.35)' },
  dividerText: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  // Social (single full-width Google button)
  socialBtn: {
    height: 48, borderRadius: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1e2535', borderWidth: 1.5, borderColor: 'rgba(51,65,85,0.45)',
  },
  socialText: { fontSize: 14, fontWeight: '600', color: '#F1F5F9' },

  // Legal
  legalRow: { alignItems: 'center', paddingHorizontal: 16 },
  legalText: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  legalLink: { color: '#8B5CF6', fontWeight: '600' },
});
