// Shell.jsx — Phone frame, status bar, tab bar, FAB

function StatusBar() {
  return (
    <div className="status-invert" style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 54,
      padding: '14px 28px 0', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', color: '#fff', zIndex: 30,
      direction: 'ltr', pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 600, fontFamily: 'SF Pro Text, -apple-system' }}>
        9:41
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" opacity="0.9"/></svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* signal */}
        <svg width="17" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="#fff"/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="#fff"/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="#fff"/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="#fff"/>
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill="#fff"/>
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill="#fff"/>
          <circle cx="8.5" cy="10.5" r="1.5" fill="#fff"/>
        </svg>
        {/* battery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, marginRight: 2, fontFamily: 'SF Pro Text' }}>82</div>
          <svg width="25" height="12" viewBox="0 0 27 13">
            <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#fff" strokeOpacity="0.5" fill="none"/>
            <rect x="2" y="2" width="17" height="9" rx="1.5" fill="oklch(75% 0.15 140)"/>
            <path d="M25 4.5V8.5C25.6 8.2 26 7.5 26 6.5C26 5.5 25.6 4.8 25 4.5Z" fill="#fff" fillOpacity="0.5"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function DynamicIsland() {
  return (
    <div className="dyn-island" style={{
      position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
      width: 120, height: 35, borderRadius: 20, background: '#000', zIndex: 40,
    }} />
  );
}

function Phone({ children, screen = 'home', onTab, showFab = true, onFab, theme = 'dark' }) {
  const isLight = theme === 'light';
  return (
    <div className={isLight ? 'light' : ''} style={{
      width: 390, height: 844, borderRadius: 54, overflow: 'hidden',
      position: 'relative', background: isLight ? '#fff' : '#000',
      boxShadow: isLight
        ? '0 0 0 2px #cbc6d6, 0 0 0 12px #d9d4e6, 0 40px 80px rgba(40,20,80,0.2)'
        : '0 0 0 2px #1f1f2a, 0 0 0 12px #0a0a12, 0 40px 80px rgba(0,0,0,0.5)',
    }}>
      <div className="phone-bg" />
      <DynamicIsland />
      <StatusBar />

      {/* Scrollable content area */}
      <div className="phone-scroll" style={{
        position: 'absolute', inset: 0, overflow: 'auto',
        paddingTop: 54, paddingBottom: 110,
      }}>
        {children}
      </div>

      {showFab && (
        <button className="fab" onClick={onFab} aria-label="AI Insights">
          <Icon.Sparkle style={{ color: 'white' }} />
        </button>
      )}

      <TabBar active={screen} onTab={onTab} />

      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
        width: 135, height: 5, borderRadius: 3,
        background: isLight ? 'rgba(20,19,42,0.3)' : 'rgba(255,255,255,0.4)', zIndex: 50,
      }} />
    </div>
  );
}

function TabBar({ active, onTab }) {
  const tabs = [
    { key: 'profile', label: 'حسابي', icon: Icon.User },
    { key: 'assets', label: 'الأصول', icon: Icon.Coins },
    { key: '_center', label: '', icon: null },
    { key: 'analytics', label: 'التحليلات', icon: Icon.Chart },
    { key: 'services', label: 'الخدمات', icon: Icon.Grid },
  ];
  return (
    <div className="tabbar">
      {tabs.map(t => {
        if (t.key === '_center') {
          return (
            <button key="center" className="tab-center" onClick={() => onTab && onTab('home')} aria-label="الرئيسية">
              <Icon.Home style={{ color: 'white', width: 24, height: 24 }} />
            </button>
          );
        }
        const IconC = t.icon;
        return (
          <button key={t.key} className={`tab ${active === t.key ? 'active' : ''}`} onClick={() => onTab && onTab(t.key)}>
            <IconC />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Screen header — RTL title top-right
function ScreenHeader({ title, subtitle, trailing, leading }) {
  return (
    <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 40 }}>
        {leading}
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ color: 'var(--fg-3)', fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
        {trailing && <div style={{ marginTop: 6 }}>{trailing}</div>}
      </div>
    </div>
  );
}

// Month stepper
function MonthStepper({ value = 'أبريل ٢٠٢٦', onPrev, onNext }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '2px 20px 16px' }}>
      <button onClick={onPrev} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--stroke)', width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-2)', cursor: 'pointer' }}>
        <Icon.Chevron style={{ transform: 'scaleX(-1)' }} />
      </button>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)', minWidth: 110, textAlign: 'center' }}>{value}</div>
      <button onClick={onNext} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--stroke)', width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-2)', cursor: 'pointer' }}>
        <Icon.Chevron />
      </button>
    </div>
  );
}

// Sparkline
function Sparkline({ data, color = 'oklch(70% 0.16 290)', width = 100, height = 28, fill = true }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [i * (width / (data.length - 1)), height - ((v - min) / range) * height]);
  const d = 'M' + pts.map(p => p.join(',')).join(' L ');
  const fd = d + ` L ${width},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {fill && <path d={fd} fill={color} opacity="0.18" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

Object.assign(window, { Phone, ScreenHeader, MonthStepper, Sparkline });
