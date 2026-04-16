import { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Coins,
  ShoppingBag,
  Car,
  Utensils,
  Gamepad2,
  Wifi,
  Home as HomeIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Landmark,
  User,
  PieChart
} from 'lucide-react';
import { RiyalSymbol } from './components/RiyalSymbol';


// Mock data
const dashboardData = {
  currentBalance: 12847.50,
  monthlySpending: 3245.80,
  monthlyIncome: 5600.00,
  netWorth: 45230.00,
  balanceChange: 5.2,
  spendingChange: -12.4,
  incomeChange: 0,
  netWorthChange: 8.7
};

const budgetCategories = [
  { id: 1, name: 'Food', icon: Utensils, spent: 420, budget: 600, color: 'bg-emerald-500' },
  { id: 2, name: 'Transport', icon: Car, spent: 280, budget: 300, color: 'bg-blue-500' },
  { id: 3, name: 'Shopping', icon: ShoppingBag, spent: 850, budget: 800, color: 'bg-amber-500' },
  { id: 4, name: 'Entertainment', icon: Gamepad2, spent: 180, budget: 250, color: 'bg-purple-500' },
  { id: 5, name: 'Bills', icon: Wifi, spent: 320, budget: 400, color: 'bg-cyan-500' },
  { id: 6, name: 'Housing', icon: HomeIcon, spent: 1200, budget: 1200, color: 'bg-rose-500' },
];

const upcomingBills = [
  { id: 1, name: 'Rent', amount: 1200, dueDate: 'Apr 15', type: 'bill' },
  { id: 2, name: 'Car Loan', amount: 385, dueDate: 'Apr 18', type: 'loan' },
  { id: 3, name: 'Internet', amount: 65, dueDate: 'Apr 20', type: 'bill' },
  { id: 4, name: 'Electricity', amount: 95, dueDate: 'Apr 22', type: 'bill' },
  { id: 5, name: 'Student Loan', amount: 250, dueDate: 'Apr 25', type: 'loan' },
  { id: 6, name: 'Phone', amount: 45, dueDate: 'Apr 28', type: 'bill' },
];

const transactions = [
  {
    date: '2026-04-13',
    label: 'Today',
    items: [
      { id: 1, name: 'Whole Foods', category: 'Food', amount: -67.50, time: '2:45 PM', icon: Utensils },
      { id: 2, name: 'Salary Deposit', category: 'Income', amount: 2800.00, time: '9:00 AM', icon: TrendingUp },
      { id: 3, name: 'Uber', category: 'Transport', amount: -18.20, time: '8:15 AM', icon: Car },
    ]
  },
  {
    date: '2026-04-12',
    label: 'Yesterday',
    items: [
      { id: 4, name: 'Netflix', category: 'Entertainment', amount: -15.99, time: '6:30 PM', icon: Gamepad2 },
      { id: 5, name: 'Target', category: 'Shopping', amount: -124.30, time: '3:20 PM', icon: ShoppingBag },
      { id: 6, name: 'Starbucks', category: 'Food', amount: -8.75, time: '7:45 AM', icon: Utensils },
    ]
  },
  {
    date: '2026-04-11',
    label: 'Apr 11',
    items: [
      { id: 7, name: 'Amazon', category: 'Shopping', amount: -89.99, time: '4:15 PM', icon: ShoppingBag },
      { id: 8, name: 'Shell Gas', category: 'Transport', amount: -52.00, time: '5:30 PM', icon: Car },
    ]
  },
];

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');


  return (
    <div className="min-h-screen bg-slate-100 text-white relative">
      {/* Mobile Container */}
      <div className="mx-auto max-w-[430px] min-h-screen backdrop-blur-xl relative" style={{ background: 'linear-gradient(to bottom, #1a1f2e, #242938, #1a1f2e)' }}>

        {/* Header */}
        <header className="px-6 pt-12 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Sain</h1>
              <p className="text-sm text-slate-400 mt-0.5">Welcome back</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-semibold">
              JD
            </div>
          </div>
        </header>

        {/* Dashboard Card */}
        <section className="px-6 pb-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-950/80 border border-slate-700/30 backdrop-blur-sm p-5 shadow-2xl">
            {/* Gradient overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />

            <div className="relative z-10">
              {/* Current Balance */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center shadow-lg shadow-violet-500/10">
                      <Wallet className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-xs text-slate-400">Current Balance</span>
                  </div>
                  {dashboardData.balanceChange !== 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ArrowUpRight className="w-3 h-3" />
                      {Math.abs(dashboardData.balanceChange)}%
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                    {dashboardData.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <RiyalSymbol className="w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Separator */}
              <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent mb-3" />

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-400">Spending</div>
                  <div className="flex items-center gap-1 text-base font-semibold">
                    {(dashboardData.monthlySpending / 1000).toFixed(1)}k
                    <RiyalSymbol className="w-3 h-3 text-slate-500" />
                  </div>
                  {dashboardData.spendingChange !== 0 && (
                    <div className="flex items-center gap-0.5 text-xs font-medium text-rose-400">
                      <ArrowDownRight className="w-3 h-3" />
                      {Math.abs(dashboardData.spendingChange)}%
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-400">Income</div>
                  <div className="flex items-center gap-1 text-base font-semibold">
                    {(dashboardData.monthlyIncome / 1000).toFixed(1)}k
                    <RiyalSymbol className="w-3 h-3 text-slate-500" />
                  </div>
                  {dashboardData.incomeChange === 0 && (
                    <div className="text-xs text-slate-500">—</div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-400">Net Worth</div>
                  <div className="flex items-center gap-1 text-base font-semibold">
                    {(dashboardData.netWorth / 1000).toFixed(1)}k
                    <RiyalSymbol className="w-3 h-3 text-slate-500" />
                  </div>
                  {dashboardData.netWorthChange !== 0 && (
                    <div className="flex items-center gap-0.5 text-xs font-medium text-emerald-400">
                      <ArrowUpRight className="w-3 h-3" />
                      {Math.abs(dashboardData.netWorthChange)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Budget Categories Ribbon */}
        <section className="pb-6">
          <div className="px-6 pb-3">
            <h2 className="text-sm font-semibold text-slate-300">Budget Status</h2>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-6 pb-2">
              {budgetCategories.map((category) => (
                <BudgetCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Bills Ribbon */}
        <section className="pb-6">
          <div className="px-6 pb-3">
            <h2 className="text-sm font-semibold text-slate-300">Upcoming Payments</h2>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-6 pb-2">
              {upcomingBills.map((bill) => (
                <BillCard key={bill.id} bill={bill} />
              ))}
            </div>
          </div>
        </section>

        {/* Transaction Feed */}
        <section className="px-6 pb-40">
          <div className="pb-4">
            <h2 className="text-sm font-semibold text-slate-300">Recent Transactions</h2>
          </div>
          <div className="space-y-6">
            {transactions.map((day) => (
              <div key={day.date}>
                <div className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
                  {day.label}
                </div>
                <div className="space-y-2">
                  {day.items.map((transaction) => (
                    <TransactionItem key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Home Button - Elevated above nav */}
      <button
        onClick={() => setActiveTab('home')}
        className="fixed bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all hover:scale-110 active:scale-95 text-white z-50"
      >
        <div className="relative">
          <div className="absolute -inset-3 bg-violet-500/20 rounded-2xl blur-xl opacity-50 animate-pulse" />
          <div className="relative px-6 py-5 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-violet-500/30 shadow-2xl shadow-violet-900/30 flex flex-col items-center gap-1.5">
            <HomeIcon className="w-9 h-9 text-violet-400" />
            <span className="text-xs font-semibold">Home</span>
          </div>
        </div>
      </button>

      {/* Bottom Navigation Bar - Always visible */}
      <nav
        className="fixed bottom-0 w-full max-w-[430px] bg-gradient-to-t from-slate-900 to-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 px-6 py-3 z-40 shadow-2xl rounded-t-3xl"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          clipPath: 'polygon(0 0, 42% 0, 43% 15%, 44% 25%, 45% 30%, 46% 32%, 47% 33%, 48% 34%, 52% 34%, 53% 33%, 54% 32%, 55% 30%, 56% 25%, 57% 15%, 58% 0, 100% 0, 100% 100%, 0 100%)'
        }}
      >
        <div className="flex items-end justify-around">
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95 pb-1 ${
              activeTab === 'budget' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === 'budget' ? 'bg-violet-500/20' : 'bg-transparent'}`}>
              <PieChart className="w-7 h-7" />
            </div>
            <span className="text-xs font-medium">Budget</span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95 pb-1 ${
              activeTab === 'debts' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === 'debts' ? 'bg-violet-500/20' : 'bg-transparent'}`}>
              <Target className="w-7 h-7" />
            </div>
            <span className="text-xs font-medium">Debts</span>
          </button>

          {/* Empty space for home button */}
          <div className="w-20"></div>

          <button
            onClick={() => setActiveTab('assets')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95 pb-1 ${
              activeTab === 'assets' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === 'assets' ? 'bg-violet-500/20' : 'bg-transparent'}`}>
              <Landmark className="w-7 h-7" />
            </div>
            <span className="text-xs font-medium">Assets</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95 pb-1 ${
              activeTab === 'profile' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${activeTab === 'profile' ? 'bg-violet-500/20' : 'bg-transparent'}`}>
              <User className="w-7 h-7" />
            </div>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Floating AI Chat Button - Always visible on scroll */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-28 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-2xl shadow-violet-500/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50"
        style={{
          left: '50%',
          transform: 'translateX(calc(-50% + 215px - 1.5rem - 2rem))'
        }}
      >
        <Sparkles className="w-7 h-7" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 blur-xl opacity-50 -z-10 animate-pulse" />
      </button>
    </div>
  );
}

function BudgetCard({ category }) {
  const percentage = (category.spent / category.budget) * 100;
  const isOverBudget = percentage > 100;
  const Icon = category.icon;

  return (
    <div className="flex-shrink-0 w-32 rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 shadow-lg hover:shadow-xl hover:scale-105 hover:bg-slate-800/80 transition-all duration-300 cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 rounded-lg ${category.color} bg-opacity-20 flex items-center justify-center shadow-md`}>
          <Icon className={`w-3.5 h-3.5 ${category.color.replace('bg-', 'text-')}`} />
        </div>
        <div className={`text-xs font-semibold ${isOverBudget ? 'text-rose-400' : 'text-slate-300'}`}>
          {Math.round(percentage)}%
        </div>
      </div>
      <div className="text-xs font-semibold mb-1">{category.name}</div>
      <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
        {category.spent} / {category.budget}
        <RiyalSymbol className="w-2.5 h-2.5" />
      </div>
      <div className="h-1 bg-slate-900/80 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full ${category.color} transition-all duration-500 shadow-sm`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function BillCard({ bill }) {
  const isPastDue = new Date(bill.dueDate) < new Date();

  return (
    <div className="flex-shrink-0 w-52 rounded-xl bg-slate-800/60 border border-slate-700/40 p-4 shadow-lg hover:shadow-xl hover:scale-105 hover:bg-slate-800/80 transition-all duration-300 cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{bill.name}</div>
        <div className={`text-xs px-2 py-0.5 rounded-full ${bill.type === 'loan' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
          {bill.type}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-bold">
          {bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <RiyalSymbol className="w-4 h-4 text-slate-400" />
      </div>
      <div className={`text-xs ${isPastDue ? 'text-rose-400' : 'text-slate-400'}`}>
        Due {bill.dueDate}
      </div>
    </div>
  );
}

function TransactionItem({ transaction }) {
  const isIncome = transaction.amount > 0;
  const Icon = transaction.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-slate-800/30 hover:bg-slate-900/50 transition-colors">
      <div className={`w-10 h-10 rounded-full ${isIncome ? 'bg-emerald-500/20' : 'bg-slate-800'} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${isIncome ? 'text-emerald-400' : 'text-slate-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{transaction.name}</div>
        <div className="text-xs text-slate-400">{transaction.category} · {transaction.time}</div>
      </div>
      <div className={`flex items-center gap-1 text-sm font-semibold ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
        {isIncome ? '+' : ''}{Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <RiyalSymbol className="w-3 h-3 text-slate-400" />
      </div>
    </div>
  );
}
