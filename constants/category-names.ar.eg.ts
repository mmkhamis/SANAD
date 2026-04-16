/**
 * Egyptian Arabic overrides for category names.
 *
 * This file contains ONLY entries that differ from the Gulf baseline
 * (category-names.ar.ts). At translation time the two maps are merged:
 *   { ...CATEGORY_NAMES_AR, ...CATEGORY_NAMES_AR_EG }
 * so any key not listed here falls back to the Gulf label automatically.
 *
 * Rule: add an entry here only when the Egyptian word/phrasing is
 * genuinely different from the Gulf word — not just a formatting tweak.
 */
export const CATEGORY_NAMES_AR_EG: Record<string, string> = {

  // ─── Terms that are distinctly different in Egyptian colloquial ──

  // Gulf uses "جوال", Egypt uses "موبايل"
  'Mobile': 'موبايل',

  // Gulf Khaleeji: "العيال", Egypt: "الأولاد"
  'Allowances': 'مصروف الأولاد',

  // Gulf/Saudi identity term "طلعات", Egypt: "خروجات"
  'Social Outings': 'خروجات',

  // Gulf uses "مناسبات" (occasions), Egypt uses "واجبات اجتماعية" (social duties)
  'Religion / Charity / Social Duties': 'الدين والصدقات والواجبات الاجتماعية',

  // ─── Car → "عربية" in Egyptian colloquial (Gulf uses "سيارة") ──

  'Car Maintenance': 'صيانة العربية',
  'Car Insurance': 'تأمين العربية',
  'Car Loan': 'قسط العربية',
  'Car Goal': 'ادخار عربية',
  'Car Rental': 'تأجير عربية',
  'Registration & Licensing': 'ترخيص العربية',

  // ─── Fees → "مصاريف" in Egypt (Gulf uses "رسوم") ────────────────

  'School Fees': 'مصاريف المدرسة',
  'Exam Fees': 'مصاريف الامتحان',

  // ─── Clothing → "هدوم" in Egyptian colloquial ───────────────────

  'Fashion': 'هدوم وموضة',
  'Kids Clothing': 'هدوم أطفال',

  // ─── Home & services ────────────────────────────────────────────

  // Gulf: "عمالة منزلية", Egypt colloquial: "شغالة"
  'Domestic Worker': 'شغالة',

  // Gulf: "رعاية الوالدين" (parent-focused, Saudi), Egypt: more general term
  'Elderly Care': 'رعاية كبار السن',

  // Gulf: "كي" for ironing, Egypt: "كواية"
  'Laundry & Dry Clean': 'غسيل وكواية',

  // Gulf: "صيانة المنزل", Egypt: "صيانة الشقة"
  'Home Maintenance': 'صيانة الشقة',

  // ─── Food ───────────────────────────────────────────────────────

  // Gulf: "توصيل طلبات", Egypt: "توصيل أكل"
  'Food Delivery': 'توصيل أكل',

  // Gulf: "لحوم وأسماك", Egypt: "لحمة وسمك"
  'Meat & Seafood': 'لحمة وسمك',

  // Gulf: "سناكات وحلويات", Egypt: "حلويات وسناكس"
  'Snacks & Sweets': 'حلويات وسناكس',

  // ─── Beauty & Sports ────────────────────────────────────────────

  // Gulf: "صالون وحلاقة", Egypt: "كوافير وتجميل"
  'Beauty & Grooming': 'كوافير وتجميل',

  // Gulf: "نادي ورياضة", Egypt: "جيم ورياضة"
  'Sports Clubs': 'جيم ورياضة',

  // ─── Transport ──────────────────────────────────────────────────

  // Gulf: "مواقف", Egypt: "جراج"
  'Parking': 'جراج',

  // Gulf: "رسوم طريق", Egypt: "رسوم عبور"
  'Tolls': 'رسوم عبور',

  // ─── Baby ───────────────────────────────────────────────────────

  // Gulf: "مستلزمات أطفال", Egypt: "مستلزمات بيبي"
  'Baby Supplies': 'مستلزمات بيبي',

  // ─── Ramadan ────────────────────────────────────────────────────

  // Gulf: "مستلزمات رمضان", Egypt: "ياميش ومستلزمات رمضان"
  'Ramadan Supplies': 'ياميش ومستلزمات رمضان',

  // ─── Region-specific app categories ─────────────────────────────

  // These only appear in Egypt via regionTags, translated for completeness
  'Fawry': 'فوري',
  'Digital Egypt': 'مصر الرقمية',
  'elmenus': 'المنيوز',
  'Talabat': 'طلبات',
  'Careem': 'كريم',
};
