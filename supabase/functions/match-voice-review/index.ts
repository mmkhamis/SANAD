// Supabase Edge Function: match-voice-review
// Takes voice transcription + list of pending review transactions
// Uses GPT to understand EN/AR instructions and match to transactions.

import { verifyAuth } from '../_shared/auth.ts';
import { normalizeVoiceReviewMatches } from '../_shared/ai-output-normalizers.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingItem {
  index: number;
  amount: number;
  description: string;
  merchant: string | null;
}

interface MatchResult {
  index: number;          // 1-based index of matched transaction
  category_name: string;  // category to assign
  transaction_type: 'income' | 'expense' | 'transfer';
}

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

    const { transcription, pending_items, available_categories } = await req.json() as {
      transcription: string;
      pending_items: PendingItem[];
      available_categories: string[];
    };

    if (!transcription?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Transcription is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Build the numbered list for context
    const itemList = pending_items
      .map((p) => `#${p.index}: ${p.amount} - "${p.description}"${p.merchant ? ` (${p.merchant})` : ''}`)
      .join('\n');

    const categoryList = available_categories.join(', ');

    const systemPrompt = `You are a bilingual (English + Arabic) financial assistant for SANAD, a mobile finance app.

The user is reviewing pending SMS transactions and will tell you — by voice — which category each transaction belongs to.

## Pending transactions:
${itemList}

## Available categories:
${categoryList}

## Your task:
Parse the user's voice instruction and return a JSON array of matches. The user may:
- Reference transactions by number: "number 1 is groceries", "#2 is dining", "الاولي بقالة", "التانية مطاعم", "المعاملة الثالثة للنقل"
- Reference by amount: "the 500 one is salary", "اللي ب ١٥٠ دي بنزين"
- Reference by description/merchant: "the Carrefour one is groceries"
- Give multiple instructions at once: "1 is food, 2 is transport, 3 is shopping"
- Mix languages freely

## Arabic ordinals reference:
الاولى/الاولي/الأولى = 1, التانية/الثانية = 2, التالتة/الثالثة = 3, الرابعة = 4, الخامسة = 5, السادسة = 6, السابعة = 7, الثامنة = 8, التاسعة = 9, العاشرة = 10

## Rules:
- Return valid JSON only. No markdown, no explanations.
- Use only categories from "Available categories".
- One output object per matched transaction index (no duplicates).
- Match the user's category description to the CLOSEST available category from the list. If no exact match, pick the best fit.
- transaction_type: "income" for salary/received/deposit, "transfer" for transfers, "expense" for everything else.
- If a transaction cannot be confidently matched, DO NOT include it.
- Return ONLY valid JSON with this EXACT format:

{"matches": [{"index": 1, "category_name": "Groceries", "transaction_type": "expense"}]}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcription },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${err}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '{}';

    // Parse — handle any JSON shape: { matches: [...] }, { results: [...] }, or direct [...]
    let matches: MatchResult[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        matches = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Find the first key that contains an array of match objects
        for (const key of Object.keys(parsed)) {
          const val = parsed[key];
          if (Array.isArray(val) && val.length > 0 && typeof val[0].index === 'number') {
            matches = val;
            break;
          }
        }
      }
    } catch {
      matches = [];
    }

    const normalizedMatches = normalizeVoiceReviewMatches(matches, available_categories);

    return new Response(
      JSON.stringify({ matches: normalizedMatches }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Voice matching failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
