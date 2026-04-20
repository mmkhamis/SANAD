import AppIntents
import Foundation

// MARK: - LogSMSIntent
//
// Native App Intent surfaced in Apple Shortcuts as "Log SMS in SANAD".
// Runs in the background (no foregrounding) on iOS 16+. Sends the raw SMS
// text to the ingest-sms Edge Function, then posts a local notification
// with amount + category. The transaction lands in SANAD's review queue
// like any other SMS-sourced row (needs_review = true).

@available(iOS 16.0, *)
struct LogSMSIntent: AppIntent {
    static var title: LocalizedStringResource = "Log SMS in SANAD"
    static var description = IntentDescription(
        "Parse an SMS message and silently save it to your SANAD review queue."
    )

    // openAppWhenRun = false — true background execution, no UI handoff.
    // On iOS 18, supportedModes can be used for finer control; setting
    // openAppWhenRun = false continues to work on iOS 16/17/18.
    static var openAppWhenRun: Bool = false
    static var isDiscoverable: Bool = true

    @Parameter(
        title: "Message",
        description: "The SMS text to parse and log.",
        inputOptions: String.IntentInputOptions(
            keyboardType: .default,
            multiline: true
        )
    )
    var message: String

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$message) into SANAD")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 10 else {
            return .result(dialog: "That message is too short to be a transaction.")
        }

        // 1. Local hint for fallback notification text if the network call fails.
        let hint = SMSParser.parse(trimmed)
        guard hint.amount != nil else {
            return .result(dialog: "Couldn't find an amount in this message.")
        }

        // 2. Try the authoritative server ingest.
        do {
            let result = try await IngestClient.send(IngestRequest(message: trimmed))
            await LocalNotifier.sendTransactionResult(
                amount: result.amount ?? hint.amount,
                type: result.type,
                merchant: result.merchant ?? hint.merchant,
                counterparty: result.counterparty ?? hint.counterparty,
                category: result.category,
                currency: "EGP"
            )
            switch result.status {
            case "duplicate":
                return .result(dialog: "Already saved.")
            case "no_amount":
                return .result(dialog: "No amount detected.")
            default:
                return .result(dialog: "Saved to SANAD for review.")
            }
        } catch IngestError.noSession, IngestError.noConfig {
            await LocalNotifier.sendInfo(
                "Open SANAD to finish setup",
                body: "SANAD needs a quick sign-in before it can log SMS messages."
            )
            return .result(dialog: "Open SANAD to finish setup.")
        } catch {
            // Network or transient — queue for later.
            IngestClient.enqueueOffline(message: trimmed)
            await LocalNotifier.sendTransactionResult(
                amount: hint.amount,
                type: hint.type,
                merchant: hint.merchant,
                counterparty: hint.counterparty,
                category: nil,
                currency: "EGP"
            )
            return .result(dialog: "Saved offline — SANAD will sync when online.")
        }
    }
}
