// Canonical schema returned by both rule-based and AI fallback parsers.
// Single source of truth — every persistence path consumes this shape.

export type MessageClass =
  | 'purchase'
  | 'refund'
  | 'transfer'
  | 'income'
  | 'promotion_offer'
  | 'balance_alert'
  | 'otp'
  | 'unknown';

export type ParserSource = 'rules' | 'ai_fallback' | 'rules_then_ai';

export type Channel =
  | 'apple_pay' | 'google_pay' | 'mada' | 'stc_pay'
  | 'urpay' | 'iban' | 'card' | null;

export type IgnoredKind =
  | 'remaining_balance' | 'remaining_limit'
  | 'reference_number'  | 'promo_amount';

export interface IgnoredValue {
  kind: IgnoredKind;
  value: string;
}

export interface ParseResult {
  message_class: MessageClass;
  should_create_transaction: boolean;
  should_route_to_offers_feed: boolean;

  amount: number | null;
  currency: string;
  timestamp: string | null;

  institution_name: string | null;
  merchant_raw: string | null;
  merchant_normalized: string | null;
  descriptor: string | null;
  channel: Channel;
  country: string | null;

  source_account_last4: string | null;
  source_card_last4: string | null;
  from_last4: string | null;
  to_last4: string | null;
  counterparty_name: string | null;

  ignored_values: IgnoredValue[];
  confidence: number;
  parse_reason: string;
  review_flags: string[];
  parser_source: ParserSource;
  /** AI-suggested taxonomy key for category matching (null from rules pass). */
  taxonomy_key?: string | null;
}

export interface ParseContext {
  /** Wall-clock arrival time for fallback timestamp. */
  arrived_at?: string;
  /** Sender ID from iOS share (e.g. "STCBank"). */
  sender?: string | null;
  /** User-owned last4 → account info for ownership matching. */
  ownedAccounts?: Array<{
    id: string;
    name: string;
    type: string;
    account_last4: string | null;
    card_last4: string | null;
    iban_last4: string | null;
  }>;
  /** Default currency when none parsed. */
  defaultCurrency?: string;
  /** Default country when none parsed. */
  defaultCountry?: string;
  /** Promo keywords loaded from DB (else falls back to constants). */
  promoKeywords?: { keyword: string; language: 'ar' | 'en'; weight: number }[];
}

/** Internal classification result before scoring. */
export interface ClassResult {
  class: MessageClass;
  hard: boolean;
}

/** One last4 occurrence with its inferred role. */
export interface Last4Hit {
  digits: string;
  role: 'from' | 'to' | 'card' | 'account' | 'unknown';
  ownedAccountId?: string | null;
}
