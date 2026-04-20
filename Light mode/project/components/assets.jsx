// AssetsScreen.jsx — الأصول
// Portfolio overview with distribution + holdings

function AssetsScreen() {
  const assets = [
    { ticker: 'AAPL', name: 'Apple Inc.', icon: '🍎', price: 269.71, qty: 12, change: +1.24, type: 'stock' },
    { ticker: 'MSFT', name: 'Microsoft Corp.', icon: '🪟', price: 422.53, qty: 5, change: +0.82, type: 'stock' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', icon: '🔎', price: 341.10, qty: 8, change: -0.34, type: 'stock' },
    { ticker: 'BTC', name: 'Bitcoin', icon: <Icon.Crypto />, price: 67250, qty: 0.21, change: +3.12, type: 'crypto' },
    { ticker: 'ذهب', name: 'Gold · 21K', icon: <Icon.Gold />, price: 285, qty: 40, change: +0.56, type: 'gold', unit: 'جرام' },
  ];

  return (
    <div data-screen-label="04 الأصول">
      <ScreenHeader title="الأصول" subtitle="محفظتك الاستثمارية" />

      {/* Hero portfolio value */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: '22px 22px 20px', overflow: 'hidden', position: 'relative' }}>
          {/* spark bg */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.22, pointerEvents: 'none' }}>
            <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="none">
              <path d="M0,180 C50,160 80,190 120,150 C160,110 180,140 220,100 C260,60 300,90 340,50 L400,40 L400,250 L0,250 Z" fill="url(#chart-g)" />
              <path d="M0,180 C50,160 80,190 120,150 C160,110 180,140 220,100 C260,60 300,90 340,50 L400,40" stroke="oklch(72% 0.16 290)" strokeWidth="2" fill="none" />
              <defs>
                <linearGradient id="chart-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="oklch(72% 0.16 290)" stopOpacity="0.6"/>
                  <stop offset="1" stopColor="oklch(72% 0.16 290)" stopOpacity="0"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', textAlign: 'left', marginBottom: 4 }}>إجمالي قيمة الأصول</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-start' }}>
              <span className="num" style={{ fontSize: 40, fontWeight: 700, color: 'oklch(78% 0.14 160)', letterSpacing: '-0.02em', textShadow: '0 0 24px oklch(72% 0.14 160 / 0.3)' }}>48,217</span>
              <span className="num" style={{ fontSize: 20, color: 'oklch(78% 0.14 160)', opacity: 0.65 }}>.80</span>
              <RiyalGlyph size={20} color="oklch(78% 0.14 160)" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <div className="pill pill-green"><Icon.ArrowUp style={{ width: 10, height: 10 }} /> +2,140 · 4.6%</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', alignSelf: 'center' }}>آخر ٣٠ يوم</div>
            </div>

            {/* Distribution bar */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', height: 8, borderRadius: 6, overflow: 'hidden', gap: 2, direction: 'ltr' }}>
                <div style={{ flex: 52, background: 'oklch(65% 0.18 230)' }} />
                <div style={{ flex: 28, background: 'oklch(72% 0.13 85)' }} />
                <div style={{ flex: 15, background: 'oklch(68% 0.18 40)' }} />
                <div style={{ flex: 5, background: 'oklch(60% 0.08 240)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10.5, color: 'var(--fg-3)', direction: 'rtl' }}>
                <DistLegend c="oklch(65% 0.18 230)" label="أسهم" pct="52%" />
                <DistLegend c="oklch(72% 0.13 85)" label="ذهب" pct="28%" />
                <DistLegend c="oklch(68% 0.18 40)" label="كريبتو" pct="15%" />
                <DistLegend c="oklch(60% 0.08 240)" label="فضة" pct="5%" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeframe selector */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="segmented">
          {['يوم', 'أسبوع', 'شهر', '٣ أشهر', 'سنة', 'الكل'].map((p, i) => (
            <button key={p} className={i === 2 ? 'active' : ''}>{p}</button>
          ))}
        </div>
      </div>

      {/* Holdings list */}
      <div style={{ padding: '0 16px 14px' }}>
        <SectionHeader title="المحفظة" action="أضف +" />
        <div className="card" style={{ padding: 6 }}>
          {assets.map((a, i) => (
            <React.Fragment key={a.ticker}>
              <HoldingRow {...a} />
              {i < assets.length - 1 && <div className="divider" style={{ margin: '0 6px' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Upgrade to Max banner */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card" style={{
          padding: '16px 18px',
          background: 'linear-gradient(100deg, oklch(58% 0.21 290 / 0.18) 0%, oklch(45% 0.14 230 / 0.10) 100%)',
          borderColor: 'oklch(65% 0.18 290 / 0.35)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div className="chip chip-purple" style={{ width: 42, height: 42 }}>
            <Icon.Bolt />
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>توقعات AI للأصول</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>متوفر في باقة Max · ترقى لتفتح</div>
          </div>
          <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
            ترقّى
          </button>
        </div>
      </div>
    </div>
  );
}

function DistLegend({ c, label, pct }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <div style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
      <span>{label}</span>
      <span className="num" style={{ color: 'var(--fg-2)', fontWeight: 600 }}>{pct}</span>
    </div>
  );
}

function HoldingRow({ ticker, name, icon, price, qty, change, type, unit }) {
  const up = change > 0;
  const total = (price * qty).toFixed(2);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
      {/* icon */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
        {typeof icon === 'string' ? icon : icon}
      </div>
      {/* name + ticker */}
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{ticker}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>
          {name} · <span className="num">{qty}</span>{unit ? ` ${unit}` : ''}
        </div>
      </div>
      {/* mini spark */}
      <div style={{ opacity: 0.7 }}>
        <Sparkline data={up ? [1,2,2,3,3,5,4,6] : [6,5,5,4,4,3,4,3]} color={up ? 'oklch(72% 0.14 160)' : 'oklch(68% 0.18 20)'} width={44} height={18} />
      </div>
      {/* value + change */}
      <div style={{ textAlign: 'left', minWidth: 76 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-start' }}>
          <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{type === 'crypto' || type === 'stock' ? `$${price}` : total}</span>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: up ? 'oklch(78% 0.14 160)' : 'oklch(78% 0.18 20)', fontFamily: 'SF Pro Display', display: 'flex', gap: 2, justifyContent: 'flex-start', alignItems: 'center' }}>
          {up ? '▲' : '▼'} {Math.abs(change)}%
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AssetsScreen });
