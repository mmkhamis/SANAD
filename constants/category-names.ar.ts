/**
 * Arabic (Saudi) translation map for category names.
 *
 * Maps English category/subcategory labels (from category-taxonomy.ts)
 * to Saudi Arabic equivalents.
 * Used by the `translateCategoryName()` helper in `lib/i18n.ts`.
 */
export const CATEGORY_NAMES_AR: Record<string, string> = {
  // ─── Parent categories ──────────────────────────────────
  'Income': 'الدخل',
  'Bills & Utilities': 'الفواتير والخدمات',
  'Housing & Home': 'السكن والبيت',
  'Food & Dining': 'الأكل والمطاعم',
  'Transport': 'المواصلات',
  'Shopping': 'التسوّق',
  'Health & Medical': 'الصحة والعلاج',
  'Education': 'التعليم',
  'Family & Children': 'العائلة والأطفال',
  'Entertainment & Lifestyle': 'الترفيه',
  'Subscriptions & Digital': 'الاشتراكات الرقمية',
  'Savings & Goals': 'الادخار والأهداف',
  'Investments': 'الاستثمارات',
  'Debt & Obligations': 'الديون والالتزامات',
  'Travel': 'السفر',
  'Religion / Charity / Social Duties': 'الدين والصدقات والمناسبات',
  'Business / Work Expenses': 'مصروفات العمل',
  'Luxury & Status': 'الكماليات', // legacy compat
  'Pets': 'حيوانات أليفة',
  'Miscellaneous': 'متفرقات',
  'Transfers': 'التحويلات',
  'Other': 'أخرى',
  'Uncategorized': 'غير مصنف',

  // ─── Income ─────────────────────────────────────────────
  'Salary': 'الراتب',
  'Bonus': 'مكافأة',
  'Freelance': 'عمل حر',
  'Business Profit': 'ربح مشروع',
  'Rental Income': 'دخل إيجار',
  'Investment Income': 'أرباح استثمار',
  'Family Support': 'مساعدة الأهل',
  'Support Received': 'مساعدة من الأهل',
  'Gift Received': 'هدية',
  'Refund / Rebate': 'استرداد',
  'Other Income': 'دخل آخر',

  // ─── Bills & Utilities ──────────────────────────────────
  'Electricity': 'كهرباء',
  'Water': 'ماء',
  'Gas': 'غاز',
  'Internet': 'إنترنت',
  'Mobile': 'جوال',
  'TV / Satellite': 'قنوات / دش',
  'Building Fees': 'رسوم الخدمات',

  // ─── Housing & Home ─────────────────────────────────────
  'Rent': 'إيجار',
  'Mortgage': 'قسط البيت',
  'Home Maintenance': 'صيانة المنزل',
  'Furniture': 'أثاث',
  'Home Appliances': 'أجهزة منزلية',
  'Cleaning Supplies': 'منظفات',
  'Home Decor': 'ديكور',
  'Security Services': 'أمن وحراسة',

  // ─── Food & Dining ─────────────────────────────────────
  'Groceries': 'بقالة',
  'Bakery': 'مخبز',
  'Meat & Seafood': 'لحوم وأسماك',
  'Restaurants': 'مطاعم',
  'Cafes & Coffee': 'قهوة وكافيه',
  'Food Delivery': 'توصيل طلبات',
  'Snacks & Sweets': 'سناكات وحلويات',
  'Water & Beverages': 'مياه ومشروبات',

  // ─── Transport ──────────────────────────────────────────
  'Fuel': 'بنزين',
  'Uber / Taxi': 'أوبر / تاكسي',
  'Public Transport': 'مواصلات عامة',
  'Parking': 'مواقف',
  'Tolls': 'رسوم طريق',
  'Car Maintenance': 'صيانة السيارة',
  'Car Insurance': 'تأمين السيارة',
  'Registration & Licensing': 'ترخيص وتجديد',

  // ─── Shopping ───────────────────────────────────────────
  'Fashion': 'ملابس وأزياء',
  'Shoes': 'أحذية',
  'Bags & Accessories': 'شنط واكسسوارات',
  'Jewelry': 'مجوهرات وذهب',
  'Watches': 'ساعات',
  'Electronics': 'إلكترونيات',
  'General Shopping': 'مشتريات عامة',
  'Gifts': 'هدايا',

  // ─── Health & Medical ───────────────────────────────────
  'Doctor Visits': 'دكتور',
  'Medicines': 'أدوية',
  'Lab Tests': 'تحاليل',
  'Hospital': 'مستشفى',
  'Dental': 'أسنان',
  'Therapy & Fitness': 'علاج طبيعي',
  'Health Insurance': 'تأمين صحي',

  // ─── Education ──────────────────────────────────────────
  'School Fees': 'رسوم المدرسة',
  'University': 'جامعة',
  'Courses & Training': 'دورات وتدريب',
  'Books & Supplies': 'كتب وأدوات',
  'Tutoring': 'دروس خصوصية',
  'Exam Fees': 'رسوم امتحان',
  'School Transport': 'باص المدرسة',
  'Language Learning': 'تعلم لغة',

  // ─── Family & Children ──────────────────────────────────
  'Childcare': 'حضانة',
  'Baby Supplies': 'مستلزمات رضيع',
  'Kids Clothing': 'ملابس أطفال',
  'Allowances': 'مصروف العيال',
  'School Needs': 'مستلزمات المدرسة',
  'Kids Activities': 'أنشطة الأطفال',
  'Maternity': 'حمل وولادة',

  // ─── Entertainment & Lifestyle ──────────────────────────
  'Cinema & Events': 'سينما وفعاليات',
  'Gaming': 'ألعاب',
  'Hobbies': 'هوايات',
  'Beauty & Grooming': 'صالون وحلاقة',
  'Sports Clubs': 'نادي ورياضة',
  'Social Outings': 'طلعات',
  'Smoking & Shisha': 'تدخين وشيشة',

  // ─── Subscriptions & Digital ────────────────────────────
  'Netflix': 'نتفلكس',
  'Shahid VIP': 'شاهد VIP',
  'Disney+': 'ديزني+',
  'Spotify': 'سبوتيفاي',
  'YouTube Premium': 'يوتيوب بريميوم',
  'Anghami': 'أنغامي',
  'iCloud / Storage': 'مساحة تخزين',
  'ChatGPT / AI Tools': 'ذكاء اصطناعي',
  'VPN': 'VPN',
  'Other Digital': 'اشتراكات أخرى',

  // ─── Savings & Goals ────────────────────────────────────
  'Emergency Fund': 'صندوق طوارئ',
  'General Savings': 'ادخار عام',
  'Home Goal': 'ادخار بيت',
  'Car Goal': 'ادخار سيارة',
  'Wedding Goal': 'ادخار زواج / جهاز',
  'Education Goal': 'ادخار تعليم',
  'Travel Goal': 'ادخار سفر',
  'Hajj / Umrah Goal': 'ادخار حج وعمرة',

  // ─── Investments ────────────────────────────────────────
  'Stocks': 'أسهم',
  'ETFs & Funds': 'صناديق',
  'Crypto': 'كريبتو',
  'Gold & Silver': 'ذهب وفضة',
  'Real Estate Investment': 'استثمار عقاري',
  'Private Business': 'استثمار مشروع',
  'Retirement': 'تقاعد',

  // ─── Debt & Obligations ─────────────────────────────────
  'Credit Card Payment': 'سداد بطاقة',
  'Personal Loan': 'قرض شخصي',
  'Mortgage Payment': 'قسط عقار',
  'Car Loan': 'قسط سيارة',
  'Installments / BNPL': 'تقسيط',
  'Taxes & Government Fees': 'ضرائب ورسوم',
  'Legal Support': 'رسوم قانونية',
  'Alimony / Support': 'نفقة',

  // ─── Travel ─────────────────────────────────────────────
  'Flights': 'تذاكر طيران',
  'Hotels': 'فندق',
  'Visa Fees': 'تأشيرة',
  'Travel Transport': 'مواصلات سفر',
  'Travel Food': 'أكل السفر',
  'Travel Shopping': 'مشتريات سفر',
  'Travel Insurance': 'تأمين سفر',
  'Hajj / Umrah': 'حج وعمرة',

  // ─── Religion / Charity / Social Duties ─────────────────
  'Zakat': 'زكاة',
  'Sadaqah / Charity': 'صدقة',
  'Mosque / Community': 'مسجد وجمعية',
  'Eid / Social Giving': 'عيدية',
  'Family Occasions': 'مناسبات',
  'Funeral Support': 'عزاء',
  'Religious Courses': 'تحفيظ ودروس دينية',
  'Qurbani / Sacrifice': 'أضحية',

  // ─── Business / Work Expenses ───────────────────────────
  'Office Supplies': 'أدوات مكتبية',
  'Software & Tools': 'برامج وأدوات',
  'Business Travel': 'سفر عمل',
  'Marketing & Ads': 'تسويق وإعلانات',
  'Shipping & Logistics': 'شحن',
  'Professional Services': 'خدمات مهنية',
  'Coworking / Office Rent': 'إيجار مكتب',
  'Work Internet & Phone': 'خط شغل',

  // ─── Luxury & Status ────────────────────────────────────
  'Designer Fashion': 'ماركات',
  'Luxury Bags': 'شنط ماركات',
  'Premium Watches': 'ساعات فاخرة',
  'Fine Dining': 'مطعم فاخر',
  'Premium Travel': 'سفر فاخر',
  'VIP Events': 'فعاليات VIP',
  'Collectibles': 'مقتنيات',
  'Luxury Home': 'منزل فاخر',

  // ─── Pets ───────────────────────────────────────────────
  'Pet Food': 'أكل حيوانات',
  'Vet': 'بيطري',
  'Pet Supplies': 'لوازم حيوانات',
  'Grooming': 'تجميل الحيوان',
  'Boarding / Sitting': 'إقامة حيوانات',
  'Pet Toys': 'ألعاب حيوانات',

  // ─── Miscellaneous ──────────────────────────────────────
  'Cash Withdrawal': 'سحب نقدي',
  'Fines & Penalties': 'مخالفات وغرامات',
  'Unexpected Expense': 'مصروف مفاجئ',
  'Fees & Commissions': 'رسوم وعمولات',

  // ─── Transfers ──────────────────────────────────────────
  'Between Accounts': 'تحويل بين الحسابات',
  'Cash to Bank': 'إيداع نقدي',
  'Bank to Cash': 'سحب للكاش',
  'Wallet Top-up': 'شحن محفظة',
  'Move to Savings': 'تحويل للادخار',
  'Move to Investment': 'تحويل للاستثمار',

  // ─── New MENA categories (migration 029) ────────────────────────────
  'Government Services': 'خدمات حكومية',
  'Domestic Worker': 'عمالة منزلية',
  'Car Rental': 'تأجير سيارة',
  'Elderly Care': 'رعاية الوالدين',
  'Laundry & Dry Clean': 'غسيل وكي',
  'Ramadan Supplies': 'مستلزمات رمضان',

  // ─── Region-specific app categories ─────────────────────────────────
  'HungerStation': 'هنقرستيشن',
  'Jahez': 'جاهز',
  'Marsool': 'مرسول',
  'Talabat': 'طلبات',
  'elmenus': 'المنيوز',
  'Careem': 'كريم',
  'Absher / Gov Apps': 'أبشر وتطبيقات حكومية',
  'Fawry': 'فوري',
  'Digital Egypt': 'مصر الرقمية',
  'Tabby': 'تابي',
  'Tamara': 'تمارا',

  // ─── Legacy labels (backward compat) ────────────────────
  'Family & Kids': 'العيال',
  'Entertainment': 'الترفيه',
  'Health': 'الصحة',
  'Housing': 'السكن',
  'Financial': 'استثمار',
  'Financial & Savings': 'الاستثمار والادخار',
  'Charity & Gifts': 'الصدقات والهدايا',
  'Government & Fines': 'الحكومة والمخالفات',
  'Business': 'الأعمال',
  'Savings & Investment': 'الادخار والاستثمار',
  'Investment': 'استثمار',

  // ─── Old migration-013 names (fallback in case DB name was not updated) ──
  'App Subscriptions': 'اشتراكات أخرى',
  'Baby Essentials': 'مستلزمات رضيع',
  'Bank Fees & Interest': 'رسوم وعمولات',
  'Birthday Gifts': 'هدايا',
  'Cafés & Coffee': 'قهوة وكافيه',
  'Charity & NGOs': 'صدقة',
  'Childcare / Nanny': 'حضانة',
  'Cloud Storage': 'مساحة تخزين',
  'Debt / Loans': 'قرض شخصي',
  'Dining / Food': 'مطاعم',
  'Eid Expenses': 'عيدية',
  'Fid Expenses': 'عيدية',
  'Family Outings': 'طلعات',
  'Fast Food': 'مطاعم',
  'Gold Purchase': 'ذهب وفضة',
  'Gym & Fitness': 'نادي ورياضة',
  'Healthcare': 'دكتور',
  'Home Supplies': 'مشتريات عامة',
  'Hotels & Accommodation': 'فندق',
  'Housing / Rent': 'إيجار',
  'Mobile / Phone': 'جوال',
  'Mosque Donation': 'مسجد وجمعية',
  'Music Streaming': 'اشتراكات أخرى',
  'Personal Care': 'صالون وحلاقة',
  'Salon & Barber': 'صالون وحلاقة',
  'Savings': 'ادخار عام',
  'Savings Account': 'ادخار عام',
  'Shisha / Hookah': 'تدخين وشيشة',
  'Skincare': 'صالون وحلاقة',
  'Social Events': 'طلعات',
  'Software Licenses': 'برامج وأدوات',
  'Spa & Massage': 'صالون وحلاقة',
  'Stock Investment': 'أسهم',
  'Student Loan': 'قرض شخصي',
  'Subscriptions': 'اشتراكات أخرى',
  'Taxes & Gov Fees': 'ضرائب ورسوم',
  'Tips & Gratitude': 'عيدية',
  'Transportation': 'مواصلات عامة',
  'Umrah / Hajj': 'حج وعمرة',
  'Video Streaming': 'اشتراكات أخرى',
  'Wedding Gifts': 'هدايا',
  'Activities & Tours': 'طلعات',
  'Family': 'مساعدة الأهل',

  // ─── Common DB label variants not in the main taxonomy ──────────────
  'Food expenses': 'مصاريف الطعام',
  'Unspecified expense': 'مصاريف غير محددة',
  'Other expense': 'مصاريف أخرى',
};
