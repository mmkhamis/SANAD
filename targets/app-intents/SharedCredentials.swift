import Foundation
import Security

// MARK: - SharedCredentials
//
// Reads the Supabase URL + anon key (App Group) and the active session JSON
// (shared Keychain) that JavaScript publishes via WidgetSharedDataModule.
//
// All keys + service names MUST stay in sync with:
//   modules/widget-shared-data/ios/WidgetSharedDataModule.swift
//   services/native-session-bridge.ts

enum SharedCredentialsError: Error {
    case missingConfig
    case missingSession
    case decodeFailed
}

struct SupabaseConfig {
    let url: String
    let anonKey: String
}

struct SupabaseSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: TimeInterval
    let userId: String
}

enum SharedCredentials {
    private static let suiteName = "group.com.sanad.app"
    private static let urlKey = "wallet.supabase.url"
    private static let anonKeyKey = "wallet.supabase.anonKey"
    private static let keychainService = "com.sanad.app.session"
    private static let keychainAccount = "supabase_session_v1"

    // MARK: Config (App Group UserDefaults)

    static func loadConfig() throws -> SupabaseConfig {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            throw SharedCredentialsError.missingConfig
        }
        guard
            let url = defaults.string(forKey: urlKey), !url.isEmpty,
            let anonKey = defaults.string(forKey: anonKeyKey), !anonKey.isEmpty
        else {
            throw SharedCredentialsError.missingConfig
        }
        return SupabaseConfig(url: url, anonKey: anonKey)
    }

    // MARK: Session (Keychain)

    static func loadSession() throws -> SupabaseSession {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else {
            throw SharedCredentialsError.missingSession
        }
        do {
            return try JSONDecoder().decode(SupabaseSession.self, from: data)
        } catch {
            throw SharedCredentialsError.decodeFailed
        }
    }

    static func saveSession(_ session: SupabaseSession) throws {
        let data = try JSONEncoder().encode(session)
        let baseQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
        ]
        let updateAttrs: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        let updateStatus = SecItemUpdate(baseQuery as CFDictionary, updateAttrs as CFDictionary)
        if updateStatus == errSecSuccess { return }
        if updateStatus == errSecItemNotFound {
            var addQuery = baseQuery
            addQuery[kSecValueData as String] = data
            addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            if addStatus != errSecSuccess {
                throw SharedCredentialsError.missingSession
            }
        }
    }
}
