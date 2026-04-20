import SwiftUI
import UIKit

// MARK: - Shared Wallet Brand Colors
//
// Single source of truth for widget colors. Matches the RN app's
// constants/colors.ts palette so widgets feel native to the product.

extension UIColor {
    static let walletPrimary      = UIColor(red: 139/255, green:  92/255, blue: 246/255, alpha: 1) // #8B5CF6
    static let walletPrimaryLight = UIColor(red: 167/255, green: 139/255, blue: 250/255, alpha: 1) // #A78BFA
    static let walletPrimaryDark  = UIColor(red: 124/255, green:  58/255, blue: 237/255, alpha: 1) // #7C3AED
    static let walletIncome       = UIColor(red:  52/255, green: 211/255, blue: 153/255, alpha: 1) // #34D399
    static let walletWarning      = UIColor(red: 251/255, green: 191/255, blue:  36/255, alpha: 1) // #FBBF24
    static let walletExpense      = UIColor(red: 251/255, green: 113/255, blue: 133/255, alpha: 1) // #FB7185
    static let walletInfo         = UIColor(red:  96/255, green: 165/255, blue: 250/255, alpha: 1) // #60A5FA
    static let walletCharity      = UIColor(red: 236/255, green:  72/255, blue: 153/255, alpha: 1) // #EC4899 (rose-500)
}

// MARK: - Number helpers

enum SanadFormat {
    static func amount(_ value: Double, currency: String) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 0
        let formatted = formatter.string(from: NSNumber(value: value)) ?? "\(Int(value))"
        return "\(currency) \(formatted)"
    }

    static func compactAmount(_ value: Double, currency: String) -> String {
        let abs = fabs(value)
        if abs >= 1_000_000 {
            return String(format: "%@ %.1fM", currency, value / 1_000_000)
        }
        if abs >= 1_000 {
            return String(format: "%@ %.1fK", currency, value / 1_000)
        }
        return amount(value, currency: currency)
    }
}
