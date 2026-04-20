import WidgetKit
import SwiftUI

@main
struct BudgetWidgetBundle: WidgetBundle {
    var body: some Widget {
        BudgetStatusWidget()
        CommitmentsWidget()
        CharityWidget()
    }
}
