// Supabase Edge Function: ocr-receipt
// Accepts base64-encoded receipt image, extracts financial data via GPT-4o Vision.

import { verifyAuth } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a receipt OCR parser for a personal finance app.
Extract financial information from the receipt image.

Return JSON only with this exact schema:
{
  "text": "brief summary of what the receipt shows",
  "amount": number | null,
  "currency": "string" | null,
  "transaction_type": "expense" | "income",
  "category": "string" | null,
  "merchant": "string" | null,
  "date": "YYYY-MM-DD" | null,
  "items": ["line items from receipt"]
}

Use these categories when applicable: Housing / Rent, Electricity, Water, Gas, Internet, Mobile / Phone, Groceries, Home Supplies, Shopping, Transportation, Fuel, Healthcare, Education, Entertainment, Subscriptions, Dining / Food, Travel, Personal Care, Family, Savings, Investments, Debt / Loans, Charity, Miscellaneous, Salary, Freelance, Bonus, Business, Investment Returns, Gifts, Other Income`;

const STRUCTURED_SYSTEM_PROMPT = `You are a receipt OCR parser for a group bill-splitting app.
Extract ALL line items from the receipt image with their quantities and prices.

Return JSON only with this exact schema:
{
  "merchant": "string" | null,
  "date": "YYYY-MM-DD" | null,
  "currency": "string" | null,
  "items": [
    {
      "name": "item name",
      "quantity": number,
      "unit_price": number
    }
  ],
  "subtotal": number | null,
  "tax": number | null,
  "service_fee": number | null,
  "tip": number | null,
  "discount": number | null,
  "total": number | null
}

Be precise with quantities and unit prices. If an item shows total price with quantity > 1, divide to get unit_price.
Include every line item — do not omit any.`;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Verify JWT
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const body = await req.json() as { image_base64?: string; image?: string; structured?: boolean };
    // Support both field names for backward compat
    const rawImage = body.image_base64 ?? body.image ?? '';
    const structured = body.structured === true;

    if (!rawImage) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Strip data URI prefix if present
    const base64Data = rawImage.startsWith('data:')
      ? rawImage.split(',')[1] ?? rawImage
      : rawImage;

    // Reject payloads larger than ~10 MB base64 (≈7.5 MB raw)
    if (base64Data.length > 10_000_000) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Max ~10 MB.' }),
        { status: 413, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Detect actual MIME type from data URI or default to jpeg
    const mimeType = rawImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: structured ? STRUCTURED_SYSTEM_PROMPT : SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: structured
                  ? 'Extract all line items with quantities and prices from this receipt.'
                  : 'Extract the financial details from this receipt image.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: structured ? 1000 : 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vision API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty Vision response');

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Failed to parse Vision response as JSON');
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Receipt scanning failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
