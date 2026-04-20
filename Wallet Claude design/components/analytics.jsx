// AnalyticsScreen.jsx — التحليلات
// Expense breakdown donut + categories + savings tips + subscriptions heat

function AnalyticsScreen() {
  // Categories for the donut
  const cats = [
    { name: 'مطاعم ومقاهي', amount: 820, pct: 35, color: 'oklch(65% 0.18 40)', emoji: '🍽' },
    { name: 'تسوق', amount: 540, pct: 23, color: 'oklch(65% 0.18 290)', emoji: '🛍' },
    { name: 'تنقل', amount: 380, pct: 16, color: 'oklch(68% 0.15 200)', emoji: '🚗' },
    { name: 'ترفيه', amount: 280, pct: 12, color: 'oklch(72% 0.15 140)', emoji: '🎬' },
    { name: 'أخرى', amount: 320, pct: 14, color: 'oklch(60% 0.08 280)', emoji: '📦' },
  ];

  return (
    <div data-screen-label="03 التحليلات">
      <ScreenHeader title="التحليلات" subtitle="فهم أعمق لمصاريفك" />
      <MonthStepper value="أبريل ٢٠٢٦" />

      {/* Expense breakdown — donut */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Icon.Chevron style={{ color: 'var(--fg-4)', transform: 'scaleX(-1)' }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>تحليل المصاريف</div>
              <div className="chip chip-purple"><Icon.Chart /></div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Donut */}
            <Donut cats={cats} />

            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {cats.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'baseline', justifyContent: 'flex-end' }}>
                      <span className="num" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{c.amount}</span>
                      <RiyalGlyph size={8} color="var(--fg-4)" />
                      <span className="num" style={{ fontSize: 10, color: 'var(--fg-4)', marginLeft: 4 }}>· {c.pct}%</span>
                    </div>
                  </div>
                  <div style={{ width: 3, height: 22, borderRadius: 2, background: c.color }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <div className="tile">
              <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>47</span>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>العمليات</div>
            </div>
            <div className="tile">
              <span className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--p-200)' }}>12</span>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>العادات المتكررة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Savings tips — AI */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Icon.Chevron style={{ color: 'var(--fg-4)', transform: 'scaleX(-1)' }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>نصائح التوفير</div>
              <div className="chip chip-green"><Icon.Bulb /></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TipRow text="تقدر توفّر ١٢٠ ﷼ بتجميع اشتراكاتك في باقة عيلة" highlight="120" />
            <TipRow text="مصروفك على المقاهي أكثر من ٨٠٪ من المستخدمين" highlight="80%" tone="warn" />
            <TipRow text="ميزانيتك لقسم التسوق ناقصها ٥٤٠ ﷼ هالشهر" highlight="540" />
          </div>
        </div>
      </div>

      {/* Subscriptions heat */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Icon.Chevron style={{ color: 'var(--fg-4)', transform: 'scaleX(-1)' }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>الاشتراكات</div>
              <div className="chip chip-purple"><Icon.Card /></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>هالشهر</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-start' }}>
                <span className="num" style={{ fontSize: 22, fontWeight: 700, color: 'oklch(82% 0.12 290)' }}>284.50</span>
                <RiyalGlyph size={13} color="var(--fg-3)" />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
                <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>7</span>
                <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>نشط</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>مستحقة هالشهر</div>
            </div>
          </div>

          {/* 30-day heat map */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, direction: 'ltr' }}>
            {Array.from({ length: 30 }).map((_, i) => {
              const hot = [2, 5, 8, 12, 15, 18, 22, 25, 28].includes(i);
              const v = hot ? 0.9 : (i % 7 === 0 ? 0.35 : 0.08);
              return (
                <div key={i} style={{
                  aspectRatio: '1/1',
                  borderRadius: 4,
                  background: `oklch(62% 0.20 290 / ${v})`,
                  border: v > 0.5 ? '1px solid oklch(70% 0.18 290 / 0.5)' : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: v > 0.5 ? '0 0 6px oklch(60% 0.2 290 / 0.4)' : 'none',
                }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--fg-4)', direction: 'ltr' }}>
            <span>١</span><span>١٠</span><span>٢٠</span><span>٣٠</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Donut({ cats }) {
  const size = 120, stroke = 18, r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const gap = 0.02; // tiny gap
  const total = cats.reduce((s, c) => s + c.pct, 0);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} fill="none" />
        {cats.map((c, i) => {
          const frac = c.pct / total;
          const len = circ * frac - circ * gap;
          const dashArray = `${len} ${circ}`;
          const dashOffset = -offset * circ;
          offset += frac;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} stroke={c.color} strokeWidth={stroke} fill="none" strokeDasharray={dashArray} strokeDashoffset={dashOffset} strokeLinecap="butt" />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>المجموع</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>2,340</span>
        </div>
        <RiyalGlyph size={10} color="var(--fg-3)" />
      </div>
    </div>
  );
}

function TipRow({ text, highlight, tone = 'ok' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, background: 'rgba(255,255,255,0.025)', borderRadius: 12, border: '1px solid var(--stroke)' }}>
      <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5, textAlign: 'right' }}>
        {text}
      </div>
      <div style={{
        padding: '3px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
        background: tone === 'warn' ? 'oklch(65% 0.18 20 / 0.15)' : 'oklch(62% 0.14 160 / 0.15)',
        color: tone === 'warn' ? 'oklch(80% 0.14 20)' : 'oklch(80% 0.12 160)',
        border: `1px solid ${tone === 'warn' ? 'oklch(65% 0.18 20 / 0.3)' : 'oklch(62% 0.14 160 / 0.3)'}`,
        flexShrink: 0, fontFamily: 'SF Pro Display',
      }}>
        {highlight}
      </div>
    </div>
  );
}

Object.assign(window, { AnalyticsScreen });
