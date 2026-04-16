import { supabase } from '../lib/supabase';
import type {
  UserProfile,
  LoginCredentials,
  RegisterCredentials,
  OnboardingData,
} from '../types/index';

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
    options: {
      data: { full_name: credentials.full_name },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Registration succeeded but no user was returned');
  }

  // Create the profile row in our profiles table
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: credentials.email,
    full_name: credentials.full_name,
    currency: 'SAR',
    locale: 'en-SA',
    onboarding_completed: false,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  return fetchUserProfile(authData.user.id);
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

// ─── Fetch or create profile (handles pre-migration signups) ─────────

async function fetchOrCreateProfile(
  userId: string,
  email: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (data && !error) {
    return data as UserProfile;
  }

  // Profile doesn't exist — create it (user registered before tables existed)
  const fullName =
    (await supabase.auth.getUser()).data.user?.user_metadata?.full_name ?? 'User';

  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    currency: 'SAR',
    locale: 'en-SA',
    onboarding_completed: false,
  });

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
