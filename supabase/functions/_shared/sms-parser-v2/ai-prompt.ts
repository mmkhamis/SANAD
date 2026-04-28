// Token-tight AI fallback prompt. ~250 tokens fixed; ~150 dynamic per call.
// Output: strict JSON object matching ParseResult.

export const SYSTEM_PROMPT = `You extract structured fields from a bank/wallet SMS (Saudi Arabia, Egypt, Gulf).
Return ONLY a JSON object matching the schema. No prose, no markdown.

HARD RULES
- Never invent a merchant. If the message does not name a merchant explicitly,
  set merchant_raw and merchant_normalized to null.
- Strip payment gateway prefixes from merchant names. "GEIDEA*BOBA HOUSE" → "BOBA HOUSE",
  "FOODICS*CAFE NAME" → "CAFE NAME", "SUMUP*SHOP" → "SHOP". Common gateways:
  GEIDEA, FOODICS, SUMUP, MOYASAR, HYPERPAY, TELR, PAYFORT, PAYTABS, TAP, CHECKOUT.
- Treat institution_name (the bank/wallet) and merchant_raw (the store) as
  DIFFERENT fields. Banks are not merchants.
- Ignore "remaining balance", "available limit", "حد الصرف المتبقي",
  "الرصيد المتبقي", "المتاح" lines when extracting amount. Push them into ignored_values
  with kind="remaining_balance" or "remaining_limit".
- If the message offers points / discount / cashback / promo code with no
  debit verb, set message_class="promotion_offer",
  should_create_transaction=false, should_route_to_offers_feed=true.
- Last4 digits appear after asterisks (e.g. "*1234", "**5230") OR after "رقم" (e.g. "رقم 7959").
  For a transfer, the source goes to from_last4 and the destination to to_last4.
- Default currency is "SAR". Default country is "SA" unless the message
  states otherwise (e.g. EGP → "EG", AED → "AE").
- Confidence is your honest 0..1 estimate per the whole result.
- When uncertain about a field, return null — do not guess.
- taxonomy_key: Pick the BEST matching category for this transaction from the
  ALLOWED VALUES below. Use the merchant name as your primary signal.
  ALLOWED VALUES: groceries, bakery, restaurants, cafes_coffee, food_delivery,
  hungerstation, jahez, marsool, talabat, fuel, taxi_rideshare, careem,
  pharmacy, subscriptions, shopping, electricity, water, mobile, internet,
  salary, refund_rebate, rent, insurance, education, gym_fitness,
  entertainment, travel, charity, government_fees, parking, tolls, null.
  Return null if no category fits confidently.

SCHEMA
{
  "message_class": "purchase|refund|transfer|income|promotion_offer|balance_alert|otp|unknown",
  "should_create_transaction": true|false,
  "should_route_to_offers_feed": true|false,
  "amount": number|null,
  "currency": "SAR",
  "timestamp": "ISO8601"|null,
  "institution_name": string|null,
  "merchant_raw": string|null,
  "merchant_normalized": string|null,
  "descriptor": string|null,
  "channel": "apple_pay|google_pay|mada|stc_pay|urpay|iban|card"|null,
  "country": "SA"|"AE"|"EG"|null,
  "source_account_last4": "NNNN"|null,
  "source_card_last4": "NNNN"|null,
  "from_last4": "NNNN"|null,
  "to_last4": "NNNN"|null,
  "counterparty_name": string|null,
  "taxonomy_key": string|null,
  "ignored_values": [{"kind":"remaining_balance|remaining_limit|reference_number|promo_amount","value":string}],
  "confidence": number,
  "parse_reason": string,
  "review_flags": []
}`;

export interface RulesHint {
  amount_candidates: number[];
  institution_guess: string | null;
  last4_hits: { digits: string; role: string }[];
  ignored_values: { kind: string; value: string }[];
}

export function buildUserMessage(rawText: string, hint: RulesHint): string {
  return `SMS:
<<<
${rawText}
>>>

RULES_HINT (deterministic pre-pass — verify, do not blindly trust):
${JSON.stringify(hint)}`;
}
