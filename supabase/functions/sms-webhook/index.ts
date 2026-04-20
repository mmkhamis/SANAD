// Supabase Edge Function: sms-webhook
//
// Silent SMS ingestion for iOS Shortcuts.
// Called via "Get Contents of URL" action — runs in the background without
// opening the SANAD app. Parses the SMS, inserts a transaction, and
// delivers a push notification to the user's device.
//
// URL format:
//   https://<project>.supabase.co/functions/v1/sms-webhook?token=<uuid>&text=<MESSAGE>
//
// The token is a per-user uuid stored on `profiles.sms_webhook_token`.
// It is the only credential — do NOT log it or echo it in responses.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ─── Minimal parser (tracks utils/sms-parser.ts behaviour) ────────────

const CURRENCIES = ['SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'USD', 'EUR', 'GBP', 'LE', 'ج.م', 'جنيه', 'ر.س', 'ريال', 'د.إ', 'درهم'];
const CURRENCY_RE = CURRENCIES.map((s) => s.replace(/\./g, '\\.')).join('|');

function normDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function parseAmount(text: string): number | null {
  const t = normDigits(text);
  const patterns = [
    new RegExp(`(?:${CURRENCY_RE})\\s*([\\d,]+\\.?\\d*)`, 'i'),
    new RegExp(`([\\d,]+\\.?\\d*)\\s*(?:${CURRENCY_RE})`, 'i'),
    /(?:amount|مبلغ|قيمة)[:\s]*([\d,]+\.?\d*)/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

const EXPENSE_WORDS = ['purchase', 'spent', 'paid', 'debit', 'debited', 'withdrawn', 'charged', 'pos', 'خصم', 'شراء', 'سحب', 'دفع'];
const INCOME_WORDS = ['received', 'credited', 'credit', 'deposit', 'salary', 'refund', 'cashback', 'إيداع', 'راتب', 'تحويل وارد'];

function parseType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase();
  for (const w of INCOME_WORDS) if (lower.includes(w.toLowerCase())) return 'income';
  for (const w of EXPENSE_WORDS) if (lower.includes(w.toLowerCase())) return 'expense';
  return 'expense';
}

const MERCHANT_TERMINATORS =
  '(?:\\s+on\\b|\\s+ref\\b|\\s+at\\s+\\d|\\s+يوم\\b|\\s+بتاريخ\\b|\\s+الساعه\\b|\\s+الساعة\\b|\\s+في\\s+\\d|\\s+بمبلغ\\b|\\s+كود\\b|\\s+رقم\\b|\\s+المتاح\\b|\\s+للمزيد\\b|\\s*[.,]|\\s*$)';

function parseMerchant(text: string): string | null {
  const patterns = [
    new RegExp(`(?:at|from|عند|لدى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)${MERCHANT_TERMINATORS}`, 'i'),
    new RegExp(`(?:to|إلى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)${MERCHANT_TERMINATORS}`, 'i'),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const cleaned = m[1].trim().replace(/\s+/g, ' ');
      if (cleaned.length >= 2 && !/^\d+$/.test(cleaned) && !/^(mobile\s+payment|pos|card|online|بطاقة|حساب)/i.test(cleaned)) {
        return cleaned;
      }
    }
  }
  return null;
}

const CATEGORY_HINTS: Array<{ words: string[]; cat: string }> = [
  { words: ['carrefour', 'spinneys', 'panda', 'lulu', 'elgomla', 'gomla', 'supermarket', 'hypermarket', 'seoudi', 'kazyon', 'بقالة', 'سوبر ماركت', 'هايبر', 'كارفور', 'بندة', 'الجملة', 'بيت الجملة'], cat: 'Groceries' },
  { words: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonalds', 'kfc', 'pizza', 'burger', 'مطعم', 'كافيه'], cat: 'Food & Dining' },
  { words: ['uber', 'careem', 'taxi', 'bolt', 'lyft'], cat: 'Transportation' },
  { words: ['gas', 'petrol', 'fuel', 'شيفرون', 'aramco', 'adnoc'], cat: 'Fuel' },
  { words: ['pharmacy', 'صيدلية', 'doctor', 'clinic', 'hospital'], cat: 'Health' },
  { words: ['netflix', 'spotify', 'apple', 'amazon prime', 'subscription'], cat: 'Subscriptions' },
];

function suggestCategory(text: string, merchant: string | null): string | null {
  const hay = `${merchant ?? ''} ${text}`.toLowerCase();
  for (const h of CATEGORY_HINTS) {
    if (h.words.some((w) => hay.includes(w.toLowerCase()))) return h.cat;
  }
  return null;
}

// ─── Expo push ────────────────────────────────────────────────────────

interface ExpoPushMsg {
  to: string;
  title: string;
  body: string;
  sound: 'default' | null;
  data: Record<string, unknown>;
}

async function sendPush(msg: ExpoPushMsg): Promise<void> {
  if (!msg.to) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify(msg),
    });
  } catch (e) {
    console.error('[sms-webhook] push error:', e);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  let token = url.searchParams.get('token') ?? '';
  let text = url.searchParams.get('text') ?? '';

  // Also accept POST body for flexibility.
  if (!text && req.method === 'POST') {
    try {
      const body = await req.json() as { token?: string; text?: string };
      token = token || body.token || '';
      text = body.text || '';
    } catch { /* ignore */ }
  }

  if (!token || !text) {
    return new Response(JSON.stringify({ error: 'missing token or text' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Decode %-encoded text (Shortcuts encodes automatically).
  try { text = decodeURIComponent(text); } catch { /* keep raw */ }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceKey);

  // ─── Look up user by webhook token ──────────────────────────────
  const { data: profile, error: profErr } = await sb
    .from('profiles')
    .select('id, expo_push_token, currency')
    .eq('sms_webhook_token', token)
    .maybeSingle();

  if (profErr || !profile) {
    // Do not reveal whether token is invalid vs other error.
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const userId = profile.id as string;
  const pushTok = (profile.expo_push_token as string | null) ?? '';
  const currency = (profile.currency as string | null) ?? 'EGP';

  // ─── Parse ──────────────────────────────────────────────────────
  const amount = parseAmount(text);
  if (!amount) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no amount' }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const type = parseType(text);
  const merchant = parseMerchant(text);
  const category = suggestCategory(text, merchant);
  const today = new Date().toISOString().slice(0, 10);

  // ─── Insert transaction ─────────────────────────────────────────
  const { error: insErr } = await sb.from('transactions').insert({
    user_id: userId,
    amount,
    type,
    transaction_type: type,
    description: merchant ?? (type === 'income' ? 'Incoming transfer' : 'Expense'),
    merchant,
    category_name: category,
    date: today,
    source: 'sms',
    source_type: 'sms',
    needs_review: !category,
    parse_confidence: category ? 0.8 : 0.5,
    notes: text,
  });

  if (insErr) {
    console.error('[sms-webhook] insert error:', insErr);
    return new Response(JSON.stringify({ ok: false, error: 'insert failed' }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ─── Push notification (amount · merchant  /  category · tap to review) ─
  const sign = type === 'income' ? '+' : '-';
  const amountStr = `${sign}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
  const title = merchant ? `${amountStr} · ${merchant}` : `${amountStr} · ${type}`;
  const body = category ? `${category} · tap to review` : 'Tap to review & categorize';

  await sendPush({
    to: pushTok,
    title,
    body,
    sound: 'default',
    data: { source: 'sms-webhook', amount, type, merchant, category },
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
