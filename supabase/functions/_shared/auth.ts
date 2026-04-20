const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify the JWT by calling the Supabase Auth API directly.
 * This avoids any local JWT decoding — no ES256 issues.
 */
export async function verifyAuth(
  req: Request,
): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    });

    if (!res.ok) {
      console.error('[verifyAuth] Auth API returned', res.status);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const user = await res.json() as { id?: string };
    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    return { userId: user.id };
  } catch (err) {
    console.error('[verifyAuth]', err);
    return new Response(
      JSON.stringify({ error: 'Auth verification failed' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
}
