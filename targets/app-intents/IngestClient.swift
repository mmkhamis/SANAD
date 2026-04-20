import Foundation

// MARK: - IngestClient
//
// Calls the Supabase Edge Function `ingest-sms` with a Bearer JWT.
// On 401, refreshes the access token via /auth/v1/token and retries once.
// On any unrecoverable failure, persists the message into the shared
// App Group offline queue so JS can replay it on next foreground.

struct IngestRequest {
    let message: String
}

struct IngestResult {
    let amount: Double?
    let type: TxDirection
    let merchant: String?
    let counterparty: String?
    let category: String?
    let status: String
}

enum IngestError: Error {
    case noConfig
    case noSession
    case http(Int, String)
    case decode
    case network(Error)
}

enum IngestClient {
    static func send(_ request: IngestRequest) async throws -> IngestResult {
        let config = try SharedCredentials.loadConfig()
        var session = try SharedCredentials.loadSession()

        // Refresh if expiring within 60s
        if session.expiresAt - Date().timeIntervalSince1970 < 60 {
            if let refreshed = try? await refresh(session: session, config: config) {
                session = refreshed
                try? SharedCredentials.saveSession(refreshed)
            }
        }

        do {
            return try await postIngest(request, session: session, config: config)
        } catch IngestError.http(let code, _) where code == 401 {
            // One-shot refresh on 401
            let refreshed = try await refresh(session: session, config: config)
            try? SharedCredentials.saveSession(refreshed)
            return try await postIngest(request, session: refreshed, config: config)
        }
    }

    // MARK: - Ingest call

    private static func postIngest(
        _ request: IngestRequest,
        session: SupabaseSession,
        config: SupabaseConfig
    ) async throws -> IngestResult {
        guard let url = URL(string: "\(config.url)/functions/v1/ingest-sms") else {
            throw IngestError.noConfig
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let bodyJson: [String: Any] = ["message": request.message]
        req.httpBody = try JSONSerialization.data(withJSONObject: bodyJson)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: req)
        } catch {
            throw IngestError.network(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw IngestError.http(0, "no response")
        }
        if !(200...299).contains(http.statusCode) {
            throw IngestError.http(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw IngestError.decode
        }
        let status = (json["status"] as? String) ?? "ok"
        let txDict = json["transaction"] as? [String: Any]

        let amount = txDict?["amount"] as? Double
        let typeStr = (txDict?["type"] as? String) ?? "expense"
        let type = TxDirection(rawValue: typeStr) ?? .expense
        let merchant = txDict?["merchant"] as? String
        let counterparty = txDict?["counterparty"] as? String
        let category = txDict?["category_name"] as? String

        return IngestResult(
            amount: amount,
            type: type,
            merchant: merchant,
            counterparty: counterparty,
            category: category,
            status: status
        )
    }

    // MARK: - Token refresh

    private static func refresh(
        session: SupabaseSession,
        config: SupabaseConfig
    ) async throws -> SupabaseSession {
        guard let url = URL(string: "\(config.url)/auth/v1/token?grant_type=refresh_token") else {
            throw IngestError.noConfig
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "refresh_token": session.refreshToken,
        ])

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw IngestError.http(0, "refresh failed")
        }
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw IngestError.decode
        }
        guard
            let access = json["access_token"] as? String,
            let refresh = json["refresh_token"] as? String,
            let user = json["user"] as? [String: Any],
            let userId = user["id"] as? String
        else {
            throw IngestError.decode
        }
        let expiresIn = (json["expires_in"] as? Double) ?? 3600
        return SupabaseSession(
            accessToken: access,
            refreshToken: refresh,
            expiresAt: Date().timeIntervalSince1970 + expiresIn,
            userId: userId
        )
    }

    // MARK: - Offline queue (App Group defaults)

    static func enqueueOffline(message: String) {
        let suite = "group.com.sanad.app"
        guard let defaults = UserDefaults(suiteName: suite) else { return }
        let key = "wallet.sms.offlineQueue"
        var arr = (defaults.array(forKey: key) as? [[String: Any]]) ?? []
        arr.append([
            "id": UUID().uuidString,
            "type": "sms_raw_ingest",
            "message": message,
            "queuedAt": Date().timeIntervalSince1970,
        ])
        defaults.set(arr, forKey: key)
        defaults.synchronize()
    }
}
