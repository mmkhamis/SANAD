// PoC only — not production ready
// Processes pending whatsapp_events: text (multi-tx), voice notes, receipt images
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const POC_USER_ID = '00000000-0000-0000-0000-000000000000';

async function twilioReply(to: string, body: string): Promise<void> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const from = Deno.env.get('TWILIO_WHATSAPP_NUMBER')!;
  if (!sid || !token || !from) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: `whatsapp:${from}`, To: to, Body: body }).toString(),
  }).catch((e) => console.error('Twilio error:', e));
}

async function fetchMediaBase64(url: string): Promise<string> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const res = await fetch(url, { headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`) } });
  if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function resolveUser(sb: ReturnType<typeof createClient>, phone: string): Promise<string | null> {
  const { data: wa } = await sb.from('profiles').select('id').eq('whatsapp_number', phone).maybeSingle();
  if (wa?.id) return wa.id;
  // No fallback — if phone doesn't match a profile, skip processing
  console.warn(`No profile found for phone: ${phone}`);
  return null;
}

interface PTx { amount?: number | null; transaction_type?: string; description?: string; merchant?: string | null; counterparty?: string | null; category?: string | null; date?: string; confidence?: number }

async function insertAll(sb: ReturnType<typeof createClient>, txs: PTx[], userId: string, today: string, notes: string): Promise<PTx[]> {
  const valid = txs.filter((t) => t.amount && t.amount > 0);
  if (!valid.length) throw new Error('Could not parse any amount from message');
  for (const tx of valid) {
    const { error } = await sb.from('transactions').insert({
      user_id: userId, amount: tx.amount,
      type: tx.transaction_type ?? 'expense', transaction_type: tx.transaction_type ?? 'expense',
      description: tx.description ?? notes.slice(0, 100),
      merchant: tx.merchant ?? null, counterparty: tx.counterparty ?? null,
      category_name: tx.category ?? null, date: tx.date ?? today,
      source: 'whatsapp', source_type: 'whatsapp',
      needs_review: !tx.category, parse_confidence: tx.confidence ?? 0.5, notes,
    });
    if (error) throw new Error(`Insert failed: ${error.message}`);
  }
  return valid;
}

function fmtReply(txs: PTx[], icon: string): string {
  if (txs.length === 1) {
    const t = txs[0];
    const status = t.category ? 'Saved ✓' : 'Needs review 📋';
    return `${status} ${icon}\nEGP ${t.amount} — ${t.merchant || t.counterparty || t.category || 'transaction'} (${t.category ?? 'Uncategorized'})\nCheck SANAD${t.category ? '.' : ' to categorize.'}`;
  }
  const saved = txs.filter((t) => t.category).length;
  const review = txs.length - saved;
  const lines = txs.map((t, i) => `${i + 1}. EGP ${t.amount} — ${t.merchant || t.category || 'item'}${t.category ? ' ✓' : ' 📋'}`);
  const summary = [saved > 0 ? `${saved} saved` : '', review > 0 ? `${review} need review` : ''].filter(Boolean).join(', ');
  return `Got it ${icon} ${txs.length} transactions (${summary}):\n${lines.join('\n')}`;
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(url, key);
  const edge = (fn: string, body: Record<string, unknown>) =>
    fetch(`${url}/functions/v1/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body) });

  const { data: pending } = await sb.from('whatsapp_events').select('id').eq('status', 'pending').order('created_at', { ascending: true }).limit(20);
  if (!pending?.length) return new Response(JSON.stringify({ message: 'No pending events' }), { status: 200 });
  const ids = pending.map((e) => e.id);
  await sb.from('whatsapp_events').update({ status: 'processing' }).in('id', ids);
  const { data: events } = await sb.from('whatsapp_events').select('*').in('id', ids);
  const results: { id: string; ok: boolean; count?: number }[] = [];

  for (const ev of events ?? []) {
    try {
      const phone = ev.from_number.replace('whatsapp:', '');
      const userId = await resolveUser(sb, phone);
      if (!userId) {
        await sb.from('whatsapp_events').update({ status: 'skipped' }).eq('id', ev.id);
        results.push({ id: ev.id, ok: false });
        continue;
      }
      const today = new Date().toISOString().split('T')[0];
      const isAudio = ev.media_type?.startsWith('audio/');
      const isImage = ev.media_type?.startsWith('image/');

      if (isAudio && ev.media_url) {
        // ── VOICE NOTE: transcribe → parse → insert ──
        const b64 = await fetchMediaBase64(ev.media_url);
        const tR = await edge('transcribe-voice', { audio_base64: b64, mime_type: ev.media_type ?? 'audio/ogg' });
        if (!tR.ok) throw new Error(`transcribe-voice ${tR.status}`);
        const { text } = await tR.json();
        if (!text) throw new Error('Empty transcription');
        const pR = await edge('parse-transaction', { text });
        if (!pR.ok) throw new Error(`parse-transaction ${pR.status}`);
        const txs = (await pR.json()).transactions ?? [];
        const ins = await insertAll(sb, txs, userId, today, text);
        await sb.from('whatsapp_events').update({ status: 'completed' }).eq('id', ev.id);
        await twilioReply(ev.from_number, fmtReply(ins, '🎤'));
        results.push({ id: ev.id, ok: true, count: ins.length }); continue;
      }

      if (isImage && ev.media_url) {
        // ── RECEIPT IMAGE: OCR → insert ──
        const b64 = await fetchMediaBase64(ev.media_url);
        const oR = await edge('ocr-receipt', { image_base64: b64 });
        if (!oR.ok) throw new Error(`ocr-receipt ${oR.status}`);
        const ocr = await oR.json();
        // Derive amount: prefer amount, fall back to total, then sum items
        let receiptAmount: number | null = ocr.amount ?? ocr.total ?? null;
        if ((!receiptAmount || receiptAmount <= 0) && Array.isArray(ocr.items) && ocr.items.length > 0) {
          // items may be strings ("Coffee x2 - 30") or objects with unit_price/quantity
          let sum = 0;
          for (const item of ocr.items) {
            if (typeof item === 'object' && item !== null && typeof item.unit_price === 'number') {
              sum += item.unit_price * (item.quantity ?? 1);
            } else if (typeof item === 'string') {
              const m = item.match(/([\d,]+\.?\d*)\s*$/);
              if (m) sum += parseFloat(m[1].replace(/,/g, ''));
            }
          }
          if (sum > 0) receiptAmount = sum;
        }
        if (!receiptAmount || receiptAmount <= 0) throw new Error('Could not extract amount from receipt');
        const { error } = await sb.from('transactions').insert({
          user_id: userId, amount: receiptAmount,
          type: ocr.transaction_type ?? 'expense', transaction_type: ocr.transaction_type ?? 'expense',
          description: ocr.merchant ? `Receipt — ${ocr.merchant}` : 'Receipt scan',
          merchant: ocr.merchant ?? null, category_name: ocr.category ?? null, date: ocr.date ?? today,
          source: 'whatsapp', source_type: 'whatsapp', needs_review: !ocr.category, parse_confidence: 0.7, notes: ocr.text ?? ev.raw_text,
        });
        if (error) throw new Error(`Insert: ${error.message}`);
        await sb.from('whatsapp_events').update({ status: 'completed' }).eq('id', ev.id);
        await twilioReply(ev.from_number, `Got it ✓ 🧾\n${ocr.currency ?? 'EGP'} ${receiptAmount} — ${ocr.merchant ?? 'Receipt'} (${ocr.category ?? 'Uncategorized'})\nCheck SANAD to confirm.`);
        results.push({ id: ev.id, ok: true, count: 1 }); continue;
      }

      // ── TEXT: parse all transactions → insert all ──
      if (!ev.raw_text) throw new Error('No text or media');
      const pR = await edge('parse-transaction', { text: ev.raw_text });
      if (!pR.ok) throw new Error(`parse-transaction ${pR.status}`);
      const txs = (await pR.json()).transactions ?? [];
      const ins = await insertAll(sb, txs, userId, today, ev.raw_text);
      await sb.from('whatsapp_events').update({ status: 'completed' }).eq('id', ev.id);
      await twilioReply(ev.from_number, fmtReply(ins, ''));
      results.push({ id: ev.id, ok: true, count: ins.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      await sb.from('whatsapp_events').update({ status: 'failed', error: msg }).eq('id', ev.id);
      await twilioReply(ev.from_number, `❌ Couldn't process that.\nTry text: "Paid 150 EGP at Carrefour"\nOr send a receipt photo / voice note.`);
      results.push({ id: ev.id, ok: false });
    }
  }
  return new Response(JSON.stringify({ processed: results.length, results }), { status: 200 });
});
