// Supabase Edge Function: scan-wallet
// Accepts base64-encoded screenshot of a banking/wallet app,
// extracts visible card/account information via GPT-4o-mini Vision.

import { verifyAuth } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You extract bank account and card information from a screenshot of a banking or digital wallet app.
Return ONLY a JSON object matching the schema below. No prose, no markdown.

RULES
- Extract EVERY visible card, account, or wallet from the screenshot.
- bank_name: the issuing bank or financial institution (e.g. "NBE", "Al Rajhi", "CIB", "QNB", "Banque Misr", "STC Bank").
- card_name: the product name or label shown on the card (e.g. "Platinum Card", "Savings Account", "Meeza Prepaid"). If only the bank name is visible, use bank_name + type as card_name.
- last4: the last 4 visible digits of the card or account number. null if no digits are visible.
- card_last4: same as last4 if this is a card (debit/credit). null if this is a plain account.
- account_last4: same as last4 if this is a bank account (not a card). null if this is a card.
- type: "bank" for debit/checking, "credit_card" for credit cards, "savings" for savings accounts. Infer from visual cues (card design, labels like "Credit", "Savings", etc).
- balance: the visible balance or available amount if shown. null if not visible.
- currency: detected currency code ("EGP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "USD"). null if not visible.

DO NOT
- Invent accounts that are not visible in the screenshot.
- Guess last4 digits if they are obscured or not shown.
- Include promotional banners, ads, or non-account UI elements.

SCHEMA
{
  "accounts": [
    {
      "bank_name": "string",
      "card_name": "string",
      "last4": "string|null",
      "card_last4": "string|null",
      "account_last4": "string|null",
      "type": "bank|credit_card|savings",
      "balance": "number|null",
      "currency": "string|null"
    }
  ]
}`;

// ─── Helper: call OpenAI Vision ──────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Extract all visible bank accounts and cards from this screenshot.',
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('OpenAI request timed out after 25s');
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');

  return JSON.parse(content);
}

// ─── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const body = await req.json();
    let base64: string = body.image_base64 ?? body.image ?? '';

    // Strip data URI prefix if present
    if (base64.startsWith('data:')) {
      base64 = base64.replace(/^data:[^;]+;base64,/, '');
    }

    if (!base64 || base64.length < 100) {
      return new Response(
        JSON.stringify({ error: 'image_base64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Detect mime type from first bytes
    const mimeType = base64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';

    const result = await callOpenAI(apiKey, base64, mimeType);
    const accounts = Array.isArray(result.accounts) ? result.accounts : [];

    return new Response(
      JSON.stringify({ ok: true, accounts }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[scan-wallet] error:', message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
