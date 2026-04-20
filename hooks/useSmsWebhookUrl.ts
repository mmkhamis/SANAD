/**
 * Returns the user's personal silent SMS webhook URL.
 *
 * Flow: the URL is called by iOS Shortcuts "Get Contents of URL" action.
 * The request is anonymous (no JWT) but authenticated by a per-user
 * `sms_webhook_token` UUID on `profiles`. Running this in Shortcuts does
 * NOT open the SANAD app — it hits Supabase directly, inserts the
 * transaction, and triggers an Expo push notification.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = 'https://rpsbxbwddhkalfwptlut.supabase.co';

export interface SmsWebhookInfo {
  token: string;
  /** Template URL — append ?text=<SMS> (Shortcuts does URL-encoding). */
  urlTemplate: string;
  /** A ready-to-test URL with a sample SMS appended. */
  sampleUrl: string;
}

const SAMPLE_SMS =
  'تم خصم 4129.40EGP من بطاقة الخصم المباشر عند BEET ELGOMLA يوم 15/04 الساعه 21:00';

async function fetchWebhookToken(): Promise<SmsWebhookInfo | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('sms_webhook_token')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data?.sms_webhook_token) return null;

  const token = data.sms_webhook_token as string;
  const base = `${SUPABASE_URL}/functions/v1/sms-webhook?token=${token}`;
  return {
    token,
    urlTemplate: `${base}&text=`,
    sampleUrl: `${base}&text=${encodeURIComponent(SAMPLE_SMS)}`,
  };
}

export function useSmsWebhookUrl() {
  return useQuery({
    queryKey: ['sms-webhook-url'],
    queryFn: fetchWebhookToken,
    staleTime: 5 * 60 * 1000,
  });
}

async function rotateWebhookToken(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // gen_random_uuid() via RPC would be ideal; for now have the client
  // generate and write it. UUID v4 via crypto.
  const newToken = crypto.randomUUID();
  const { error } = await supabase
    .from('profiles')
    .update({ sms_webhook_token: newToken })
    .eq('id', user.id);

  if (error) throw error;
}

export function useRotateSmsWebhookToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rotateWebhookToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms-webhook-url'] }),
  });
}
