// ServicesScreen.jsx — الخدمات
// Subscriptions + goals + split — with real data & progress rings

function ServicesScreen() {
  return (
    <div data-screen-label="02 الخدمات">
      <ScreenHeader title="الخدمات" subtitle="تابع مدفوعاتك المتكررة وأهدافك" />

      {/* Subscriptions card */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: '18px 18px 16px' }}>
          <ModuleHeader title="اشتراكات" chipClass="chip-purple" icon={<Icon.Card />} />

          {/* stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
            <Stat n="7" label="نشط" color="oklch(82% 0.12 290)" />
            <StatAmount n="284.50" label="هالشهر" color="oklch(78% 0.18 20)" />
            <Stat n="2" label="متوقف" color="var(--fg-3)" />
          </div>

          {/* Active subscription list preview */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SubRow logo="🎵" bg="#1DB954" name="Spotify Family" price="21" next="٢٢ أبريل" />
            <SubRow logo="N" bg="#E50914" name="Netflix" price="56" next="١ مايو" />
            <SubRow logo="☁" bg="oklch(55% 0.14 230)" name="iCloud+ 200GB" price="12" next="٢٨ أبريل" />
          </div>

          <button className="btn btn-ghost" style={{ width: '100%', padding: '10px', marginTop: 14, fontSize: 13 }}>
            <Icon.Plus /> أضف اشتراك
          </button>
        </div>
      </div>

      {/* Goals card */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: '18px 18px 16px' }}>
          <ModuleHeader title="الأهداف" chipClass="chip-green" icon={<Icon.Target />} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
            <Stat n="5" label="إجمالي الأهداف" color="var(--fg)" />
            <Stat n="3" label="في المسار" color="oklch(78% 0.12 160)" />
            <Stat n="1" label="متجاوز" color="oklch(78% 0.18 20)" />
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <GoalRow emoji="✈️" name="رحلة اليابان" progress={0.68} current="6,800" target="10,000" status="track" />
            <GoalRow emoji="🚗" name="سيارة جديدة" progress={0.32} current="16,000" target="50,000" status="track" />
            <GoalRow emoji="🏠" name="شقة" progress={1.12} current="56,000" target="50,000" status="over" />
          </div>
        </div>
      </div>

      {/* Split card */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: '18px 18px 16px' }}>
          <ModuleHeader title="تقسيم" chipClass="chip-purple" icon={<Icon.Users />} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            <Stat n="3" label="مجموعات" color="var(--fg)" />
            <Stat n="8" label="أعضاء" color="var(--fg)" />
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SplitRow emoji="🍽" name="عشاء الشباب" members={4} balance={-45} />
            <SplitRow emoji="🏖" name="سفر الصيف" members={3} balance={120} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleHeader({ title, chipClass, icon, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {right || <div />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
        <div className={`chip ${chipClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function Stat({ n, label, color }) {
  return (
    <div className="tile">
      <div className="num" style={{ fontSize: 22, fontWeight: 700, color }}>{n}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{label}</div>
    </div>
  );
}

function StatAmount({ n, label, color }) {
  return (
    <div className="tile">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <RiyalGlyph size={10} color="var(--fg-4)" />
        <span className="num" style={{ fontSize: 19, fontWeight: 700, color }}>{n}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{label}</div>
    </div>
  );
}

function SubRow({ logo, bg, name, price, next }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.025)', borderRadius: 12, border: '1px solid var(--stroke)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13 }}>{logo}</div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>التجديد · {next}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <RiyalGlyph size={10} color="var(--fg-3)" />
        <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{price}</span>
      </div>
    </div>
  );
}

function GoalRow({ emoji, name, progress, current, target, status }) {
  const pct = Math.min(progress, 1.2);
  const color = status === 'over' ? 'oklch(78% 0.18 20)' : 'oklch(72% 0.14 160)';
  return (
    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 12, border: '1px solid var(--stroke)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 18 }}>{emoji}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'baseline', justifyContent: 'flex-end', fontSize: 10.5, color: 'var(--fg-3)' }}>
            <span className="num">{current}</span> / <span className="num">{target}</span>
            <RiyalGlyph size={9} color="var(--fg-4)" />
          </div>
        </div>
        <div className="num" style={{ fontSize: 13, fontWeight: 700, color }}>{Math.round(progress*100)}%</div>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 1) * 100}%`,
          background: `linear-gradient(90deg, ${color}, oklch(82% 0.10 ${status === 'over' ? 20 : 160}))`,
          borderRadius: 3,
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
    </div>
  );
}

function SplitRow({ emoji, name, members, balance }) {
  const isOwed = balance > 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.025)', borderRadius: 12, border: '1px solid var(--stroke)' }}>
      <div style={{ fontSize: 18 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>{members} أعضاء</div>
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>{isOwed ? 'لك' : 'عليك'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span className="num" style={{ fontSize: 13, fontWeight: 700, color: isOwed ? 'oklch(78% 0.14 160)' : 'oklch(78% 0.18 20)' }}>
            {Math.abs(balance)}
          </span>
          <RiyalGlyph size={10} color="var(--fg-3)" />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ServicesScreen });
