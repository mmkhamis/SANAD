// Supabase Edge Function: sms-webhook
//
// Silent SMS ingestion for iOS Shortcuts:
//   GET/POST /sms-webhook?token=<uuid>&text=<message>
//
// This function is intentionally thin:
//   1) resolve user by sms_webhook_token
//   2) forward text to the shared parser-v2 ingestion pipeline
//   3) send Expo push notification for created/duplicate transactions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ingestSmsMessage,
  type IngestOutcome,
} from '../_shared/sms-ingest-v2.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify(msg),
    });
  } catch (err) {
    console.error('[sms-webhook] push error:', err);
  }
}

function jsonResponse(body: IngestOutcome | { ok: boolean; error?: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  let token = url.searchParams.get('token') ?? '';
  let text = url.searchParams.get('text') ?? '';
  let sender = url.searchParams.get('sender') ?? '';

  if (!text && req.method === 'POST') {
    try {
      const body = await req.json() as { token?: string; text?: string; sender?: string };
      token = token || body.token || '';
      text = body.text || '';
      sender = sender || body.sender || '';
    } catch {
      // ignore malformed body
    }
  }

  if (!token || !text) {
    return jsonResponse({ ok: false, error: 'missing token or text' }, 400);
  }

  try {
    text = decodeURIComponent(text);
  } catch {
    // keep raw
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profErr } = await sb
    .from('profiles')
    .select('id, expo_push_token, currency')
    .eq('sms_webhook_token', token)
    .maybeSingle();

  if (profErr || !profile) {
    // Do not reveal validity details of the token.
    return jsonResponse({ ok: false }, 200);
  }

  const userId = profile.id as string;
  const pushTok = (profile.expo_push_token as string | null) ?? '';
  const currency = (profile.currency as string | null) ?? 'SAR';

  const outcome = await ingestSmsMessage({
    sb,
    userId,
    message: text,
    sender: sender || null,
    defaultCurrency: 'SAR',
    defaultCountry: 'SA',
    ingestSource: 'sms_webhook',
  });

  if (!outcome.ok) {
    return jsonResponse(outcome, 200);
  }

  if ((outcome.status === 'created' || outcome.status === 'duplicate') && outcome.transaction) {
    const sign = outcome.transaction.type === 'income'
      ? '+'
      : outcome.transaction.type === 'expense'
        ? '-'
        : '';
    const amountStr = `${sign}${outcome.transaction.amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
    const person = outcome.transaction.merchant || outcome.transaction.counterparty;
    const fallbackType = outcome.transaction.type === 'transfer' ? 'transfer' : outcome.transaction.type;
    const title = person ? `${amountStr} · ${person}` : `${amountStr} · ${fallbackType}`;
    const body = outcome.transaction.category_name
      ? `${outcome.transaction.category_name} · tap to review`
      : 'Tap to review & categorize';

    await sendPush({
      to: pushTok,
      title,
      body,
      sound: 'default',
      data: {
        source: 'sms-webhook',
        amount: outcome.transaction.amount,
        type: outcome.transaction.type,
        merchant: outcome.transaction.merchant,
        category: outcome.transaction.category_name,
      },
    });
  }

  return jsonResponse(outcome, 200);
});
