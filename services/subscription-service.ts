import { supabase } from '../lib/supabase';

// ─── Subscription types ──────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface Subscription {
  id: string;
  user_id: string;
  provider_key: string | null;
  name: string;
  icon: string;
  color: string;
  amount: number;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  category: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionInput {
  name: string;
  provider_key?: string | null;
  icon: string;
  color: string;
  amount: number;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  category: string;
  notes?: string | null;
}

export interface SubscriptionPreset {
  key: string;
  name: string;
  nameAr: string;
  icon: string;
  logo: string | null;
  color: string;
  category: string;
  aliases: string[];
}

type SubscriptionIdentity = {
  provider_key?: string | null;
  name?: string | null;
};

const faviconLogo = (domain: string): string =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

const preset = (
  input: Omit<SubscriptionPreset, 'aliases'> & { aliases?: string[] },
): SubscriptionPreset => ({
  ...input,
  aliases: input.aliases ?? [],
});

// ─── Preset subscriptions for Saudi + regional/global services ──────

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  // Streaming
  preset({ key: 'netflix', name: 'Netflix', nameAr: 'نتفلكس', icon: '🎬', logo: faviconLogo('netflix.com'), color: '#E50914', category: 'Streaming', aliases: ['نتفلكس'] }),
  preset({ key: 'shahid_vip', name: 'Shahid', nameAr: 'شاهد', icon: '📺', logo: faviconLogo('shahid.mbc.net'), color: '#00A6A6', category: 'Streaming', aliases: ['shahid vip', 'شاهد vip', 'shahid', 'شاهد'] }),
  preset({ key: 'disney_plus', name: 'Disney+', nameAr: 'ديزني+', icon: '🏰', logo: faviconLogo('disneyplus.com'), color: '#113CCF', category: 'Streaming', aliases: ['disney plus', 'ديزني بلس'] }),
  preset({ key: 'youtube_premium', name: 'YouTube Premium', nameAr: 'يوتيوب بريميوم', icon: '▶️', logo: faviconLogo('youtube.com'), color: '#FF0000', category: 'Streaming', aliases: ['youtube premium', 'يوتيوب premium'] }),
  preset({ key: 'prime_video', name: 'Prime Video', nameAr: 'برايم فيديو', icon: '🎞️', logo: faviconLogo('primevideo.com'), color: '#1399FF', category: 'Streaming', aliases: ['amazon prime video', 'primevideo', 'برايم video'] }),
  preset({ key: 'apple_tv_plus', name: 'Apple TV+', nameAr: 'أبل تي في+', icon: '🍎', logo: faviconLogo('tv.apple.com'), color: '#111111', category: 'Streaming', aliases: ['apple tv plus', 'ابل تي في+', 'apple tv'] }),
  preset({ key: 'osn_plus', name: 'OSN+', nameAr: '+OSN', icon: '🎥', logo: faviconLogo('osnplus.com'), color: '#4C2D95', category: 'Streaming', aliases: ['osn plus', '+osn'] }),
  preset({ key: 'starzplay', name: 'STARZPLAY', nameAr: 'ستارزبلاي', icon: '⭐', logo: faviconLogo('starzplay.com'), color: '#6B21A8', category: 'Streaming', aliases: ['starz play', 'ستارز بلاي'] }),
  preset({ key: 'tod', name: 'TOD', nameAr: 'تود', icon: '⚽', logo: faviconLogo('tod.tv'), color: '#FF6B00', category: 'Streaming', aliases: ['tod tv', 'تود'] }),
  preset({ key: 'stc_tv', name: 'stc tv', nameAr: 'stc tv', icon: '📡', logo: faviconLogo('stc.com.sa'), color: '#4F008C', category: 'Streaming', aliases: ['jawwy tv', 'jawwytv', 'جوّي tv', 'جوي tv', 'stctv'] }),

  // Music & audio
  preset({ key: 'spotify', name: 'Spotify', nameAr: 'سبوتيفاي', icon: '🎵', logo: faviconLogo('spotify.com'), color: '#1DB954', category: 'Music', aliases: ['سبوتفاي'] }),
  preset({ key: 'apple_music', name: 'Apple Music', nameAr: 'أبل ميوزك', icon: '🎧', logo: faviconLogo('music.apple.com'), color: '#FA233B', category: 'Music', aliases: ['ابل ميوزك'] }),
  preset({ key: 'anghami', name: 'Anghami', nameAr: 'أنغامي', icon: '🎶', logo: faviconLogo('anghami.com'), color: '#6236FF', category: 'Music', aliases: ['انغامي'] }),
  preset({ key: 'youtube_music', name: 'YouTube Music', nameAr: 'يوتيوب ميوزك', icon: '🎼', logo: faviconLogo('music.youtube.com'), color: '#FF0033', category: 'Music', aliases: ['youtube music', 'يوتيوب music'] }),
  preset({ key: 'deezer', name: 'Deezer', nameAr: 'ديزر', icon: '🎚️', logo: faviconLogo('deezer.com'), color: '#A238FF', category: 'Music', aliases: ['deezer', 'ديزر'] }),
  preset({ key: 'audible', name: 'Audible', nameAr: 'أوديبل', icon: '🎙️', logo: faviconLogo('audible.com'), color: '#F7991C', category: 'Music', aliases: ['أودبل', 'audiobooks audible'] }),

  // Telecom
  preset({ key: 'stc', name: 'STC', nameAr: 'إس تي سي', icon: '📱', logo: faviconLogo('stc.com.sa'), color: '#4F008C', category: 'Telecom', aliases: ['اس تي سي', 'الاتصالات السعودية'] }),
  preset({ key: 'mobily', name: 'Mobily', nameAr: 'موبايلي', icon: '📱', logo: faviconLogo('mobily.com.sa'), color: '#00A651', category: 'Telecom', aliases: ['موبايلى'] }),
  preset({ key: 'zain_sa', name: 'Zain', nameAr: 'زين', icon: '📱', logo: faviconLogo('sa.zain.com'), color: '#7C3AED', category: 'Telecom', aliases: ['zain sa', 'زين السعودية'] }),
  preset({ key: 'virgin_mobile_ksa', name: 'Virgin Mobile', nameAr: 'فيرجن موبايل', icon: '📱', logo: faviconLogo('virginmobile.sa'), color: '#D71920', category: 'Telecom', aliases: ['virgin mobile ksa', 'فيرجن'] }),
  preset({ key: 'lebara_ksa', name: 'Lebara', nameAr: 'ليبارا', icon: '📱', logo: faviconLogo('lebara.sa'), color: '#FFC300', category: 'Telecom', aliases: ['lebara ksa', 'ليبرا'] }),
  preset({ key: 'vodafone_egypt', name: 'Vodafone Egypt', nameAr: 'فودافون مصر', icon: '📱', logo: faviconLogo('vodafone.com.eg'), color: '#E60000', category: 'Telecom', aliases: ['vodafone egypt', 'فودافون'] }),
  preset({ key: 'orange_egypt', name: 'Orange Egypt', nameAr: 'أورنج مصر', icon: '📱', logo: faviconLogo('orange.eg'), color: '#FF6600', category: 'Telecom', aliases: ['orange egypt', 'اورنج مصر'] }),
  preset({ key: 'etisalat_egypt', name: 'Etisalat Egypt', nameAr: 'اتصالات مصر', icon: '📱', logo: faviconLogo('etisalat.eg'), color: '#5F259F', category: 'Telecom', aliases: ['etisalat e&', 'اتصالات'] }),
  preset({ key: 'we_egypt', name: 'WE Egypt', nameAr: 'وي مصر', icon: '📱', logo: faviconLogo('te.eg'), color: '#6B2D8B', category: 'Telecom', aliases: ['we egypt', 'we', 'وي'] }),

  // Cloud
  preset({ key: 'icloud_plus', name: 'iCloud+', nameAr: 'آي كلاود+', icon: '☁️', logo: faviconLogo('icloud.com'), color: '#3693F3', category: 'Cloud', aliases: ['icloud', 'icloud plus', 'اي كلاود', 'آيكلاود'] }),
  preset({ key: 'google_one', name: 'Google One', nameAr: 'جوجل ون', icon: '☁️', logo: faviconLogo('one.google.com'), color: '#4285F4', category: 'Cloud', aliases: ['googleone', 'قوقل ون', 'جوجل one'] }),
  preset({ key: 'dropbox_plus', name: 'Dropbox', nameAr: 'دروب بوكس', icon: '📦', logo: faviconLogo('dropbox.com'), color: '#0061FF', category: 'Cloud', aliases: ['dropbox plus', 'دروبوكس'] }),

  // Productivity
  preset({ key: 'microsoft_365', name: 'Microsoft 365', nameAr: 'مايكروسوفت 365', icon: '💼', logo: faviconLogo('microsoft.com'), color: '#D83B01', category: 'Productivity', aliases: ['office 365', 'ms 365', 'مايكروسوفت ٣٦٥'] }),
  preset({ key: 'notion', name: 'Notion', nameAr: 'نوشن', icon: '📝', logo: faviconLogo('notion.so'), color: '#111111', category: 'Productivity', aliases: ['notion ai', 'نوتشن'] }),
  preset({ key: 'chatgpt_plus', name: 'ChatGPT Plus', nameAr: 'شات جي بي تي بلس', icon: '🤖', logo: faviconLogo('openai.com'), color: '#10A37F', category: 'Productivity', aliases: ['chatgpt', 'chat gpt plus', 'شات جي بي تي', 'جي بي تي بلس'] }),
  preset({ key: 'canva_pro', name: 'Canva Pro', nameAr: 'كانفا برو', icon: '🎨', logo: faviconLogo('canva.com'), color: '#00C4CC', category: 'Productivity', aliases: ['canva', 'كانفا'] }),
  preset({ key: 'adobe_creative_cloud', name: 'Adobe Creative Cloud', nameAr: 'أدوبي كريتيف كلاود', icon: '🖌️', logo: faviconLogo('adobe.com'), color: '#FF0000', category: 'Productivity', aliases: ['adobe cc', 'creative cloud', 'ادوبي'] }),
  preset({ key: 'linkedin_premium', name: 'LinkedIn Premium', nameAr: 'لينكدإن بريميوم', icon: '💼', logo: faviconLogo('linkedin.com'), color: '#0A66C2', category: 'Productivity', aliases: ['linkedin premium', 'لينكد ان بريميوم'] }),

  // Social
  preset({ key: 'snapchat_plus', name: 'Snapchat+', nameAr: 'سناب شات+', icon: '👻', logo: faviconLogo('snapchat.com'), color: '#FFFC00', category: 'Social', aliases: ['snapchat plus', 'سناب+', 'سناب شات بلس'] }),
  preset({ key: 'x_premium', name: 'X Premium', nameAr: 'إكس بريميوم', icon: '𝕏', logo: faviconLogo('x.com'), color: '#111111', category: 'Social', aliases: ['twitter blue', 'x premium+', 'اكس بريميوم'] }),
  preset({ key: 'telegram_premium', name: 'Telegram Premium', nameAr: 'تيليجرام بريميوم', icon: '✈️', logo: faviconLogo('telegram.org'), color: '#229ED9', category: 'Social', aliases: ['telegram premium', 'تلجرام بريميوم'] }),

  // Gaming
  preset({ key: 'playstation_plus', name: 'PlayStation Plus', nameAr: 'بلايستيشن بلس', icon: '🎮', logo: faviconLogo('playstation.com'), color: '#003791', category: 'Gaming', aliases: ['ps plus', 'بلاي ستيشن بلس'] }),
  preset({ key: 'xbox_game_pass', name: 'Xbox Game Pass', nameAr: 'إكس بوكس جيم باس', icon: '🎮', logo: faviconLogo('xbox.com'), color: '#107C10', category: 'Gaming', aliases: ['game pass', 'قيم باس', 'جيم باس'] }),
  preset({ key: 'apple_arcade', name: 'Apple Arcade', nameAr: 'أبل آركيد', icon: '🕹️', logo: faviconLogo('apple.com'), color: '#7C3AED', category: 'Gaming', aliases: ['ابل اركيد'] }),
  preset({ key: 'ea_play', name: 'EA Play', nameAr: 'إي إيه بلاي', icon: '🎮', logo: faviconLogo('ea.com'), color: '#FF4747', category: 'Gaming', aliases: ['ea', 'اي ايه بلاي'] }),
  preset({ key: 'nintendo_switch_online', name: 'Nintendo Switch Online', nameAr: 'نينتندو سويتش أونلاين', icon: '🎮', logo: faviconLogo('nintendo.com'), color: '#E60012', category: 'Gaming', aliases: ['switch online', 'نينتندو اونلاين'] }),

  // Shopping / memberships
  preset({ key: 'amazon_prime', name: 'Amazon Prime', nameAr: 'أمازون برايم', icon: '📦', logo: faviconLogo('amazon.sa'), color: '#FF9900', category: 'Shopping', aliases: ['prime', 'امازون برايم', 'amazon prime saudi'] }),
  preset({ key: 'noon_one', name: 'noon One', nameAr: 'نون One', icon: '🛒', logo: faviconLogo('noon.com'), color: '#F5D000', category: 'Shopping', aliases: ['noon one', 'نون ون', 'نون one'] }),
  preset({ key: 'careem_plus', name: 'Careem Plus', nameAr: 'كريم بلس', icon: '🚗', logo: faviconLogo('careem.com'), color: '#00C7B1', category: 'Delivery', aliases: ['careem+', 'careem plus', 'كريم+', 'كريم بلس'] }),
  preset({ key: 'noon_vip', name: 'Noon VIP', nameAr: 'نون VIP', icon: '🛍️', logo: faviconLogo('noon.com'), color: '#FEEE00', category: 'Shopping', aliases: ['noon vip', 'نون vip'] }),

  // Delivery
  preset({ key: 'jahez', name: 'Jahez', nameAr: 'جاهز', icon: '🛵', logo: faviconLogo('jahez.net'), color: '#FF474C', category: 'Delivery', aliases: ['جاهز'] }),
  preset({ key: 'hungerstation', name: 'HungerStation', nameAr: 'هنقرستيشن', icon: '🍔', logo: faviconLogo('hungerstation.com'), color: '#FF6A00', category: 'Delivery', aliases: ['hunger station', 'هنقر ستيشن'] }),
  preset({ key: 'talabat', name: 'Talabat', nameAr: 'طلبات', icon: '🍕', logo: faviconLogo('talabat.com'), color: '#FF5A00', category: 'Delivery', aliases: ['طلبات'] }),

  // Fitness
  preset({ key: 'gym_membership', name: 'Gym Membership', nameAr: 'اشتراك نادي رياضي', icon: '💪', logo: null, color: '#FF5722', category: 'Fitness', aliases: ['gym', 'جيم', 'gym membership'] }),
  preset({ key: 'fitness_time', name: 'Fitness Time', nameAr: 'فتنس تايم', icon: '🏋️', logo: faviconLogo('fitnesstime.com.sa'), color: '#DC2626', category: 'Fitness', aliases: ['وقت اللياقة', 'fitness time'] }),
  preset({ key: 'apple_fitness_plus', name: 'Apple Fitness+', nameAr: 'أبل فتنس+', icon: '🏃', logo: faviconLogo('apple.com'), color: '#7ED957', category: 'Fitness', aliases: ['apple fitness plus', 'ابل فتنس+'] }),

  // Security
  preset({ key: 'nordvpn', name: 'NordVPN', nameAr: 'نورد VPN', icon: '🔒', logo: faviconLogo('nordvpn.com'), color: '#4687FF', category: 'Security', aliases: ['nord vpn', 'نورد في بي ان'] }),
  preset({ key: 'expressvpn', name: 'ExpressVPN', nameAr: 'إكسبرس VPN', icon: '🔐', logo: faviconLogo('expressvpn.com'), color: '#DA3940', category: 'Security', aliases: ['express vpn', 'اكسبرس vpn'] }),

  // Insurance
  preset({ key: 'tawuniya', name: 'Tawuniya', nameAr: 'التعاونية', icon: '🏥', logo: faviconLogo('tawuniya.com.sa'), color: '#006838', category: 'Insurance', aliases: ['التعاونية للتأمين'] }),
  preset({ key: 'bupa_arabia', name: 'Bupa Arabia', nameAr: 'بوبا العربية', icon: '🏥', logo: faviconLogo('bupa.com.sa'), color: '#003DA5', category: 'Insurance', aliases: ['bupa', 'بوبا'] }),
];

export const SUBSCRIPTION_CATEGORIES = [
  'Streaming',
  'Music',
  'Telecom',
  'Cloud',
  'Productivity',
  'Social',
  'Gaming',
  'Shopping',
  'Fitness',
  'Security',
  'Delivery',
  'Insurance',
  'Other',
];

const PRESET_BY_KEY = new Map<string, SubscriptionPreset>();
const PROVIDER_KEY_BY_ALIAS = new Map<string, string>();

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function compactLookupValue(value: string): string {
  return normalizeLookupValue(value).replace(/[\s+().,'’\-_:/]/g, '');
}

function indexAlias(alias: string, providerKey: string): void {
  const normalized = normalizeLookupValue(alias);
  if (!normalized) return;
  PROVIDER_KEY_BY_ALIAS.set(normalized, providerKey);
  PROVIDER_KEY_BY_ALIAS.set(compactLookupValue(normalized), providerKey);
}

for (const item of SUBSCRIPTION_PRESETS) {
  PRESET_BY_KEY.set(item.key, item);
  indexAlias(item.key, item.key);
  indexAlias(item.name, item.key);
  indexAlias(item.nameAr, item.key);
  for (const alias of item.aliases) {
    indexAlias(alias, item.key);
  }
}

export function getSubscriptionPresetByKey(key: string | null | undefined): SubscriptionPreset | null {
  if (!key) return null;
  return PRESET_BY_KEY.get(key) ?? null;
}

export function resolveSubscriptionProviderKey(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return PROVIDER_KEY_BY_ALIAS.get(normalizeLookupValue(name))
    ?? PROVIDER_KEY_BY_ALIAS.get(compactLookupValue(name))
    ?? null;
}

export function getSubscriptionPreset(
  input: SubscriptionIdentity | string | null | undefined,
): SubscriptionPreset | null {
  if (!input) return null;
  if (typeof input === 'string') {
    return getSubscriptionPresetByKey(resolveSubscriptionProviderKey(input));
  }
  return getSubscriptionPresetByKey(input.provider_key)
    ?? getSubscriptionPresetByKey(resolveSubscriptionProviderKey(input.name));
}

export function getSubscriptionDisplayName(
  input: SubscriptionIdentity | string | null | undefined,
  isRTL: boolean,
): string {
  const matchedPreset = getSubscriptionPreset(input);
  if (matchedPreset) return isRTL ? matchedPreset.nameAr : matchedPreset.name;
  if (typeof input === 'string') return input ?? '';
  return input?.name ?? '';
}

export function getSubscriptionLogo(
  input: SubscriptionIdentity | string | null | undefined,
): string | null {
  return getSubscriptionPreset(input)?.logo ?? null;
}

export function normalizeSubscriptionRecord(subscription: Subscription): Subscription {
  const providerKey = subscription.provider_key ?? resolveSubscriptionProviderKey(subscription.name);
  if (providerKey === subscription.provider_key) return subscription;
  return { ...subscription, provider_key: providerKey };
}

function buildSubscriptionInsertPayload(
  input: CreateSubscriptionInput,
): Omit<Subscription, 'id' | 'user_id' | 'is_active' | 'created_at' | 'updated_at'> {
  const trimmedName = input.name.trim();
  const providerKey = input.provider_key ?? resolveSubscriptionProviderKey(trimmedName);
  const matchedPreset = getSubscriptionPresetByKey(providerKey);

  return {
    provider_key: providerKey,
    name: matchedPreset?.name ?? trimmedName,
    icon: matchedPreset?.icon ?? input.icon,
    color: matchedPreset?.color ?? input.color,
    amount: input.amount,
    billing_cycle: input.billing_cycle,
    next_billing_date: input.next_billing_date,
    category: matchedPreset?.category ?? input.category,
    notes: input.notes ?? null,
  };
}

function isMissingProviderKeyColumnError(errorMessage: string | undefined): boolean {
  return /provider_key/i.test(errorMessage ?? '') && /column/i.test(errorMessage ?? '');
}

// ─── CRUD ────────────────────────────────────────────────────────────

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('next_billing_date', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data as Subscription[]) ?? []).map(normalizeSubscriptionRecord);
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No authenticated session');

  const payload = buildSubscriptionInsertPayload(input);
  let insertPayload: Record<string, unknown> = {
    user_id: session.user.id,
    ...payload,
    is_active: true,
  };

  let { data, error } = await supabase
    .from('subscriptions')
    .insert(insertPayload)
    .select()
    .single();

  // Safe fallback while the remote table is still pre-migration.
  if (error && isMissingProviderKeyColumnError(error.message)) {
    const { provider_key: _providerKey, ...legacyPayload } = insertPayload;
    insertPayload = legacyPayload;
    const retry = await supabase
      .from('subscriptions')
      .insert(insertPayload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);
  return normalizeSubscriptionRecord(data as Subscription);
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function toggleSubscription(
  id: string,
  isActive: boolean,
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return normalizeSubscriptionRecord(data as Subscription);
}

/** Advance next_billing_date by the subscription's billing cycle. */
export async function markSubscriptionPaid(id: string): Promise<Subscription> {
  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !sub) throw new Error(fetchErr?.message ?? 'Subscription not found');

  const current = new Date(sub.next_billing_date);
  let next: Date;
  switch (sub.billing_cycle as BillingCycle) {
    case 'monthly':
      next = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      break;
    case 'quarterly':
      next = new Date(current.getFullYear(), current.getMonth() + 3, current.getDate());
      break;
    case 'yearly':
      next = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate());
      break;
  }

  const pad = (n: number): string => String(n).padStart(2, '0');
  const nextStr = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ next_billing_date: nextStr, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return normalizeSubscriptionRecord(data as Subscription);
}
