// Supabase Edge Function: ingest-sms
//
// Authoritative SMS ingestion endpoint for authenticated app clients.
// Pipeline implementation lives in _shared/sms-ingest-v2.ts and is also
// reused by sms-webhook to avoid parser/persistence drift.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import {
  ingestSmsMessage,
  type IngestOutcome,
} from '../_shared/sms-ingest-v2.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface IngestRequest {
  message: string;
  sender?: string;
}

function jsonResponse(body: IngestOutcome, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, status: 'error', error: 'method not allowed' }, 405);
  }

  const authResult = await verifyAuth(req);
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;

  let body: IngestRequest;
  try {
    body = await req.json() as IngestRequest;
  } catch {
    return jsonResponse({ ok: false, status: 'error', error: 'invalid json' }, 400);
  }

  const message = (body.message ?? '').trim();
  if (!message) {
    return jsonResponse({ ok: false, status: 'error', error: 'missing message' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const outcome = await ingestSmsMessage({
    sb,
    userId,
    message,
    sender: body.sender ?? null,
    defaultCurrency: 'SAR',
    defaultCountry: 'SA',
    ingestSource: 'ingest_sms',
  });

  const code = outcome.ok ? 200 : 500;
  return jsonResponse(outcome, code);
});
