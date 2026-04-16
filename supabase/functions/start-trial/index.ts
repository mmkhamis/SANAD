// Supabase Edge Function: start-trial
// Validates JWT, then calls the start_trial RPC (SECURITY DEFINER)
// to atomically check eligibility and activate a trial.

import { verifyAuth } from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // 1. Verify JWT
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  const trial_plan = body?.trial_plan as string | undefined;

  if (!trial_plan || !['pro', 'max'].includes(trial_plan)) {
    return new Response(
      JSON.stringify({ error: 'trial_plan must be "pro" or "max"' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // 2. Use service-role client to call the SECURITY DEFINER RPC
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    console.log('[start-trial] calling RPC for user', userId, 'plan', trial_plan);

    const { data, error } = await serviceClient.rpc('start_trial', {
      p_user_id: userId,
      p_trial_plan: trial_plan,
    });

    if (error) {
      const msg = error.message ?? '';
      console.error('[start-trial] RPC error:', msg);

      const statusMap: Record<string, { status: number; error: string }> = {
        'already_active': { status: 409, error: 'You already have an active subscription.' },
        'pro_trial_used': { status: 409, error: 'You have already used your Pro trial.' },
        'max_trial_used': { status: 409, error: 'You have already used your Max trial.' },
        'invalid_plan':   { status: 400, error: 'Invalid trial plan.' },
      };

      for (const [key, resp] of Object.entries(statusMap)) {
        if (msg.includes(key)) {
          return new Response(
            JSON.stringify({ error: resp.error }),
            { status: resp.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
          );
        }
      }

      return new Response(
        JSON.stringify({ error: 'Failed to start trial. Please try again.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[start-trial] success, data type:', typeof data);

    // data is the jsonb returned by the RPC — it's already the subscription object
    const subscription = data;

    return new Response(
      JSON.stringify({ subscription }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[start-trial] unexpected:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
