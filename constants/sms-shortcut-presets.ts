/**
 * SMS Shortcut Presets
 *
 * Per-bank setup recipes for the iOS Shortcuts "When I get a message"
 * automation. Each preset defines the sender identifier the user has to
 * paste into the "Sender" field + a realistic sample SMS used for the
 * "Test" button.
 *
 * The iOS Shortcuts app does not expose a public URL scheme to create or
 * import a fully-formed shortcut programmatically, so we optimize the
 * manual flow: tap a bank → sender text is copied → Shortcuts opens.
 */

export interface SmsShortcutPreset {
  /** Stable id — reuse bank preset ids where possible */
  id: string;
  /** Display name (Arabic) */
  nameAr: string;
  /** Display name (English) */
  nameEn: string;
  /** Brand color (hex) — matches bank-presets */
  color: string;
  /** Optional logo URL */
  logo: string | null;
  /**
   * The exact sender string to paste into the Shortcuts "Sender" field.
   * For banks this is usually the SMS short-code or alphanumeric id.
   */
  sender: string;
  /** ISO country code — used for grouping */
  country: 'SA' | 'EG' | 'AE' | 'GLOBAL';
  /** A real-looking sample SMS for testing the deep link */
  sampleSms: string;
}

const gFav = (domain: string): string =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

// ─── Saudi Arabia ────────────────────────────────────────────────────

export const SA_SMS_PRESETS: SmsShortcutPreset[] = [
  {
    id: 'alrajhi',
    nameAr: 'مصرف الراجحي',
    nameEn: 'Al Rajhi Bank',
    color: '#00613A',
    logo: gFav('alrajhibank.com.sa'),
    sender: 'AlRajhiBank',
    country: 'SA',
    sampleSms: 'شراء بمبلغ 125.50 ريال\nمن Jarir Bookstore\nبطاقة ****1234',
  },
  {
    id: 'snb',
    nameAr: 'البنك الأهلي السعودي',
    nameEn: 'SNB',
    color: '#006838',
    logo: gFav('alahli.com'),
    sender: 'SNB',
    country: 'SA',
    sampleSms: 'عملية شراء 89.00 ريال\nلدى Panda Supermarket\nبطاقة ****5678',
  },
  {
    id: 'alinma',
    nameAr: 'مصرف الإنماء',
    nameEn: 'Alinma Bank',
    color: '#004B87',
    logo: gFav('alinma.com'),
    sender: 'Alinma',
    country: 'SA',
    sampleSms: 'شراء 240.00 ر.س\nمن STC Store\nالبطاقة ****4455',
  },
  {
    id: 'riyad',
    nameAr: 'بنك الرياض',
    nameEn: 'Riyad Bank',
    color: '#6D2077',
    logo: gFav('riyadbank.com'),
    sender: 'RiyadBank',
    country: 'SA',
    sampleSms: 'POS 55.00 SAR\nat Starbucks\ncard ****9912',
  },
  {
    id: 'sab',
    nameAr: 'بنك ساب',
    nameEn: 'SAB',
    color: '#DB0011',
    logo: gFav('sabb.com'),
    sender: 'SABB',
    country: 'SA',
    sampleSms: 'Purchase SAR 310.75\nat Extra Stores\ncard ending 3344',
  },
  {
    id: 'stcpay',
    nameAr: 'STC Pay',
    nameEn: 'stc pay',
    color: '#4F008C',
    logo: gFav('stcpay.com.sa'),
    sender: 'stcpay',
    country: 'SA',
    sampleSms: 'تم خصم 45.00 ر.س\nلحساب Careem\nالرصيد 1,200.00',
  },
  {
    id: 'urpay',
    nameAr: 'UR Pay',
    nameEn: 'UR Pay',
    color: '#E31837',
    logo: gFav('urpay.com.sa'),
    sender: 'urpay',
    country: 'SA',
    sampleSms: 'عملية دفع 67.50 ر.س\nإلى Hungerstation',
  },
];

// ─── Egypt ───────────────────────────────────────────────────────────

export const EG_SMS_PRESETS: SmsShortcutPreset[] = [
  {
    id: 'cib',
    nameAr: 'البنك التجاري الدولي',
    nameEn: 'CIB Egypt',
    color: '#003366',
    logo: gFav('www.cibeg.com'),
    sender: 'CIB',
    country: 'EG',
    sampleSms: 'تم شراء بمبلغ 250.00 جم\nمن Carrefour\nبطاقة ****1122',
  },
  {
    id: 'nbe',
    nameAr: 'البنك الأهلي المصري',
    nameEn: 'NBE',
    color: '#1B3A6B',
    logo: gFav('nbe.com.eg'),
    sender: 'NBE',
    country: 'EG',
    sampleSms: 'عملية شراء 180.50 ج.م\nلدى Spinneys\nالبطاقة ****3344',
  },
  {
    id: 'banque-misr',
    nameAr: 'بنك مصر',
    nameEn: 'Banque Misr',
    color: '#D4212A',
    logo: gFav('banquemisr.com'),
    sender: 'BanqueMisr',
    country: 'EG',
    sampleSms: 'تم إضافة تحويل لبطاقتكم بمبلغ 400.00 جم من محمد',
  },
  {
    id: 'qnb-alahli',
    nameAr: 'QNB الأهلي',
    nameEn: 'QNB Alahli',
    color: '#7D0039',
    logo: gFav('qnbalahli.com'),
    sender: 'QNB',
    country: 'EG',
    sampleSms: 'POS 320.00 EGP\nat Talabat\ncard ****7788',
  },
  {
    id: 'instapay',
    nameAr: 'إنستا باي',
    nameEn: 'InstaPay',
    color: '#FF6B00',
    logo: gFav('instapay.africa'),
    sender: 'InstaPay',
    country: 'EG',
    sampleSms: 'استلمت 500.00 جنيه\nمن أحمد علي\nعبر InstaPay',
  },
  {
    id: 'vodafone-cash',
    nameAr: 'فودافون كاش',
    nameEn: 'Vodafone Cash',
    color: '#E60000',
    logo: gFav('vodafone.com.eg'),
    sender: 'VodafoneCash',
    country: 'EG',
    sampleSms: 'تم تحويل 150 جنيه\nإلى 0100xxxxxxx\nالرصيد 2,340',
  },
];

/** All presets combined (Saudi first — primary market). */
export const ALL_SMS_PRESETS: SmsShortcutPreset[] = [
  ...SA_SMS_PRESETS,
  ...EG_SMS_PRESETS,
];

/** Group presets by country for the picker UI. */
export function groupPresetsByCountry(): Array<{
  country: SmsShortcutPreset['country'];
  presets: SmsShortcutPreset[];
}> {
  return [
    { country: 'SA', presets: SA_SMS_PRESETS },
    { country: 'EG', presets: EG_SMS_PRESETS },
  ];
}
