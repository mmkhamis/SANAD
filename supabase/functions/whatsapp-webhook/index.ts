// PoC only — not production ready
// Twilio WhatsApp webhook — receives inbound messages (text, voice, images)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }

  try {
    // Basic auth check — verify the request contains a valid Twilio AccountSid
    const expectedSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    if (!expectedSid) {
      console.error('TWILIO_ACCOUNT_SID not configured');
      return new Response('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }

    const formData = await req.formData();
    const accountSid = formData.get('AccountSid') as string | null;

    // Reject requests that don't include the correct AccountSid
    if (accountSid !== expectedSid) {
      console.warn('Webhook rejected: AccountSid mismatch');
      return new Response('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }

    const from = formData.get('From') as string | null;
    const body = (formData.get('Body') as string | null)?.trim() || null;
    const messageSid = formData.get('MessageSid') as string | null;
    const numMedia = parseInt(formData.get('NumMedia') as string ?? '0', 10);
    const mediaUrl = numMedia > 0 ? (formData.get('MediaUrl0') as string | null) : null;
    const mediaType = numMedia > 0 ? (formData.get('MediaContentType0') as string | null) : null;

    if (!from || !messageSid || (!body && !mediaUrl)) {
      return new Response('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase.from('whatsapp_events').insert({
      from_number: from,
      raw_text: body,
      message_sid: messageSid,
      media_url: mediaUrl,
      media_type: mediaType,
      status: 'pending',
    });

    if (error && error.code !== '23505') console.error('Insert error:', error);

    // Auto-trigger processor (fire-and-forget)
    if (!error) {
      fetch(`${supabaseUrl}/functions/v1/process-whatsapp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${serviceKey}` },
      }).catch((e) => console.error('Process trigger failed:', e));
    }

    return new Response('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });
  }
});
