// ProfileScreen.jsx — أنت / حسابي

function ProfileScreen({ tweaks }) {
  const [theme, setTheme] = React.useState('dark');
  const [lang, setLang] = React.useState('ar');

  return (
    <div data-screen-label="05 الحساب">
      <ScreenHeader title="أنت" subtitle="إدارة حسابك وتفضيلاتك" />

      {/* Profile card */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card-hero" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: 'linear-gradient(135deg, oklch(70% 0.18 290), oklch(50% 0.18 290))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em',
            boxShadow: '0 8px 24px oklch(60% 0.2 290 / 0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
            color: 'white', fontFamily: 'SF Pro Display',
            flexShrink: 0,
          }}>MM</div>
          <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>محمود خميس</div>
            <div style={{ fontSize: 11.5, color: 'var(--p-200)', marginBottom: 4 }}>Mahmoud Morsi</div>
            <div style={{ fontSize: 10.5, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>mahmoudmorsi703@gmail.com</div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 10px', flexShrink: 0 }}>
            <Icon.Edit /> تعديل
          </button>
        </div>
      </div>

      {/* Balance summary */}
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="chip chip-purple"><Icon.Card /></div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>إجمالي الرصيد</div>
              <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>عبر جميع الحسابات</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <RiyalGlyph size={12} color="var(--fg-3)" />
              <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>12,847.50</span>
            </div>
            <Icon.Chevron style={{ color: 'var(--fg-4)', transform: 'scaleX(-1)' }} />
          </div>
          <div className="divider" style={{ margin: 0 }} />
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="chip chip-blue"><Icon.Card /></div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>الحسابات والمحافظ</div>
              <div style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>٣ بنوك متصلة · ١ محفظة</div>
            </div>
            <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>4</span>
            <Icon.Chevron style={{ color: 'var(--fg-4)', transform: 'scaleX(-1)' }} />
          </div>
        </div>
      </div>

      {/* Settings section */}
      <SectionTitle>الإعدادات</SectionTitle>
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card" style={{ padding: '14px' }}>
          {/* Theme toggle */}
          <SettingLabel icon={<Icon.Moon />}>المظهر</SettingLabel>
          <div className="segmented" style={{ marginBottom: 16, marginTop: 6 }}>
            {[
              { k: 'light', label: '☀ فاتح' },
              { k: 'dark', label: '☾ داكن' },
              { k: 'auto', label: '◐ تلقائي' },
            ].map(t => (
              <button key={t.k} className={theme === t.k ? 'active' : ''} onClick={() => setTheme(t.k)}>{t.label}</button>
            ))}
          </div>

          {/* Language */}
          <SettingLabel icon={<Icon.Globe />}>اللغة</SettingLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
            <button
              onClick={() => setLang('en')}
              style={{
                padding: '9px', borderRadius: 12, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: lang === 'en' ? 'linear-gradient(180deg, oklch(58% 0.21 290 / 0.25), oklch(48% 0.18 290 / 0.1))' : 'rgba(255,255,255,0.03)',
                color: 'var(--fg)', border: lang === 'en' ? '1px solid oklch(65% 0.18 290 / 0.4)' : '1px solid var(--stroke)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 15 }}>🇺🇸</span> English
            </button>
            <button
              onClick={() => setLang('ar')}
              style={{
                padding: '9px', borderRadius: 12, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: lang === 'ar' ? 'linear-gradient(180deg, oklch(58% 0.21 290 / 0.25), oklch(48% 0.18 290 / 0.1))' : 'rgba(255,255,255,0.03)',
                color: 'var(--fg)', border: lang === 'ar' ? '1px solid oklch(65% 0.18 290 / 0.4)' : '1px solid var(--stroke)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 15 }}>🇸🇦</span> عربي
            </button>
          </div>
        </div>
      </div>

      {/* Automations */}
      <SectionTitle>الأتمتة</SectionTitle>
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card" style={{ padding: 0 }}>
          <ListRow chipClass="chip-green" icon={<Icon.Whatsapp />} title="استيراد واتساب" subtitle="استيراد تلقائي من إيصالات الدفع" />
          <div className="divider" style={{ margin: 0 }} />
          <ListRow chipClass="chip-purple" icon={<Icon.Bolt />} title="استيراد رسائل البنك" subtitle="٣ بنوك متصلة" badge="نشط" />
        </div>
      </div>

      {/* Privacy */}
      <SectionTitle>البيانات والخصوصية</SectionTitle>
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card" style={{ padding: 0 }}>
          <ListRow chipClass="chip-amber" icon={<Icon.Shield />} title="الأمان والخصوصية" subtitle="Face ID · رقم سري" />
          <div className="divider" style={{ margin: 0 }} />
          <ListRow chipClass="chip-red" icon={<Icon.Trash />} title="المحذوفات" subtitle="استرجاع العمليات المحذوفة" />
        </div>
      </div>

      {/* About */}
      <SectionTitle>حول</SectionTitle>
      <div style={{ padding: '0 16px 14px' }}>
        <div className="card" style={{ padding: 0 }}>
          <ListRow chipClass="chip-blue" icon={<Icon.Msg />} title="الدعم الفني" subtitle="تواصل معنا" />
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '0 16px 14px' }}>
        <button style={{
          width: '100%', padding: 14, borderRadius: 16,
          background: 'oklch(55% 0.20 20 / 0.1)',
          border: '1px solid oklch(60% 0.18 20 / 0.25)',
          color: 'oklch(78% 0.18 20)',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          تسجيل خروج
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ padding: '6px 28px 8px', fontSize: 11, color: 'var(--fg-4)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'right' }}>
      {children}
    </div>
  );
}

function SettingLabel({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 6 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)' }}>{children}</div>
      <div style={{ color: 'var(--fg-3)' }}>{icon}</div>
    </div>
  );
}

function ListRow({ chipClass, icon, title, subtitle, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
      <div className={`chip ${chipClass}`} style={{ width: 34, height: 34 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{subtitle}</div>
      </div>
      {badge && <div className="pill pill-green">{badge}</div>}
      <Icon.Chevron style={{ color: 'var(--fg-4)', transform: 'scaleX(-1)' }} />
    </div>
  );
}

Object.assign(window, { ProfileScreen });
