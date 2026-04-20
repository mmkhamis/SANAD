import Foundation
import UserNotifications

// MARK: - LocalNotifier
//
// Posts a single information-dense notification matching the format used
// by services/notification-service.ts → notifySmsTransaction.
//   Title:  "+1,234.56 EGP · MERCHANT"
//   Body:   "Groceries · tap to review"   (or "Tap to review & categorize")

enum LocalNotifier {
    static func sendTransactionResult(
        amount: Double?,
        type: TxDirection,
        merchant: String?,
        counterparty: String?,
        category: String?,
        currency: String
    ) async {
        let title = formatTitle(amount: amount, type: type, merchant: merchant, counterparty: counterparty, currency: currency)
        let body = category.map { "\($0) · tap to review" } ?? "Tap to review & categorize"
        await post(title: title, body: body, info: [
            "source": "log_sms_intent",
            "type": type.rawValue,
        ])
    }

    static func sendInfo(_ title: String, body: String) async {
        await post(title: title, body: body, info: ["source": "log_sms_intent"])
    }

    private static func formatTitle(
        amount: Double?,
        type: TxDirection,
        merchant: String?,
        counterparty: String?,
        currency: String
    ) -> String {
        let sign: String
        switch type {
        case .income: sign = "+"
        case .expense: sign = "-"
        case .transfer: sign = ""
        }
        let amountStr: String
        if let amount = amount {
            let nf = NumberFormatter()
            nf.numberStyle = .decimal
            nf.minimumFractionDigits = 2
            nf.maximumFractionDigits = 2
            nf.locale = Locale(identifier: "en_US")
            amountStr = "\(sign)\(nf.string(from: NSNumber(value: amount)) ?? String(amount)) \(currency)"
        } else {
            amountStr = type.rawValue.capitalized
        }
        let person = merchant ?? counterparty
        return person.map { "\(amountStr) · \($0)" } ?? "\(amountStr) · \(type.rawValue)"
    }

    private static func post(title: String, body: String, info: [String: Any]) async {
        let center = UNUserNotificationCenter.current()
        // Make sure permission is at least determined; do not block here if denied.
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .notDetermined {
            _ = try? await center.requestAuthorization(options: [.alert, .sound])
        }
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.userInfo = info
        let request = UNNotificationRequest(
            identifier: "log-sms-intent-\(UUID().uuidString)",
            content: content,
            trigger: nil
        )
        try? await center.add(request)
    }
}
