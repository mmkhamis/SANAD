// Supabase Edge Function: ocr-receipt
// Accepts base64-encoded receipt image, extracts financial data via GPT-4o Vision.

import { verifyAuth } from '../_shared/auth.ts';
import {
  normalizeOcrSingleResult,
  normalizeOcrStructuredResult,
} from '../_shared/ai-output-normalizers.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Default prompt (single transaction) ─────────────────────────────

const SYSTEM_PROMPT = `You are a strict receipt OCR parser for a personal finance app.
Extract exactly what is visible in the receipt image.

NON-NEGOTIABLE RULES:
1) Return JSON only. No markdown. No extra keys.
2) Never invent values. If unclear, return null.
3) "amount" must be the final paid amount (receipt total). If total is not visible, use subtotal only when clearly shown.
4) "transaction_type":
   - "income" only for explicit refund/credit/cashback/payout.
   - "transfer" for bank transfer, wallet transfer, cash-in/cash-out transfer receipts, or top-up transfer slips.
   - otherwise use "expense".
5) "date" must be YYYY-MM-DD or null.
6) "items" should contain product/service line items only. Exclude tax, service fee, discount, subtotal, total lines.
7) Keep merchant/category concise and literal.
8) If transaction_type is "transfer" and no clear spend/income category exists, set "category" to null.

Return JSON only with this exact schema:
{
  "text": "brief summary of what the receipt shows",
  "amount": number | null,
  "currency": "string" | null,
  "transaction_type": "expense" | "income" | "transfer",
  "category": "string" | null,
  "merchant": "string" | null,
  "date": "YYYY-MM-DD" | null,
  "items": ["line items from receipt"]
}

Use these categories when applicable: Housing / Rent, Electricity, Water, Gas, Internet, Mobile / Phone, Groceries, Home Supplies, Shopping, Transportation, Fuel, Healthcare, Education, Entertainment, Subscriptions, Dining / Food, Travel, Personal Care, Family, Savings, Investments, Debt / Loans, Charity, Miscellaneous, Salary, Freelance, Bonus, Business, Investment Returns, Gifts, Other Income`;

// ─── Structured prompt (bill-splitting with line items) ──────────────

const STRUCTURED_SYSTEM_PROMPT = `You are an expert receipt OCR parser for a group bill-splitting app.
Your job is to extract EVERY line item from a receipt image with extreme precision.

CRITICAL RULES — read carefully:

0. OUTPUT DISCIPLINE:
   - Return valid JSON only.
   - Never add comments, markdown, or extra keys.
   - If a field is unknown, return null.

1. UNIT PRICE vs TOTAL PRICE:
   - "unit_price" MUST be the price for ONE unit of the item.
   - If the receipt shows "3 × 25" or "3 @ 25", the unit_price is 25, quantity is 3.
   - If the receipt shows a single line "Chicken Shawarma 75" with no quantity indicator,
     the unit_price is 75 and quantity is 1.
   - If the receipt shows "Chicken Shawarma ×3  75", the unit_price is 25 (= 75 ÷ 3), quantity is 3.
   - NEVER put the total line price as the unit_price when quantity > 1.

2. QUANTITY DETECTION:
   - Look for: "×", "x", "@", "qty", quantity columns, or a number before the item name.
   - If no quantity indicator exists, assume quantity = 1.
   - Some receipts show quantity on a separate line below the item name.

3. INCLUDE EVERYTHING:
   - Include every food/drink/product line item.
   - Do NOT skip items even if the text is partially obscured — do your best guess.
   - Do NOT merge multiple items into one.

4. EXCLUDE from items array (put in their own fields instead):
   - Tax / VAT / ضريبة
   - Service charge / رسوم خدمة
   - Tips / بقشيش
   - Discounts / خصم
   - Subtotal / total lines

5. ARABIC & ENGLISH:
   - Receipts may be in Arabic, English, or mixed. Handle all.
   - For Arabic items keep the original Arabic name.

6. CURRENCY:
   - Detect from: SAR/ر.س, EGP/ج.م, AED/د.إ, KWD, BHD, QAR, OMR, USD, EUR, GBP, etc.
   - If no currency symbol found, use null.

7. NUMBER FORMAT:
   - Normalize OCR commas/spaces: "1,250.50" => 1250.50
   - Use decimal numbers, never strings.

8. SELF-CHECK:
   - After extracting all items, verify: sum of (quantity × unit_price) for all items
     should approximately equal the subtotal (before tax/fees).
   - If it doesn't match, re-examine the prices and quantities and fix them.

Return JSON only with this exact schema:
{
  "merchant": "string | null",
  "date": "YYYY-MM-DD | null",
  "currency": "string | null",
  "items": [
    {
      "name": "item name exactly as shown on receipt",
      "quantity": 1,
      "unit_price": 0.00
    }
  ],
  "subtotal": number | null,
  "tax": number | null,
  "service_fee": number | null,
  "tip": number | null,
  "discount": number | null,
  "total": number | null
}`;

// ─── Verification prompt (second pass — text only, no image) ─────────

const VERIFY_PROMPT = `You are a receipt data verifier. You will receive extracted receipt data as JSON.
Your job is to check math consistency and fix obvious extraction mistakes.

RULES:
1. For each item: total_line_price = quantity × unit_price
2. Sum of all line totals should ≈ subtotal (if given)
3. subtotal + tax + service_fee + tip - discount should ≈ total (if given)
4. If unit_price looks like a total (e.g. quantity=3, unit_price=75 but another item with quantity=1 costs ~25),
   try dividing: unit_price = 75 / 3 = 25.
5. If any item has quantity=0 or unit_price=0, that's suspicious — check it.
6. Remove any duplicate items.
7. Do NOT invent new items that are not present in the provided JSON.
8. Keep merchant/date/currency unchanged unless clearly malformed.

Return the CORRECTED JSON in the same schema. If everything checks out, return unchanged.
Return JSON only — no explanations.`;

// ─── Helper: call OpenAI Vision ──────────────────────────────────────

interface VisionCallOpts {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: unknown[];
  maxTokens: number;
  temperature: number;
}

async function callOpenAI(opts: VisionCallOpts): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.userContent },
        ],
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
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

    const body = await req.json() as {
      image_base64?: string;
      image?: string;
      structured?: boolean;
    };

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

    if (base64Data.length > 10_000_000) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Max ~10 MB.' }),
        { status: 413, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const mimeType = rawImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const imageDataUri = `data:${mimeType};base64,${base64Data}`;

    // Build image content block (reused across calls)
    const imageBlock = {
      type: 'image_url' as const,
      image_url: { url: imageDataUri, detail: 'auto' as const },
    };

    if (!structured) {
      // ── Default mode: single transaction extraction ──
      const parsed = await callOpenAI({
        apiKey,
        model: 'gpt-4o-mini',
        systemPrompt: SYSTEM_PROMPT,
        userContent: [
          { type: 'text', text: 'Extract the financial details from this receipt image.' },
          imageBlock,
        ],
        maxTokens: 500,
        temperature: 0.1,
      });

      const normalized = normalizeOcrSingleResult(parsed);

      return new Response(
        JSON.stringify(normalized),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Structured mode: line items for bill splitting ──

    // Pass 1: Extract all line items (gpt-4o + image)
    const firstPass = await callOpenAI({
      apiKey,
      model: 'gpt-4o',
      systemPrompt: STRUCTURED_SYSTEM_PROMPT,
      userContent: [
        { type: 'text', text: 'Extract ALL line items with exact quantities and unit prices from this receipt. Pay close attention to quantity × unit_price = line total.' },
        imageBlock,
      ],
      maxTokens: 2000,
      temperature: 0.1,
    });

    // Pass 2: Math verification (gpt-4o-mini, text only — no image = fast).
    // If verification fails for any reason (timeout, malformed JSON, etc.),
    // fall back to the first-pass result rather than failing the whole request.
    let verified: Record<string, unknown>;
    try {
      verified = await callOpenAI({
        apiKey,
        model: 'gpt-4o-mini',
        systemPrompt: VERIFY_PROMPT,
        userContent: [
          { type: 'text', text: `Verify and fix the math in this receipt extraction:\n${JSON.stringify(firstPass, null, 2)}` },
        ],
        maxTokens: 2000,
        temperature: 0.0,
      });
    } catch {
      verified = firstPass;
    }

    const normalized = normalizeOcrStructuredResult(verified);

    return new Response(
      JSON.stringify(normalized),
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
