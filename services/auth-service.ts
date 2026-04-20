import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type {
  UserProfile,
  LoginCredentials,
  RegisterCredentials,
  OnboardingData,
} from '../types/index';

// Allow Expo to complete the OAuth session when the app is re-opened
WebBrowser.maybeCompleteAuthSession();

let lastHandledOAuthCode: string | null = null;
let pendingOAuthCode: string | null = null;
let pendingOAuthExchange: Promise<void> | null = null;

function getQueryParam(
  queryParams: ReturnType<typeof Linking.parse>['queryParams'],
  key: string,
): string | null {
  const value = queryParams?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getOAuthCallbackParams(url: string): {
  code: string | null;
  errorMessage: string | null;
} {
  const parsed = Linking.parse(url);
  const code = getQueryParam(parsed.queryParams, 'code');
  const error = getQueryParam(parsed.queryParams, 'error');
  const errorDescription = getQueryParam(parsed.queryParams, 'error_description');

  return {
    code,
    errorMessage: errorDescription
      ? decodeParam(errorDescription)
      : error
        ? decodeParam(error)
        : null,
  };
}

function isMissingPkceVerifierError(message: string): boolean {
  return /pkce code verifier not found in storage|pkce_code_verifier_not_found/i.test(message);
}

export function getOAuthRedirectUrl(): string {
  // Linking.createURL('/') returns:
  //   - In Expo Go:       exp://192.168.x.x:8081/--/
  //   - In production:    sanad:///
  // Add to Supabase → Auth → URL Configuration → Redirect URLs:
  //   exp://**
  //   sanad://**
  return Linking.createURL('/');
}

export async function handleOAuthRedirect(url: string | null | undefined): Promise<boolean> {
  if (!url) {
    return false;
  }

  // ── Implicit flow: tokens arrive in the URL hash fragment ─────────
  // e.g. exp://192.168.1.x:8081/--/#access_token=...&refresh_token=...
  const hashPart = url.split('#')[1] ?? '';
  if (hashPart) {
    const hashParams = new URLSearchParams(hashPart);
    const accessToken  = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const hashError    = hashParams.get('error_description') ?? hashParams.get('error');

    if (hashError) {
      throw new Error(decodeParam(hashError));
    }

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw new Error(error.message);
      return true;
    }
  }

  // ── PKCE / code flow: code arrives as a query param ───────────────
  // e.g. exp://192.168.1.x:8081/--/?code=...
  const { code, errorMessage } = getOAuthCallbackParams(url);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (!code) {
    return false;
  }

  if (lastHandledOAuthCode === code) {
    return true;
  }

  if (pendingOAuthCode === code && pendingOAuthExchange) {
    await pendingOAuthExchange;
    return true;
  }

  const exchangePromise = (async (): Promise<void> => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      if (isMissingPkceVerifierError(error.message)) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          lastHandledOAuthCode = code;
          return;
        }
      }

      throw new Error(error.message);
    }

    lastHandledOAuthCode = code;
  })();

  pendingOAuthCode = code;
  pendingOAuthExchange = exchangePromise;

  try {
    await exchangePromise;
    return true;
  } finally {
    if (pendingOAuthCode === code) {
      pendingOAuthCode = null;
      pendingOAuthExchange = null;
    }
  }
}

// ─── Session ─────────────────────────────────────────────────────────

export async function getSession(): Promise<{ userId: string } | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session) {
    return null;
  }

  return { userId: session.user.id };
}

// ─── Login ───────────────────────────────────────────────────────────

export async function login(credentials: LoginCredentials): Promise<UserProfile> {
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Login succeeded but no user was returned');
  }

  return fetchOrCreateProfile(authData.user.id, authData.user.email ?? '');
}

// ─── Register ────────────────────────────────────────────────────────

export async function register(
  credentials: RegisterCredentials,
): Promise<UserProfile> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    phone: credentials.phone,
    options: {
      data: { full_name: credentials.full_name, phone: credentials.phone },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Registration succeeded but no user was returned');
  }

  // The DB trigger `on_auth_user_created` (migration 036) creates the base
  // profile row via SECURITY DEFINER, bypassing RLS. We only UPDATE the extra
  // fields the trigger doesn't set (name_ar, date_of_birth, phone) — and only
  // if a session is active (email-confirm-required signups have no session yet).
  if (authData.session) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: credentials.full_name,
        name_ar: credentials.name_ar ?? null,
        date_of_birth: credentials.birth_date ?? null,
        phone: credentials.phone,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      // Non-fatal — the trigger already created the row; these fields can be
      // filled in during onboarding. Do not block signup.
      console.warn('[auth] profile update after signup failed:', profileError.message);
    }

    return fetchOrCreateProfile(authData.user.id, credentials.email);
  }

  // No session yet (email confirmation required). Return a synthetic profile
  // so the UI can show a "check your email" state. The real profile will be
  // fetched after the user confirms and signs in.
  return {
    id: authData.user.id,
    email: credentials.email,
    full_name: credentials.full_name,
    name_ar: credentials.name_ar ?? null,
    avatar_url: null,
    date_of_birth: credentials.birth_date ?? null,
    age_band: null,
    country_code: null,
    region_name: null,
    whatsapp_number: null,
    phone: credentials.phone ?? null,
    currency: 'SAR',
    locale: 'en-SA',
    onboarding_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as UserProfile;
}

// ─── Logout ──────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

// ─── Fetch user profile ──────────────────────────────────────────────

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile;
}

// ─── Fetch or create profile (handles pre-migration signups & Google OAuth) ──────

export async function fetchOrCreateProfile(
  userId: string,
  email?: string,
): Promise<UserProfile> {
  // The DB trigger `on_auth_user_created` creates the profile row atomically
  // on auth.users INSERT (SECURITY DEFINER, bypasses RLS). In rare races the
  // client can reach this function before the trigger commits, so retry a few
  // times with a short backoff before falling back to a client-side insert.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      return data as UserProfile;
    }

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows; any other error means we can't read — stop retrying
      throw new Error(error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
  }

  // Trigger never ran (e.g. remote DB missing migration 036). Fall back to a
  // client-side insert — requires an active session so auth.uid() matches.
  const authUser = (await supabase.auth.getUser()).data.user;
  const fullName = authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? 'User';
  const resolvedEmail = email ?? authUser?.email ?? '';

  const { error: insertError } = await supabase.from('profiles').upsert({
    id: userId,
    email: resolvedEmail,
    full_name: fullName,
    currency: 'SAR',
    locale: 'en-SA',
    onboarding_completed: false,
  }, { onConflict: 'id' });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return fetchUserProfile(userId);
}

// ─── Complete onboarding ─────────────────────────────────────────────

export async function completeOnboarding(
  userId: string,
  onboardingData: OnboardingData,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      currency: onboardingData.currency,
      locale: onboardingData.locale,
      country_code: onboardingData.country_code,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile;
}

// ─── Update profile settings ─────────────────────────────────────────

export interface UpdateProfileInput {
  full_name?: string;
  name_ar?: string | null;
  currency?: string;
  locale?: string;
  date_of_birth?: string | null;
  age_band?: string | null;
  country_code?: string | null;
  region_name?: string | null;
  whatsapp_number?: string | null;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile;
}

// ─── Listen to auth state changes ────────────────────────────────────

export function onAuthStateChange(
  callback: (event: string, userId: string | null) => void,
): { unsubscribe: () => void } {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user?.id ?? null);
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}

// ─── Google OAuth ─────────────────────────────────────────────────────

export async function loginWithGoogle(): Promise<void> {
  const redirectUrl = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      scopes: 'openid email profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error || !data.url) {
    throw new Error(error?.message ?? 'Failed to start Google sign-in');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error(
      `Google sign-in was blocked.\n\nAdd this URL to Supabase → Auth → Redirect URLs:\n${redirectUrl}`,
    );
  }

  if (result.type !== 'success') {
    return;
  }

  const handled = await handleOAuthRedirect(result.url);

  if (!handled) {
    throw new Error('Google sign-in returned no tokens. Ensure Supabase Redirect URLs includes exp://**');
  }

  // Ensure profile row exists for new Google sign-ins
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchOrCreateProfile(user.id, user.email ?? '');
    }
  } catch {
    // Non-fatal: onAuthStateChange SIGNED_IN will retry
  }
}

// ─── Apple Sign In ────────────────────────────────────────────────────

export async function loginWithApple(): Promise<void> {
  // Dynamically import to avoid crashing on Android where the module is unavailable
  const AppleAuthentication = await import('expo-apple-authentication');

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In did not return an identity token');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) {
    throw new Error(error.message);
  }
  // onAuthStateChange in useAuthBootstrap will handle the rest
}

// ─── Forgot Password ──────────────────────────────────────────────────

export async function sendPasswordReset(email: string): Promise<void> {
  const redirectUrl = Linking.createURL('/reset-password');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) {
    throw new Error(error.message);
  }
}
