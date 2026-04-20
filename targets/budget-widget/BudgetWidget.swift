import WidgetKit
import SwiftUI

// MARK: - Data Model

struct BudgetWidgetData: Codable {
    let totalBudgeted: Double
    let totalSpent: Double
    let currency: String
    let goals: [GoalItem]
    let onTrackCount: Int
    let nearLimitCount: Int
    let exceededCount: Int
    let updatedAt: String

    struct GoalItem: Codable, Identifiable {
        var id: String { name }
        let name: String
        let icon: String
        let budgeted: Double
        let spent: Double
        let percent: Double
        let status: String
    }

    var percentUsed: Double {
        guard totalBudgeted > 0 else { return 0 }
        return totalSpent / totalBudgeted
    }

    var remaining: Double {
        return max(totalBudgeted - totalSpent, 0)
    }

    var statusColor: Color {
        let pct = percentUsed * 100
        if pct >= 100 { return Color(.walletExpense) }
        if pct >= 80 { return Color(.walletWarning) }
        return Color(.walletIncome)
    }

    func formattedAmount(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 0
        let formatted = formatter.string(from: NSNumber(value: value)) ?? "\(Int(value))"
        return "\(currency) \(formatted)"
    }
}

extension BudgetWidgetData.GoalItem {
    var statusColor: Color {
        switch status {
        case "exceeded": return Color(.walletExpense)
        case "near_limit": return Color(.walletWarning)
        default: return Color(.walletIncome)
        }
    }

    var clampedPercent: Double {
        min(percent / 100.0, 1.0)
    }
}

// MARK: - App Group Data Loading

private let appGroupId = "group.com.sanad.app"
private let dataKey = "budgetWidgetData"

func loadBudgetData() -> BudgetWidgetData? {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let jsonString = defaults.string(forKey: dataKey),
          let jsonData = jsonString.data(using: .utf8) else {
        return nil
    }
    return try? JSONDecoder().decode(BudgetWidgetData.self, from: jsonData)
}

// MARK: - Timeline Provider

struct BudgetWidgetProvider: TimelineProvider {
    typealias Entry = BudgetEntry

    func placeholder(in context: Context) -> BudgetEntry {
        BudgetEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (BudgetEntry) -> Void) {
        let data = loadBudgetData() ?? .placeholder
        completion(BudgetEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BudgetEntry>) -> Void) {
        let data = loadBudgetData()
        let entry = BudgetEntry(date: Date(), data: data)
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Timeline Entry

struct BudgetEntry: TimelineEntry {
    let date: Date
    let data: BudgetWidgetData?
}

extension BudgetWidgetData {
    static let placeholder = BudgetWidgetData(
        totalBudgeted: 5000,
        totalSpent: 3250,
        currency: "SAR",
        goals: [
            GoalItem(name: "Food", icon: "🍔", budgeted: 2000, spent: 1600, percent: 80, status: "near_limit"),
            GoalItem(name: "Transport", icon: "🚗", budgeted: 1500, spent: 900, percent: 60, status: "on_track"),
            GoalItem(name: "Shopping", icon: "🛒", budgeted: 1500, spent: 750, percent: 50, status: "on_track"),
        ],
        onTrackCount: 2,
        nearLimitCount: 1,
        exceededCount: 0,
        updatedAt: ISO8601DateFormatter().string(from: Date())
    )
}

// MARK: - Entry View (Router)

struct BudgetWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: BudgetEntry

    var body: some View {
        Group {
            if let data = entry.data {
                switch family {
                case .systemMedium:
                    MediumBudgetView(data: data)
                default:
                    SmallBudgetView(data: data)
                }
            } else {
                EmptyBudgetView()
            }
        }
        .containerBackground(for: .widget) {
            Color(.systemBackground)
        }
    }
}

// MARK: - Small Widget

struct SmallBudgetView: View {
    let data: BudgetWidgetData

    var body: some View {
        VStack(spacing: 6) {
            Text("Budget")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.15), lineWidth: 7)

                Circle()
                    .trim(from: 0, to: CGFloat(min(data.percentUsed, 1.0)))
                    .stroke(
                        data.statusColor,
                        style: StrokeStyle(lineWidth: 7, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .animation(.easeOut(duration: 0.6), value: data.percentUsed)

                VStack(spacing: 1) {
                    Text("\(Int(data.percentUsed * 100))%")
                        .font(.system(.title3, design: .rounded).weight(.bold))
                        .foregroundStyle(data.statusColor)
                    Text("used")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 74, height: 74)

            VStack(spacing: 1) {
                Text(data.formattedAmount(data.remaining))
                    .font(.system(.caption2, design: .rounded).weight(.bold))
                    .foregroundStyle(data.statusColor)
                Text("remaining")
                    .font(.system(size: 9))
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Medium Widget

struct MediumBudgetView: View {
    let data: BudgetWidgetData

    var body: some View {
        HStack(spacing: 14) {
            // Left — ring + summary
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.15), lineWidth: 6)

                    Circle()
                        .trim(from: 0, to: CGFloat(min(data.percentUsed, 1.0)))
                        .stroke(
                            data.statusColor,
                            style: StrokeStyle(lineWidth: 6, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 0) {
                        Text("\(Int(data.percentUsed * 100))%")
                            .font(.system(.headline, design: .rounded).weight(.bold))
                        Text("total")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 60, height: 60)

                Text(data.formattedAmount(data.remaining))
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(data.statusColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text("remaining")
                    .font(.system(size: 8))
                    .foregroundStyle(.tertiary)
            }
            .frame(width: 80)

            // Divider
            Rectangle()
                .fill(Color.gray.opacity(0.15))
                .frame(width: 1)
                .padding(.vertical, 4)

            // Right — category list
            VStack(alignment: .leading, spacing: 0) {
                Text("Budget Status")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .padding(.bottom, 6)

                if data.goals.isEmpty {
                    Spacer()
                    Text("No budgets set")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Spacer()
                } else {
                    VStack(spacing: 8) {
                        ForEach(Array(data.goals.prefix(3).enumerated()), id: \.offset) { _, goal in
                            GoalRowView(goal: goal)
                        }
                    }

                    Spacer(minLength: 4)

                    // Footer status counts
                    HStack(spacing: 8) {
                        StatusBadge(count: data.onTrackCount, color: Color(.walletIncome), label: "ok")
                        StatusBadge(count: data.nearLimitCount, color: Color(.walletWarning), label: "warn")
                        StatusBadge(count: data.exceededCount, color: Color(.walletExpense), label: "over")
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 4)
    }
}

// MARK: - Goal Row (Medium widget)

struct GoalRowView: View {
    let goal: BudgetWidgetData.GoalItem

    var body: some View {
        VStack(spacing: 3) {
            HStack(spacing: 4) {
                Text(goal.icon)
                    .font(.system(size: 11))
                Text(goal.name)
                    .font(.system(size: 11, weight: .medium))
                    .lineLimit(1)
                Spacer()
                Text("\(Int(goal.percent))%")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(goal.statusColor)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.gray.opacity(0.12))
                        .frame(height: 4)

                    RoundedRectangle(cornerRadius: 2)
                        .fill(goal.statusColor)
                        .frame(width: geo.size.width * CGFloat(goal.clampedPercent), height: 4)
                }
            }
            .frame(height: 4)
        }
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let count: Int
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 2) {
            Circle()
                .fill(color)
                .frame(width: 5, height: 5)
            Text("\(count) \(label)")
                .font(.system(size: 8, weight: .medium))
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Empty State

struct EmptyBudgetView: View {
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "chart.pie")
                .font(.title2)
                .foregroundStyle(Color(.walletPrimary))

            Text("No Budget Data")
                .font(.caption.weight(.semibold))

            Text("Open SANAD to\nload your budgets")
                .font(.caption2)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Custom Colors
// Colors live in WalletColors.swift (shared across widgets).

// MARK: - Widget Configuration

struct BudgetStatusWidget: Widget {
    let kind: String = "BudgetStatusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BudgetWidgetProvider()) { entry in
            BudgetWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Budget Status")
        .description("Track your budget progress at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    BudgetStatusWidget()
} timeline: {
    BudgetEntry(date: .now, data: .placeholder)
}

#Preview("Medium", as: .systemMedium) {
    BudgetStatusWidget()
} timeline: {
    BudgetEntry(date: .now, data: .placeholder)
}

#Preview("Empty", as: .systemSmall) {
    BudgetStatusWidget()
} timeline: {
    BudgetEntry(date: .now, data: nil)
}
