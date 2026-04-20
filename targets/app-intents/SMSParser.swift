import Foundation

// MARK: - SMSParser (Swift port — minimum viable subset)
//
// Mirrors the behaviour of utils/sms-parser.ts → parseSmsToTransaction for
// the cases that matter to the App Intent's local notification text. The
// AUTHORITATIVE parser still runs server-side inside the ingest-sms Edge
// Function — these hints are advisory and used only to pick a friendly
// notification title before the network round-trip completes.

struct ParsedSMSHint {
    let amount: Double?
    let type: TxDirection
    let merchant: String?
    let counterparty: String?
}

enum TxDirection: String {
    case income, expense, transfer
}

enum SMSParser {
    // MARK: Entry

    static func parse(_ raw: String) -> ParsedSMSHint {
        let text = normalizeDigits(raw)
        let amount = extractAmount(text)
        let type = detectType(text)
        let merchant = extractMerchant(text)
        let counterparty = extractCounterparty(text, dir: type)
        return ParsedSMSHint(
            amount: amount,
            type: type,
            merchant: counterparty != nil ? nil : merchant,
            counterparty: counterparty
        )
    }

    // MARK: Helpers

    private static let arabicDigits: [Character: Character] = [
        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
        "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    ]

    private static func normalizeDigits(_ s: String) -> String {
        String(s.map { arabicDigits[$0] ?? $0 })
    }

    // Currency-adjacent number extraction
    private static let currencies: [String] = [
        "SAR", "AED", "EGP", "KWD", "QAR", "BHD", "OMR", "JOD",
        "USD", "EUR", "GBP", "LE",
        "ج.م", "جم", "جنيه", "ر.س", "ريال", "د.إ", "درهم",
    ]

    private static func extractAmount(_ text: String) -> Double? {
        let escaped = currencies.map { NSRegularExpression.escapedPattern(for: $0) }.joined(separator: "|")
        let patterns: [String] = [
            "(?:\(escaped))\\s*([\\d,]+\\.?\\d*)",
            "([\\d,]+\\.?\\d*)\\s*(?:\(escaped))",
            "(?i)(?:amount|مبلغ|قيمة)[:\\s]*([\\d,]+\\.?\\d*)",
        ]
        var best: Double?
        for p in patterns {
            if let n = firstCapturedNumber(text, pattern: p) {
                if best == nil || n > best! { best = n }
            }
        }
        if best != nil { return best }

        // Fallback — largest plausible standalone number
        let any = matchAll(text, pattern: "(\\d[\\d,]*\\.?\\d*)")
        for raw in any {
            let cleaned = raw.replacingOccurrences(of: ",", with: "")
            if let n = Double(cleaned), n > 0, n < 1_000_000 {
                if cleaned.range(of: "^\\d{7,}$", options: .regularExpression) == nil {
                    if best == nil || n > best! { best = n }
                }
            }
        }
        return best
    }

    private static let arabicTransfer = ["تحويل لحظي", "تحويل بنكي", "تم تحويل"]
    private static let arabicIncoming = ["تم إضافة", "تم اضافة", "تم استلام", "تم ايداع", "تم إيداع"]
    private static let arabicOutgoing = ["تم خصم", "تم إرسال", "تم ارسال", "تم الدفع", "تم السحب", "تم سحب"]
    private static let arabicIncomingCtx = ["لبطاقتكم", "لبطاقتك", "لحسابكم", "لحسابك"]
    private static let arabicOutgoingCtx = ["من حسابكم", "من حسابك", "من بطاقتكم", "من بطاقتك"]
    private static let arabicIncomeVerbs = ["حولي", "حوّل لي", "حوّلي", "بعتلي", "بعت لي", "ارسل لي", "ارسلي", "وصلي", "وصل لي"]
    private static let englishIncome = ["received", "credited", "credit", "deposit", "salary", "refund", "cashback"]
    private static let englishExpense = ["purchase", "spent", "paid", "debit", "debited", "withdrawn", "charged", "pos"]
    private static let englishTransfer = ["transfer to", "transfer from", "moved to", "internal transfer", "transferred to", "transferred from"]

    private static func detectType(_ text: String) -> TxDirection {
        let lower = text.lowercased()
        for k in arabicTransfer where lower.contains(k) { return .transfer }
        for k in englishTransfer where lower.contains(k) { return .transfer }
        if lower.contains("تحويل") { return .transfer }
        for k in arabicIncoming where lower.contains(k) { return .income }
        for k in arabicOutgoing where lower.contains(k) { return .expense }
        for k in arabicIncomingCtx where lower.contains(k) { return .income }
        for k in arabicOutgoingCtx where lower.contains(k) { return .expense }
        for k in arabicIncomeVerbs where lower.contains(k) { return .income }
        for k in englishIncome where lower.contains(k) { return .income }
        for k in englishExpense where lower.contains(k) { return .expense }
        return .expense
    }

    private static let merchantTerm =
        "(?:\\s+on\\b|\\s+ref\\b|\\s+at\\s+\\d|\\s+يوم\\b|\\s+بتاريخ\\b|\\s+الساعه\\b|\\s+الساعة\\b|\\s+في\\s+\\d|\\s+بمبلغ\\b|\\s+كود\\b|\\s+رقم\\b|\\s+المتاح\\b|\\s+للمزيد\\b|\\s*[.,]|\\s*$)"

    private static func extractMerchant(_ text: String) -> String? {
        let patterns = [
            "(?i)(?:at|from|عند|لدى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)\(merchantTerm)",
            "(?i)(?:to|إلى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)\(merchantTerm)",
        ]
        for p in patterns {
            if let m = firstCapturedString(text, pattern: p)?.trimmingCharacters(in: .whitespacesAndNewlines) {
                if m.count >= 2,
                   m.range(of: "^\\d+$", options: .regularExpression) == nil,
                   m.range(of: "^(mobile\\s+payment|pos|card|online|بطاقة|حساب)", options: [.regularExpression, .caseInsensitive]) == nil {
                    return m
                }
            }
        }
        return nil
    }

    private static func extractCounterparty(_ text: String, dir: TxDirection) -> String? {
        // Mirrors extractBankSMSCounterparty in utils/sms-parser.ts.
        // Note: dir == .transfer reuses the same fork as expense (sender side),
        // matching the JS logic's `directionForCounterparty` mapping.
        let pattern: String
        if dir == .income {
            pattern = "من\\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم|خلال)([A-Za-z\\u0600-\\u06FF][A-Za-z\\u0600-\\u06FF\\s.]{2,50}?)(?:\\s+رقم|\\s+يوم|\\s+بتاريخ|\\s+في\\b|\\s*$)"
        } else {
            pattern = "(?:إلى|الى)\\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم)([A-Za-z\\u0600-\\u06FF][A-Za-z\\u0600-\\u06FF\\s.]{2,50}?)(?:\\s+رقم|\\s+يوم|\\s+بتاريخ|\\s+في\\b|\\s*$)"
        }
        return firstCapturedString(text, pattern: pattern)?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: Regex utilities

    private static func firstCapturedString(_ text: String, pattern: String) -> String? {
        guard let re = try? NSRegularExpression(pattern: pattern, options: []) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = re.firstMatch(in: text, options: [], range: range) else { return nil }
        guard match.numberOfRanges > 1 else { return nil }
        let captured = match.range(at: 1)
        if captured.location == NSNotFound { return nil }
        guard let r = Range(captured, in: text) else { return nil }
        return String(text[r])
    }

    private static func firstCapturedNumber(_ text: String, pattern: String) -> Double? {
        guard let s = firstCapturedString(text, pattern: pattern) else { return nil }
        let cleaned = s.replacingOccurrences(of: ",", with: "")
        return Double(cleaned)
    }

    private static func matchAll(_ text: String, pattern: String) -> [String] {
        guard let re = try? NSRegularExpression(pattern: pattern, options: []) else { return [] }
        let range = NSRange(text.startIndex..., in: text)
        let matches = re.matches(in: text, options: [], range: range)
        return matches.compactMap { m in
            guard m.numberOfRanges > 1, let r = Range(m.range(at: 1), in: text) else { return nil }
            return String(text[r])
        }
    }
}
