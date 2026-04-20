// Supabase Edge Function: transcribe-voice
// Accepts base64-encoded audio, transcribes via OpenAI Whisper.

import { verifyAuth } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRANSCRIBE_PROMPT =
  'Transcribe only the words actually spoken. ' +
  'If the audio is silence, noise-only, music-only, or unintelligible, return empty string "". ' +
  'Do not hallucinate, summarize, translate, normalize, or correct wording. ' +
  'Keep original language/script exactly as spoken (Arabic, English, Franko-Arab, or mixed). ' +
  'Keep numbers, currencies, and merchant names exactly as heard. ' +
  'Examples: "dafa3t 150 fel carrefour" -> "dafa3t 150 fel carrefour", ' +
  '"دفعت ٢٥٠ في كارفور" -> "دفعت ٢٥٠ في كارفور".';

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

    const { audio_base64, mime_type } = await req.json() as { audio_base64: string; mime_type?: string };

    if (!audio_base64) {
      return new Response(
        JSON.stringify({ error: 'Audio data is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Reject payloads larger than ~25 MB base64 (Whisper limit is 25 MB)
    if (audio_base64.length > 33_000_000) {
      return new Response(
        JSON.stringify({ error: 'Audio too large. Max 25 MB.' }),
        { status: 413, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Decode base64 to bytes
    const binaryString = atob(audio_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Use actual MIME type from caller (WhatsApp sends audio/ogg)
    const effectiveMime = mime_type || 'audio/ogg';
    const extMap: Record<string, string> = {
      'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
      'audio/m4a': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm',
    };
    const ext = extMap[effectiveMime] ?? 'ogg';
    const audioFile = new File([bytes], `recording.${ext}`, { type: effectiveMime });

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('prompt', TRANSCRIBE_PROMPT);
    // gpt-4o-mini-transcribe only supports json or text (not verbose_json)
    formData.append('response_format', 'json');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Transcription API error: ${res.status} ${err}`);
    }

    const result = await res.json();
    const text = result.text ?? '';

    return new Response(
      JSON.stringify({ text, language: null }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
