import WidgetKit
import SwiftUI

// MARK: - Data Model

struct CharityWidgetData: Codable {
    let givenThisMonth: Double
    let givenThisYear: Double
    let donationCount: Int
    let currency: String
    let goal: Goal?
    let topCategory: TopCategory?
    let updatedAt: String

    struct Goal: Codable {
        let budgetAmount: Double
        let percent: Double
        let remaining: Double
        let status: String
    }

    struct TopCategory: Codable {
        let name: String
        let icon: String
        let amount: Double
    }

    var statusColor: Color {
        guard let g = goal else { return Color(.walletCharity) }
        switch g.status {
        case "exceeded":   return Color(.walletExpense)
        case "near_limit": return Color(.walletWarning)
        default:           return Color(.walletCharity)
        }
    }

    var goalProgress: Double {
        guard let g = goal, g.budgetAmount > 0 else { return 0 }
        return min(g.percent / 100.0, 1.0)
    }
}

// MARK: - App Group Loading

private let charityAppGroupId = "group.com.sanad.app"
private let charityDataKey   = "charityWidgetData"

func loadCharityData() -> CharityWidgetData? {
    guard let defaults = UserDefaults(suiteName: charityAppGroupId),
          let json = defaults.string(forKey: charityDataKey),
          let data = json.data(using: .utf8) else {
        return nil
    }
    return try? JSONDecoder().decode(CharityWidgetData.self, from: data)
}

// MARK: - Timeline Provider

struct CharityWidgetProvider: TimelineProvider {
    typealias Entry = CharityEntry

    func placeholder(in context: Context) -> CharityEntry {
        CharityEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (CharityEntry) -> Void) {
        completion(CharityEntry(date: Date(), data: loadCharityData() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CharityEntry>) -> Void) {
        let entry = CharityEntry(date: Date(), data: loadCharityData())
        let next  = Calendar.current.date(byAdding: .hour, value: 2, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct CharityEntry: TimelineEntry {
    let date: Date
    let data: CharityWidgetData?
}

extension CharityWidgetData {
    static let placeholder = CharityWidgetData(
        givenThisMonth: 450,
        givenThisYear: 4200,
        donationCount: 8,
        currency: "SAR",
        goal: Goal(budgetAmount: 1000, percent: 45, remaining: 550, status: "on_track"),
        topCategory: TopCategory(name: "Zakat", icon: "🕌", amount: 300),
        updatedAt: ISO8601DateFormatter().string(from: Date())
    )
}

// MARK: - Entry View

struct CharityWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: CharityEntry

    var body: some View {
        Group {
            if let data = entry.data {
                switch family {
                case .systemMedium: MediumCharityView(data: data)
                default:            SmallCharityView(data: data)
                }
            } else {
                EmptyCharityView()
            }
        }
        .containerBackground(for: .widget) { Color(.systemBackground) }
    }
}

// MARK: - Small

struct SmallCharityView: View {
    let data: CharityWidgetData

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "heart.fill")
                    .font(.caption2)
                    .foregroundStyle(data.statusColor)
                Text("Giving")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
            }

            if data.goal != nil {
                ZStack {
                    Circle().stroke(Color.gray.opacity(0.15), lineWidth: 7)
                    Circle()
                        .trim(from: 0, to: CGFloat(data.goalProgress))
                        .stroke(data.statusColor,
                                style: StrokeStyle(lineWidth: 7, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(.easeOut(duration: 0.6), value: data.goalProgress)

                    VStack(spacing: 1) {
                        Text("\(Int(data.goalProgress * 100))%")
                            .font(.system(.title3, design: .rounded).weight(.bold))
                            .foregroundStyle(data.statusColor)
                        Text("goal")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 74, height: 74)
            } else {
                Text(SanadFormat.compactAmount(data.givenThisMonth, currency: data.currency))
                    .font(.system(.title2, design: .rounded).weight(.bold))
                    .foregroundStyle(data.statusColor)
                    .padding(.vertical, 8)
            }

            VStack(spacing: 1) {
                Text(SanadFormat.compactAmount(data.givenThisMonth, currency: data.currency))
                    .font(.system(.caption2, design: .rounded).weight(.bold))
                    .foregroundStyle(data.statusColor)
                Text("this month")
                    .font(.system(size: 9))
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Medium

struct MediumCharityView: View {
    let data: CharityWidgetData

    var body: some View {
        HStack(spacing: 14) {
            // Left — ring + month
            VStack(spacing: 6) {
                ZStack {
                    if data.goal != nil {
                        Circle().stroke(Color.gray.opacity(0.15), lineWidth: 6)
                        Circle()
                            .trim(from: 0, to: CGFloat(data.goalProgress))
                            .stroke(data.statusColor,
                                    style: StrokeStyle(lineWidth: 6, lineCap: .round))
                            .rotationEffect(.degrees(-90))

                        VStack(spacing: 0) {
                            Text("\(Int(data.goalProgress * 100))%")
                                .font(.system(.headline, design: .rounded).weight(.bold))
                                .foregroundStyle(data.statusColor)
                            Text("of goal")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Circle()
                            .fill(data.statusColor.opacity(0.12))
                        Image(systemName: "heart.fill")
                            .font(.title2)
                            .foregroundStyle(data.statusColor)
                    }
                }
                .frame(width: 60, height: 60)

                Text(SanadFormat.compactAmount(data.givenThisMonth, currency: data.currency))
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(data.statusColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text("this month")
                    .font(.system(size: 8))
                    .foregroundStyle(.tertiary)
            }
            .frame(width: 80)

            Rectangle().fill(Color.gray.opacity(0.15)).frame(width: 1).padding(.vertical, 4)

            // Right — details
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 4) {
                    Image(systemName: "heart.fill")
                        .font(.caption2)
                        .foregroundStyle(Color(.walletCharity))
                    Text("Charity")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                }

                // Top category
                if let top = data.topCategory {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text(top.icon).font(.system(size: 12))
                            Text(top.name)
                                .font(.system(size: 11, weight: .semibold))
                                .lineLimit(1)
                        }
                        Text(SanadFormat.compactAmount(top.amount, currency: data.currency))
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(Color(.walletCharity))
                    }
                }

                // Stats
                VStack(alignment: .leading, spacing: 2) {
                    StatLine(label: "Donations",
                             value: "\(data.donationCount)")
                    StatLine(label: "Year total",
                             value: SanadFormat.compactAmount(
                                data.givenThisYear, currency: data.currency))
                    if let g = data.goal {
                        StatLine(label: "Remaining",
                                 value: SanadFormat.compactAmount(
                                    g.remaining, currency: data.currency))
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

struct StatLine: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(.tertiary)
            Spacer()
            Text(value)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
    }
}

// MARK: - Empty

struct EmptyCharityView: View {
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "heart")
                .font(.title2)
                .foregroundStyle(Color(.walletCharity))
            Text("Start Giving")
                .font(.caption.weight(.semibold))
            Text("Open SANAD to\nlog a donation")
                .font(.caption2)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Widget

struct CharityWidget: Widget {
    let kind: String = "CharityWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CharityWidgetProvider()) { entry in
            CharityWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Charity Goals")
        .description("Track your monthly giving and zakat.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    CharityWidget()
} timeline: {
    CharityEntry(date: .now, data: .placeholder)
}

#Preview("Medium", as: .systemMedium) {
    CharityWidget()
} timeline: {
    CharityEntry(date: .now, data: .placeholder)
}
