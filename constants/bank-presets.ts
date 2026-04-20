/**
 * Bank presets for Saudi Arabia & Egypt with brand colors and logos.
 * Logos use Google's favicon service (reliable, fast CDN).
 */

/** Helper to get a high-res favicon from Google's public API */
const gFav = (domain: string): string =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

export interface BankPreset {
  /** Internal key (English) */
  id: string;
  /** Display name — Arabic */
  nameAr: string;
  /** Display name — English */
  nameEn: string;
  /** Brand color (hex) */
  color: string;
  /** Logo URL (should be square, ≤512px) */
  logo: string | null;
  /** Account type default */
  type: 'bank' | 'savings' | 'credit_card';
}

// ─── Saudi Banks ─────────────────────────────────────────────────────

export const SAUDI_BANKS: BankPreset[] = [
  {
    id: 'alrajhi',
    nameAr: 'مصرف الراجحي',
    nameEn: 'Al Rajhi Bank',
    color: '#00613A',
    logo: gFav('alrajhibank.com.sa'),
    type: 'bank',
  },
  {
    id: 'alinma',
    nameAr: 'مصرف الإنماء',
    nameEn: 'Alinma Bank',
    color: '#004B87',
    logo: gFav('alinma.com'),
    type: 'bank',
  },
  {
    id: 'snb',
    nameAr: 'البنك الأهلي السعودي',
    nameEn: 'SNB (Al Ahli)',
    color: '#006838',
    logo: gFav('alahli.com'),
    type: 'bank',
  },
  {
    id: 'riyad',
    nameAr: 'بنك الرياض',
    nameEn: 'Riyad Bank',
    color: '#6D2077',
    logo: gFav('riyadbank.com'),
    type: 'bank',
  },
  {
    id: 'sab',
    nameAr: 'بنك ساب',
    nameEn: 'SAB (HSBC Saudi)',
    color: '#DB0011',
    logo: gFav('sabb.com'),
    type: 'bank',
  },
  {
    id: 'bsf',
    nameAr: 'البنك السعودي الفرنسي',
    nameEn: 'Banque Saudi Fransi',
    color: '#0066B3',
    logo: null,
    type: 'bank',
  },
  {
    id: 'arab-national',
    nameAr: 'البنك العربي الوطني',
    nameEn: 'Arab National Bank',
    color: '#005BAC',
    logo: gFav('anb.com.sa'),
    type: 'bank',
  },
  {
    id: 'albilad',
    nameAr: 'بنك البلاد',
    nameEn: 'Bank Albilad',
    color: '#D4AF37',
    logo: gFav('bankalbilad.com'),
    type: 'bank',
  },
  {
    id: 'aljazira',
    nameAr: 'بنك الجزيرة',
    nameEn: 'Bank AlJazira',
    color: '#003D6B',
    logo: gFav('baj.com.sa'),
    type: 'bank',
  },
  {
    id: 'saib',
    nameAr: 'البنك السعودي للاستثمار',
    nameEn: 'Saudi Investment Bank',
    color: '#00467F',
    logo: gFav('saib.com.sa'),
    type: 'bank',
  },
  {
    id: 'gulf-int',
    nameAr: 'بنك الخليج الدولي',
    nameEn: 'Gulf International Bank',
    color: '#003366',
    logo: gFav('gib.com'),
    type: 'bank',
  },
  {
    id: 'stc-pay',
    nameAr: 'STC Pay',
    nameEn: 'STC Pay',
    color: '#4F008C',
    logo: gFav('stcpay.com.sa'),
    type: 'bank',
  },
  {
    id: 'urpay',
    nameAr: 'URPay',
    nameEn: 'URPay',
    color: '#6D2077',
    logo: gFav('urpay.com.sa'),
    type: 'bank',
  },
];

// ─── Egyptian Banks ──────────────────────────────────────────────────

export const EGYPTIAN_BANKS: BankPreset[] = [
  {
    id: 'cib',
    nameAr: 'البنك التجاري الدولي',
    nameEn: 'CIB Egypt',
    color: '#003366',
    logo: gFav('www.cibeg.com'),
    type: 'bank',
  },
  {
    id: 'nbe',
    nameAr: 'البنك الأهلي المصري',
    nameEn: 'National Bank of Egypt',
    color: '#1B3A6B',
    logo: gFav('nbe.com.eg'),
    type: 'bank',
  },
  {
    id: 'banque-misr',
    nameAr: 'بنك مصر',
    nameEn: 'Banque Misr',
    color: '#D4212A',
    logo: gFav('banquemisr.com'),
    type: 'bank',
  },
  {
    id: 'qnb-alahli',
    nameAr: 'بنك QNB الأهلي',
    nameEn: 'QNB Alahli',
    color: '#7D0039',
    logo: gFav('qnbalahli.com'),
    type: 'bank',
  },
  {
    id: 'alex-bank',
    nameAr: 'بنك الإسكندرية',
    nameEn: 'Bank of Alexandria',
    color: '#002B5C',
    logo: gFav('alexbank.com'),
    type: 'bank',
  },
  {
    id: 'hsbc-egypt',
    nameAr: 'HSBC مصر',
    nameEn: 'HSBC Egypt',
    color: '#DB0011',
    logo: gFav('hsbc.com.eg'),
    type: 'bank',
  },
  {
    id: 'instapay',
    nameAr: 'إنستا باي',
    nameEn: 'InstaPay',
    color: '#FF6B00',
    logo: gFav('instapay.africa'),
    type: 'bank',
  },
  {
    id: 'vodafone-cash',
    nameAr: 'فودافون كاش',
    nameEn: 'Vodafone Cash',
    color: '#E60000',
    logo: gFav('vodafone.com.eg'),
    type: 'bank',
  },
];

// ─── Generic account types (non-bank) ────────────────────────────────

export const GENERIC_ACCOUNTS: BankPreset[] = [
  {
    id: 'cash',
    nameAr: 'كاش',
    nameEn: 'Cash',
    color: '#4ECB97',
    logo: null,
    type: 'bank',
  },
  {
    id: 'savings',
    nameAr: 'حساب ادخار',
    nameEn: 'Savings Account',
    color: '#E8B254',
    logo: null,
    type: 'savings',
  },
  {
    id: 'credit-card',
    nameAr: 'بطاقة ائتمانية',
    nameEn: 'Credit Card',
    color: '#8B5CF6',
    logo: null,
    type: 'credit_card',
  },
];

/** All presets combined, Saudi first (primary market) */
export const ALL_BANK_PRESETS: BankPreset[] = [
  ...SAUDI_BANKS,
  ...EGYPTIAN_BANKS,
  ...GENERIC_ACCOUNTS,
];
