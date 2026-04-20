// HomeScreen.jsx — الرئيسية
// Hero balance card + upcoming payments + recent transactions + AI insight

function HomeScreen({ tweaks }) {
  const [period, setPeriod] = React.useState('month');
  const [hideBalance, setHideBalance] = React.useState(false);

  // Spending sparkline data (30 days)
  const sparkData = [12, 18, 14, 22, 19, 25, 21, 28, 24, 32, 29, 35, 31, 28, 34, 38, 33, 40, 36, 42, 38, 45, 41, 48, 44, 51, 47, 54, 50, 56];

  return (
    <div data-screen-label="01 الرئيسية">
      {/* Header */}
      <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <button
          onClick={() => setHideBalance(!hideBalance)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--stroke)', width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-2)', cursor: 'pointer' }}
          aria-label="إخفاء الرصيد"
        >
          {hideBalance ? <Icon.EyeOff /> : <Icon.Eye />}
        </button>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>حيّاك الله</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2 }}>
            محمود <span style={{ color: 'var(--p-200)' }}>مرسي</span>
          </div>
        </div>
      </div>

      {/* Month stepper */}
      <MonthStepper value="أبريل ٢٠٢٦" />

      {/* Hero balance card */}
      <div style={{ padding: '0 16px' }}>
        <div className="card-hero" style={{ padding: '22px 22px 18px', overflow: 'hidden', position: 'relative' }}>
          {/* decorative rings */}
          <svg width="260" height="260" style={{ position: 'absolute', top: -80, left: -60, opacity: 0.08, pointerEvents: 'none' }}>
            <circle cx="130" cy="130" r="128" stroke="white" strokeWidth="0.5" fill="none"/>
            <circle cx="130" cy="130" r="100" stroke="white" strokeWidth="0.5" fill="none"/>
            <circle cx="130" cy="130" r="72" stroke="white" strokeWidth="0.5" fill="none"/>
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="chip chip-purple">
              <Icon.Card />
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 500 }}>الرصيد الحالي</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 10, marginBottom: 4 }}>
            <RiyalGlyph size={26} color="var(--fg-2)" />
            <span className="num" style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-0.03em' }}>
              {hideBalance ? '••••' : '12,847'}
            </span>
            <span className="num" style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg-3)' }}>
              {hideBalance ? '' : '.50'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
            <div className="pill pill-green">
              <Icon.ArrowUp style={{ width: 11, height: 11 }} /> 4.2%  هالشهر
            </div>
          </div>

          {/* Income / expenses / assets row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 6 }}>
            <StatCell label="إجمالي الأصول" value="48,200" color="var(--fg)" />
            <StatCell label="دخل" value="6,500" color="oklch(80% 0.12 160)" />
            <StatCell label="مصاريف" value="2,340" color="oklch(78% 0.18 20)" prefix="-" />
          </div>

          {/* Accounts chips */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
            <AccountChip bank="بنك الراجحي" amount="12,500" color="oklch(60% 0.14 85)" />
            <AccountChip bank="STC Pay" amount="197" color="oklch(60% 0.18 290)" />
            <AccountChip bank="كاش" amount="150" color="oklch(60% 0.12 160)" />
          </div>
        </div>
      </div>

      {/* AI Insight banner */}
      <div style={{ padding: '14px 16px 0' }}>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', background: 'linear-gradient(100deg, oklch(58% 0.21 290 / 0.14) 0%, rgba(255,255,255,0.02) 60%)', borderColor: 'oklch(65% 0.18 290 / 0.25)' }}>
          <div className="chip chip-purple" style={{ width: 40, height: 40 }}>
            <Icon.Sparkle style={{ width: 18, height: 18 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>مصروفك على التوصيل زاد ٢٣٪</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.4 }}>مقارنة بالشهر الماضي · وفّر ٤٨٠ ﷼ بحد التوصيل لـ ٦٠٠ ﷼</div>
          </div>
          <Icon.Chevron style={{ color: 'var(--fg-4)', transform: 'scaleX(-1)' }} />
        </div>
      </div>

      {/* Upcoming payments */}
      <div style={{ padding: '16px 16px 0' }}>
        <SectionHeader title="الدفعات القادمة" action="عرض الكل" />
        <div className="segmented" style={{ marginBottom: 12 }}>
          {['شهر', 'شهرين', '٣ أشهر', '٦ أشهر'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <PaymentRow logo="🎵" name="Spotify" cat="اشتراك شهري" date="٢٢ أبريل" amount="21" />
          <div className="divider" style={{ margin: 0 }} />
          <PaymentRow logo="▶" name="YouTube Premium" cat="اشتراك شهري" date="٢٥ أبريل" amount="23" bg="oklch(55% 0.20 20)" />
          <div className="divider" style={{ margin: 0 }} />
          <PaymentRow logo="☁" name="iCloud+" cat="٢٠٠ جيجا" date="٢٨ أبريل" amount="12" bg="oklch(55% 0.14 230)" />
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: '18px 16px 0' }}>
        <SectionHeader title="آخر العمليات" action="عرض الكل" />
        <div className="card" style={{ padding: 0 }}>
          <TxRow icon={<Icon.Uber />} merchant="Uber" cat="مصروف العيال · ٢٠ مايو" amount="15" type="out" />
          <div className="divider" style={{ margin: 0 }} />
          <TxRow merchant="كافيه ناس" cat="مقاهي · ٢٠ مايو" amount="28" type="out" emoji="☕" bg="oklch(50% 0.12 60)" />
          <div className="divider" style={{ margin: 0 }} />
          <TxRow merchant="راتب شهري" cat="دخل · ٢٠ مايو" amount="6,500" type="in" emoji="﷼" bg="oklch(50% 0.14 160)" />
          <div className="divider" style={{ margin: 0 }} />
          <TxRow merchant="بنده" cat="مشتريات · ١٩ مايو" amount="187" type="out" emoji="🛒" bg="oklch(50% 0.14 40)" />
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}

function StatCell({ label, value, color, prefix = '' }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 11.5, color: 'var(--fg-4)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
        <RiyalGlyph size={11} color="var(--fg-3)" />
        <span className="num" style={{ fontSize: 16, fontWeight: 600, color }}>{prefix}{value}</span>
      </div>
    </div>
  );
}

function AccountChip({ bank, amount, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--stroke)', fontSize: 11.5 }}>
      <div style={{ width: 18, height: 18, borderRadius: 6, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white' }}>
        {bank.slice(0, 1)}
      </div>
      <span style={{ color: 'var(--fg-2)' }}>{bank}</span>
      <span className="num" style={{ fontWeight: 600 }}>{amount}</span>
      <RiyalGlyph size={10} color="var(--fg-3)" />
    </div>
  );
}

function SectionHeader({ title, action, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
      {action && <button className="btn-text" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>{action}</button>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {icon}
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      </div>
    </div>
  );
}

function PaymentRow({ logo, name, cat, date, amount, bg = '#1DB954' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
        {logo}
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{cat} · {date}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <RiyalGlyph size={11} color="var(--fg-3)" />
        <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{amount}</span>
      </div>
    </div>
  );
}

function TxRow({ icon, emoji, merchant, cat, amount, type, bg }) {
  const color = type === 'in' ? 'oklch(78% 0.14 160)' : 'var(--fg)';
  const sign = type === 'in' ? '+' : '−';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
      {icon ? icon : (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg || 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {emoji}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{merchant}</div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{cat}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span className="num" style={{ fontSize: 14, fontWeight: 600, color }}>{sign}{amount}</span>
        <RiyalGlyph size={11} color="var(--fg-3)" />
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen });
