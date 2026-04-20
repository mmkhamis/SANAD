import AppIntents

// MARK: - WalletAppShortcuts
//
// Declares the App Shortcut tile shown in the system Shortcuts app.
// The user (or an Automation) can drop this tile in any flow and pass
// the message text as the action's input.

@available(iOS 16.0, *)
struct WalletAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogSMSIntent(),
            phrases: [
                "Log SMS in \(.applicationName)",
                "Save SMS to \(.applicationName)",
                "Add SMS to \(.applicationName)",
            ],
            shortTitle: "Log SMS in SANAD",
            systemImageName: "message.badge.filled.fill"
        )
    }
}
