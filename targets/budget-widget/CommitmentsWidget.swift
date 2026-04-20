import WidgetKit
import SwiftUI

// MARK: - Data Model

struct CommitmentsWidgetData: Codable {
    let items: [Item]
    let totalDueThisMonth: Double
    let currency: String
    let paidCount: Int
    let remainingCount: Int
    let updatedAt: String

    struct Item: Codable, Identifiable {
        var id: String { widgetId }
        let widgetId: String
        let name: String
        let icon: String
        let amount: Double
        let dueDateIso: String
        let daysUntilDue: Int
        let isOverdue: Bool
        let categoryColor: String?
    }

    func color(for hex: String?) -> Color {
        guard let hex = hex, let ui = UIColor(hex: hex) else { return Color(.walletPrimary) }
        return Color(ui)
    }
}

extension CommitmentsWidgetData.Item {
    var urgencyColor: Color {
        if isOverdue { return Color(.walletExpense) }
        if daysUntilDue <= 3 { return Color(.walletWarning) }
        if daysUntilDue <= 7 { return Color(.walletPrimary) }
        return Color(.walletIncome)
    }

    var dueLabel: String {
        if isOverdue { return "overdue" }
        if daysUntilDue == 0 { return "today" }
        if daysUntilDue == 1 { return "tmrw" }
        return "\(daysUntilDue)d"
    }
}

// MARK: - UIColor hex helper

extension UIColor {
    convenience init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let value = UInt32(s, radix: 16) else { return nil }
        self.init(
            red:   CGFloat((value & 0xFF0000) >> 16) / 255,
            green: CGFloat((value & 0x00FF00) >>  8) / 255,
            blue:  CGFloat( value & 0x0000FF       ) / 255,
            alpha: 1
        )
    }
}

// MARK: - App Group Loading

private let commitmentsAppGroupId = "group.com.sanad.app"
private let commitmentsDataKey   = "commitmentsWidgetData"

func loadCommitmentsData() -> CommitmentsWidgetData? {
    guard let defaults = UserDefaults(suiteName: commitmentsAppGroupId),
          let json = defaults.string(forKey: commitmentsDataKey),
          let data = json.data(using: .utf8) else {
        return nil
    }
    return try? JSONDecoder().decode(CommitmentsWidgetData.self, from: data)
}

// MARK: - Timeline Provider

struct CommitmentsWidgetProvider: TimelineProvider {
    typealias Entry = CommitmentsEntry

    func placeholder(in context: Context) -> CommitmentsEntry {
        CommitmentsEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (CommitmentsEntry) -> Void) {
        completion(CommitmentsEntry(date: Date(), data: loadCommitmentsData() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CommitmentsEntry>) -> Void) {
        let entry = CommitmentsEntry(date: Date(), data: loadCommitmentsData())
        let next  = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct CommitmentsEntry: TimelineEntry {
    let date: Date
    let data: CommitmentsWidgetData?
}

extension CommitmentsWidgetData {
    static let placeholder = CommitmentsWidgetData(
        items: [
            Item(widgetId: "1", name: "Netflix",       icon: "🎬", amount: 55,  dueDateIso: "",
                 daysUntilDue: 2, isOverdue: false, categoryColor: "#FB7185"),
            Item(widgetId: "2", name: "Rent",          icon: "🏠", amount: 2500, dueDateIso: "",
                 daysUntilDue: 5, isOverdue: false, categoryColor: "#8B5CF6"),
            Item(widgetId: "3", name: "Electricity",   icon: "⚡️", amount: 180, dueDateIso: "",
                 daysUntilDue: 12, isOverdue: false, categoryColor: "#FBBF24"),
        ],
        totalDueThisMonth: 2735,
        currency: "SAR",
        paidCount: 3,
        remainingCount: 3,
        updatedAt: ISO8601DateFormatter().string(from: Date())
    )
}

// MARK: - Entry View

struct CommitmentsWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: CommitmentsEntry

    var body: some View {
        Group {
            if let data = entry.data, !data.items.isEmpty {
                switch family {
                case .systemMedium: MediumCommitmentsView(data: data)
                default:            SmallCommitmentsView(data: data)
                }
            } else {
                EmptyCommitmentsView()
            }
        }
        .containerBackground(for: .widget) { Color(.systemBackground) }
    }
}

// MARK: - Small

struct SmallCommitmentsView: View {
    let data: CommitmentsWidgetData

    private var next: CommitmentsWidgetData.Item? { data.items.first }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "calendar.badge.clock")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color(.walletPrimary))
                Text("Next Payment")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
            }

            if let item = next {
                HStack(spacing: 6) {
                    Text(item.icon).font(.title3)
                    Text(item.name)
                        .font(.system(.subheadline, design: .rounded).weight(.semibold))
                        .lineLimit(1)
                }
                Text(SanadFormat.compactAmount(item.amount, currency: data.currency))
                    .font(.system(.title3, design: .rounded).weight(.bold))
                    .foregroundStyle(Color(.walletPrimary))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                HStack(spacing: 4) {
                    Circle().fill(item.urgencyColor).frame(width: 6, height: 6)
                    Text(item.dueLabel)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(item.urgencyColor)
                        .textCase(.uppercase)
                }
            }

            Spacer(minLength: 0)

            HStack(spacing: 4) {
                Text("\(data.remainingCount) left")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.tertiary)
                Spacer()
                Text(SanadFormat.compactAmount(data.totalDueThisMonth, currency: data.currency))
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Medium

struct MediumCommitmentsView: View {
    let data: CommitmentsWidgetData

    var body: some View {
        HStack(spacing: 14) {
            // Left — totals
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color(.walletPrimary))
                    Text("Due")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                }

                Text(SanadFormat.compactAmount(data.totalDueThisMonth, currency: data.currency))
                    .font(.system(.title3, design: .rounded).weight(.bold))
                    .foregroundStyle(Color(.walletPrimary))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)

                Text("this month")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)

                Spacer(minLength: 4)

                HStack(spacing: 6) {
                    CountChip(count: data.paidCount,
                              color: Color(.walletIncome),
                              label: "paid")
                    CountChip(count: data.remainingCount,
                              color: Color(.walletWarning),
                              label: "left")
                }
            }
            .frame(width: 100, alignment: .leading)

            Rectangle().fill(Color.gray.opacity(0.15)).frame(width: 1).padding(.vertical, 4)

            // Right — next 3
            VStack(alignment: .leading, spacing: 0) {
                Text("Upcoming")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .padding(.bottom, 6)

                VStack(spacing: 7) {
                    ForEach(Array(data.items.prefix(3).enumerated()), id: \.offset) { _, item in
                        CommitmentRow(item: item, currency: data.currency)
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 4)
    }
}

struct CommitmentRow: View {
    let item: CommitmentsWidgetData.Item
    let currency: String

    var body: some View {
        HStack(spacing: 6) {
            Text(item.icon).font(.system(size: 13))
            VStack(alignment: .leading, spacing: 1) {
                Text(item.name)
                    .font(.system(size: 11, weight: .semibold))
                    .lineLimit(1)
                Text(item.dueLabel)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(item.urgencyColor)
                    .textCase(.uppercase)
            }
            Spacer(minLength: 4)
            Text(SanadFormat.compactAmount(item.amount, currency: currency))
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(Color(.label))
                .lineLimit(1)
        }
    }
}

struct CountChip: View {
    let count: Int
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 3) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text("\(count) \(label)")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Empty

struct EmptyCommitmentsView: View {
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "calendar.badge.checkmark")
                .font(.title2)
                .foregroundStyle(Color(.walletIncome))
            Text("All Clear")
                .font(.caption.weight(.semibold))
            Text("No upcoming\npayments")
                .font(.caption2)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Widget

struct CommitmentsWidget: Widget {
    let kind: String = "CommitmentsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CommitmentsWidgetProvider()) { entry in
            CommitmentsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Upcoming Payments")
        .description("Stay on top of bills and subscriptions.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    CommitmentsWidget()
} timeline: {
    CommitmentsEntry(date: .now, data: .placeholder)
}

#Preview("Medium", as: .systemMedium) {
    CommitmentsWidget()
} timeline: {
    CommitmentsEntry(date: .now, data: .placeholder)
}
