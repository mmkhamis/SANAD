export type TaxonomyCategoryType = 'income' | 'expense' | 'savings' | 'transfer';

export type RegionTag = 'all' | 'gulf' | 'egypt' | 'ksa' | 'uae';

export interface CategoryTaxonomySubcategory {
  key: string;
  label: string;
  icon?: string;
  aliases?: readonly string[];
  regionTags?: readonly RegionTag[];
}

export interface CategoryTaxonomyCategory {
  key: string;
  label: string;
  type: TaxonomyCategoryType;
  icon: string;
  color: string;
  analyticsGroup: string;
  budgetable: boolean;
  goalEligible: boolean;
  subcategories: readonly CategoryTaxonomySubcategory[];
}

export interface FlattenedTaxonomySubcategory extends CategoryTaxonomySubcategory {
  parentKey: string;
  parentLabel: string;
  parentType: TaxonomyCategoryType;
  analyticsGroup: string;
}

export const CATEGORY_TAXONOMY = [
  {
    key: 'income',
    label: 'Income',
    type: 'income',
    icon: 'wallet',
    color: '#10B981',
    analyticsGroup: 'income',
    budgetable: false,
    goalEligible: false,
    subcategories: [
      { key: 'salary', label: 'Salary', icon: 'briefcase', aliases: ['salary', 'payroll', 'wage', 'راتب', 'رواتب', 'مرتب', 'مرتبات', 'أجر', 'اجر', 'أجور', 'اجور', 'معاش', 'ايداع رواتب', 'إيداع رواتب', 'ايداع راتب'] },
      { key: 'bonus', label: 'Bonus', icon: 'award', aliases: ['bonus', 'incentive', 'commission', 'مكافأة', 'حافز', 'عمولة'] },
      { key: 'freelance', label: 'Freelance', icon: 'laptop', aliases: ['freelance', 'contract work', 'side gig', 'عمل حر', 'فريلانس'] },
      { key: 'business_profit', label: 'Business Profit', icon: 'store', aliases: ['business income', 'profit', 'revenue', 'ربح', 'دخل مشروع'] },
      { key: 'rental_income', label: 'Rental Income', icon: 'building-2', aliases: ['rent received', 'rental income', 'إيجار وارد', 'دخل إيجار'] },
      { key: 'investment_income', label: 'Investment Income', icon: 'chart-column', aliases: ['dividend', 'yield', 'coupon', 'أرباح استثمار', 'توزيعات'] },
      { key: 'family_support_in', label: 'Support Received', icon: 'hand-coins', aliases: ['family support', 'allowance received', 'مصروف', 'مساعدة من الأسرة'] },
      { key: 'gift_received', label: 'Gift Received', icon: 'gift', aliases: ['gift', 'cash gift', 'هدية', 'عيدية'] },
      { key: 'refund_rebate', label: 'Refund / Rebate', icon: 'rotate-ccw', aliases: ['refund', 'cashback', 'rebate', 'استرداد', 'كاش باك'] },
      { key: 'other_income', label: 'Other Income', icon: 'plus-circle', aliases: ['other income', 'misc income', 'دخل آخر'] },
    ],
  },
  {
    key: 'bills_utilities',
    label: 'Bills & Utilities',
    type: 'expense',
    icon: 'receipt',
    color: '#8B5CF6',
    analyticsGroup: 'essentials',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'electricity', label: 'Electricity', icon: 'zap', aliases: ['electricity', 'power bill', 'كهرباء'] },
      { key: 'water', label: 'Water', icon: 'droplets', aliases: ['water', 'water bill', 'مياه'] },
      { key: 'gas', label: 'Gas', icon: 'flame', aliases: ['gas', 'cooking gas', 'غاز'], regionTags: ['egypt'] },
      { key: 'internet', label: 'Internet', icon: 'wifi', aliases: ['internet', 'broadband', 'fiber', 'انترنت', 'نت'] },
      { key: 'mobile', label: 'Mobile', icon: 'smartphone', aliases: ['mobile bill', 'phone bill', 'recharge', 'sim', 'موبايل', 'هاتف', 'شحن رصيد', 'landline', 'home phone', 'تليفون أرضي', 'stc', 'mobily', 'زين', 'zain', 'lebara', 'يقوت', 'yaqoot', 'virgin mobile', 'فيرجن', 'salam mobile', 'سلام'] },
      { key: 'tv_satellite', label: 'TV / Satellite', icon: 'tv', aliases: ['satellite', 'tv', 'dish', 'قنوات', 'دش'] },
      { key: 'building_fees', label: 'Building Fees', icon: 'building', aliases: ['building fees', 'maintenance fee', 'service charge', 'رسوم عمارة', 'اتحاد ملاك'], regionTags: ['gulf'] },
      { key: 'government_services', label: 'Government Services', icon: 'landmark', aliases: ['government fee', 'government service', 'خدمات حكومية', 'رسوم حكومية', 'moi', 'moi payments', 'balady', 'بلدي', 'ejar', 'ايجار الحكومي'] },
      { key: 'absher', label: 'Absher / Gov Apps', icon: 'smartphone', aliases: ['absher', 'nafath', 'qiwa', 'mudad', 'muqeem', 'musaned', 'baladiya', 'tawakkalna', 'أبشر', 'نفاذ', 'قوى', 'مدد', 'مقيم', 'مساند', 'بلدية', 'توكلنا'], regionTags: ['ksa'] },
      { key: 'fawry', label: 'Fawry', icon: 'receipt', aliases: ['fawry', 'فوري'], regionTags: ['egypt'] },
      { key: 'e_gov_egypt', label: 'Digital Egypt', icon: 'landmark', aliases: ['sahel', 'ساهل', 'بوابة الحكومة', 'نافذة'], regionTags: ['egypt'] },
    ],
  },
  {
    key: 'housing_home',
    label: 'Housing & Home',
    type: 'expense',
    icon: 'house',
    color: '#6366F1',
    analyticsGroup: 'essentials',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'rent', label: 'Rent', icon: 'key', aliases: ['rent', 'lease', 'إيجار', 'ايجار', 'دفعه ايجاريه', 'دفعة إيجارية', 'سداد دفعه ايجاريه', 'ejar'] },
      { key: 'mortgage', label: 'Mortgage', icon: 'landmark', aliases: ['mortgage', 'home loan', 'قسط منزل', 'رهن عقاري'] },
      { key: 'home_maintenance', label: 'Home Maintenance', icon: 'hammer', aliases: ['home maintenance', 'repairs', 'صيانة منزل'] },
      { key: 'furniture', label: 'Furniture', icon: 'sofa', aliases: ['furniture', 'أثاث'] },
      { key: 'home_appliances', label: 'Home Appliances', icon: 'refrigerator', aliases: ['appliances', 'home appliances', 'أجهزة منزلية', 'ikea', 'ايكيا', 'homebox', 'هوم بوكس', 'homes r us'] },
      { key: 'cleaning_supplies', label: 'Cleaning Supplies', icon: 'spray-can', aliases: ['cleaning supplies', 'منظفات'] },
      { key: 'home_decor', label: 'Home Decor', icon: 'lamp', aliases: ['decor', 'home decor', 'ديكور'] },
      { key: 'security_services', label: 'Security Services', icon: 'shield', aliases: ['security', 'cctv', 'أمن', 'كاميرات'], regionTags: ['gulf'] },
      { key: 'domestic_worker', label: 'Domestic Worker', icon: 'user-round', aliases: ['maid', 'housekeeper', 'driver', 'nanny', 'domestic worker', 'عمالة منزلية', 'خادمة', 'شغالة', 'عامل منزل', 'سائق منزلي', 'مربية', 'مدام'], regionTags: ['gulf'] },
    ],
  },
  {
    key: 'food_dining',
    label: 'Food & Dining',
    type: 'expense',
    icon: 'utensils-crossed',
    color: '#10B981',
    analyticsGroup: 'living',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'groceries', label: 'Groceries', icon: 'shopping-cart', aliases: ['groceries', 'supermarket', 'hypermarket', 'carrefour', 'spinneys', 'panda', 'lulu', 'gomla', 'elgomla', 'el gomla', 'بقالة', 'سوبر ماركت', 'هايبر', 'كارفور', 'سبينيس', 'بندة', 'الجملة', 'بيت الجملة', 'bindawood', 'بن داود', 'nana', 'nana direct', 'نعناع', 'danube', 'الدانوب', 'farm', 'المزرعة', 'othaim', 'العثيم', 'tamimi', 'التميمي'] },
      { key: 'bakery', label: 'Bakery', icon: 'croissant', aliases: ['bakery', 'bread', 'مخبوزات', 'خبز'] },
      { key: 'meat_seafood', label: 'Meat & Seafood', icon: 'fish', aliases: ['meat', 'seafood', 'لحوم', 'فراخ', 'سمك'] },
      { key: 'restaurants', label: 'Restaurants', icon: 'chef-hat', aliases: ['restaurant', 'dining out', 'مطعم', 'albaik', 'البيك', 'al baik', 'herfy', 'هرفي', 'kudu', 'كودو', 'mcdonalds', 'ماكدونالدز', 'burger king', 'برجر كنج', 'kfc', 'كنتاكي', 'shawarmer', 'شاورمر', 'hardees', 'هارديز', 'subway', 'صب واي', 'dominos', 'دومينوز', 'pizza hut', 'بيتزا هت', 'little caesars', 'broasted', 'بروستد', 'mandoob', 'mr mandoob', 'مندوب'] },
      { key: 'cafes_coffee', label: 'Cafes & Coffee', icon: 'coffee', aliases: ['coffee', 'cafe', 'latte', 'boba', 'bubble tea', 'قهوة', 'كافيه', 'starbucks', 'ستاربكس', 'dunkin', 'دانكن', 'costa', 'كوستا', 'barn', 'بارن', 'dose', 'دوز', 'caribou', 'كاريبو', 'tim hortons', 'تيم هورتنز', 'coffe', 'boba house', 'بوبا'] },
      { key: 'food_delivery', label: 'Food Delivery', icon: 'bike', aliases: ['delivery', 'deliveroo', 'توصيل', 'toyou food', 'wssel', 'وصل', 'the chefz', 'ذا شفز'] },
      { key: 'hungerstation', label: 'HungerStation', icon: 'smartphone', aliases: ['hungerstation', 'hunger station', 'هنقرستيشن', 'هنقر ستيشن'], regionTags: ['ksa'] },
      { key: 'jahez', label: 'Jahez', icon: 'bike', aliases: ['jahez', 'جاهز'], regionTags: ['ksa'] },
      { key: 'marsool', label: 'Marsool', icon: 'package', aliases: ['marsool', 'مرسول'], regionTags: ['ksa'] },
      { key: 'talabat', label: 'Talabat', icon: 'shopping-bag', aliases: ['talabat', 'طلبات'], regionTags: ['gulf', 'egypt'] },
      { key: 'elmenus', label: 'elmenus', icon: 'utensils', aliases: ['elmenus', 'المنيوز'], regionTags: ['egypt'] },
      { key: 'snacks_sweets', label: 'Snacks & Sweets', icon: 'ice-cream-cone', aliases: ['snacks', 'dessert', 'حلويات', 'سناك'] },
      { key: 'water_beverages', label: 'Water & Beverages', icon: 'cup-soda', aliases: ['water', 'juice', 'drinks', 'water delivery', 'gallon', 'مياه', 'مشروبات', 'شاملة', 'قلون', 'توصيل مياه'] },
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    type: 'expense',
    icon: 'car',
    color: '#F97316',
    analyticsGroup: 'living',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'fuel', label: 'Fuel', icon: 'fuel', aliases: ['fuel', 'petrol', 'diesel', 'بنزين', 'وقود', 'gas station', 'محطة بنزين', 'aldrees', 'الدريس', 'naft', 'نفط', 'petromin', 'بترومين'] },
      { key: 'uber_taxi', label: 'Uber / Taxi', icon: 'car-taxi-front', aliases: ['uber', 'taxi', 'اوبر', 'تاكسي', 'bolt', 'bolt sa', 'بولت', 'jeeny', 'جيني', 'leem', 'ليم'] },
      { key: 'careem', label: 'Careem', icon: 'car-taxi-front', aliases: ['careem', 'كريم'], regionTags: ['gulf', 'egypt'] },
      { key: 'public_transport', label: 'Public Transport', icon: 'bus', aliases: ['bus', 'metro', 'tram', 'public transport', 'مواصلات', 'مترو', 'saptco', 'سابتكو', 'haramain', 'haramain train', 'قطار الحرمين'] },
      { key: 'parking', label: 'Parking', icon: 'parking-circle', aliases: ['parking', 'ركنة', 'انتظار'] },
      { key: 'tolls', label: 'Tolls', icon: 'road', aliases: ['toll', 'salik', 'رسوم طريق', 'سالك'] },
      { key: 'car_maintenance', label: 'Car Maintenance', icon: 'wrench', aliases: ['car maintenance', 'oil', 'service', 'صيانة سيارة'] },
      { key: 'car_insurance', label: 'Car Insurance', icon: 'shield-check', aliases: ['car insurance', 'vehicle insurance', 'تأمين سيارة'] },
      { key: 'registration_licensing', label: 'Registration & Licensing', icon: 'file-badge', aliases: ['registration', 'license renewal', 'ترخيص', 'تجديد'] },
      { key: 'car_rental', label: 'Car Rental', icon: 'car-front', aliases: ['car rental', 'car hire', 'rent a car', 'vehicle rental', 'udrive', 'ekar', 'theeb', 'تأجير سيارة', 'ايجار سيارة'] },
    ],
  },
  {
    key: 'shopping',
    label: 'Shopping',
    type: 'expense',
    icon: 'shopping-bag',
    color: '#EC4899',
    analyticsGroup: 'lifestyle',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'fashion', label: 'Fashion', icon: 'shirt', aliases: ['fashion', 'clothes', 'ملابس', 'أزياء', 'h&m', 'اتش اند ام', 'zara', 'زارا', 'max fashion', 'ماكس', 'centrepoint', 'سنتربوينت', 'splash', 'سبلاش', 'reds', 'american eagle', 'gap'] },
      { key: 'shoes', label: 'Shoes', icon: 'footprints', aliases: ['shoes', 'sneakers', 'أحذية'] },
      { key: 'bags_accessories', label: 'Bags & Accessories', icon: 'briefcase', aliases: ['bag', 'accessories', 'شنط', 'اكسسوارات'] },
      { key: 'jewelry', label: 'Jewelry', icon: 'gem', aliases: ['jewelry', 'gold', 'silver jewelry', 'مجوهرات', 'دهب'] },
      { key: 'watches', label: 'Watches', icon: 'watch', aliases: ['watch', 'smartwatch', 'ساعة', 'ساعات'] },
      { key: 'electronics', label: 'Electronics', icon: 'smartphone', aliases: ['electronics', 'phone', 'laptop', 'الكترونيات', 'apple store', 'samsung', 'سامسونج', 'huawei', 'هواوي'] },
      { key: 'general_shopping', label: 'General Shopping', icon: 'package', aliases: ['shopping', 'retail', 'مشتريات', 'noon', 'noon.com', 'نون', 'amazon', 'amazon.sa', 'امازون', 'shein', 'شي إن', 'temu', 'temu.com', 'aliexpress', 'علي اكسبرس', 'extra', 'اكسترا', 'jarir', 'جرير', 'saco', 'ساكو'] },
      { key: 'gifts', label: 'Gifts', icon: 'gift', aliases: ['gift', 'present', 'هدية'] },
    ],
  },
  {
    key: 'health_medical',
    label: 'Health & Medical',
    type: 'expense',
    icon: 'heart-pulse',
    color: '#EF4444',
    analyticsGroup: 'essentials',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'doctor_visits', label: 'Doctor Visits', icon: 'stethoscope', aliases: ['doctor', 'clinic', 'كشف', 'دكتور', 'glasses', 'optician', 'optometrist', 'eye doctor', 'نظارة', 'عيون', 'بصريات'] },
      { key: 'medicines', label: 'Medicines', icon: 'pill', aliases: ['medicine', 'pharmacy', 'دواء', 'صيدلية', 'nahdi', 'النهدي', 'al dawaa', 'الدواء', 'whites pharmacy', 'وايتس'] },
      { key: 'lab_tests', label: 'Lab Tests', icon: 'flask-conical', aliases: ['lab', 'analysis', 'تحاليل', 'مختبر'] },
      { key: 'hospital', label: 'Hospital', icon: 'hospital', aliases: ['hospital', 'emergency', 'مستشفى'] },
      { key: 'dental', label: 'Dental', icon: 'smile-plus', aliases: ['dentist', 'dental', 'أسنان'] },
      { key: 'therapy_fitness', label: 'Therapy & Fitness', icon: 'activity', aliases: ['therapy', 'physio', 'physical therapy', 'علاج طبيعي', 'فيزيوثيرابي'] },
      { key: 'health_insurance', label: 'Health Insurance', icon: 'shield-plus', aliases: ['health insurance', 'medical insurance', 'تأمين صحي'] },
    ],
  },
  {
    key: 'education',
    label: 'Education',
    type: 'expense',
    icon: 'graduation-cap',
    color: '#3B82F6',
    analyticsGroup: 'growth',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'school_fees', label: 'School Fees', icon: 'school', aliases: ['school fees', 'tuition', 'مصروفات مدرسة'] },
      { key: 'university', label: 'University', icon: 'building-library', aliases: ['university', 'college', 'جامعة'] },
      { key: 'courses_training', label: 'Courses & Training', icon: 'book-open', aliases: ['course', 'training', 'كورس', 'دورة'] },
      { key: 'books_supplies', label: 'Books & Supplies', icon: 'book', aliases: ['books', 'stationery', 'كتب', 'أدوات مدرسية'] },
      { key: 'tutoring', label: 'Tutoring', icon: 'user-round', aliases: ['tutor', 'lesson', 'مدرس خصوصي'] },
      { key: 'exam_fees', label: 'Exam Fees', icon: 'file-pen-line', aliases: ['exam fee', 'test fee', 'رسوم امتحان'] },
      { key: 'school_transport', label: 'School Transport', icon: 'bus-front', aliases: ['school bus', 'transport', 'باص المدرسة'] },
      { key: 'language_learning', label: 'Language Learning', icon: 'languages', aliases: ['english course', 'language course', 'لغة', 'تعلم لغة'] },
    ],
  },
  {
    key: 'family_children',
    label: 'Family & Children',
    type: 'expense',
    icon: 'users',
    color: '#F59E0B',
    analyticsGroup: 'family',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'childcare', label: 'Childcare', icon: 'baby', aliases: ['childcare', 'babysitter', 'حضانة', 'بيبي سيتر'] },
      { key: 'baby_supplies', label: 'Baby Supplies', icon: 'baby', aliases: ['diapers', 'baby supplies', 'حفاضات', 'مستلزمات أطفال'] },
      { key: 'kids_clothing', label: 'Kids Clothing', icon: 'shirt', aliases: ['kids clothes', 'child clothing', 'ملابس أطفال'] },
      { key: 'allowances', label: 'Allowances', icon: 'banknote', aliases: ['allowance', 'pocket money', 'مصروف أولاد'] },
      { key: 'family_support_out', label: 'Family Support', icon: 'hand-heart', aliases: ['family support', 'parents support', 'مساعدة أهل', 'نفقة عائلية'] },
      { key: 'school_needs', label: 'School Needs', icon: 'backpack', aliases: ['school needs', 'school items', 'مستلزمات مدرسة'] },
      { key: 'kids_activities', label: 'Kids Activities', icon: 'toy-brick', aliases: ['kids activity', 'club', 'نشاط أطفال'] },
      { key: 'maternity', label: 'Maternity', icon: 'heart', aliases: ['maternity', 'pregnancy', 'حمل', 'ولادة'] },
      { key: 'elderly_care', label: 'Elderly Care', icon: 'heart-handshake', aliases: ['elderly care', 'senior care', 'parent care', 'nurse', 'رعاية كبار السن', 'رعاية والدين', 'ممرض'] },
    ],
  },
  {
    key: 'entertainment_lifestyle',
    label: 'Entertainment & Lifestyle',
    type: 'expense',
    icon: 'clapperboard',
    color: '#A855F7',
    analyticsGroup: 'lifestyle',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'cinema_events', label: 'Cinema & Events', icon: 'ticket', aliases: ['cinema', 'movie', 'concert', 'سينما', 'حفلة'] },
      { key: 'gaming', label: 'Gaming', icon: 'gamepad-2', aliases: ['gaming', 'playstation', 'xbox', 'ألعاب'] },
      { key: 'hobbies', label: 'Hobbies', icon: 'palette', aliases: ['hobby', 'crafts', 'هوايات'] },
      { key: 'beauty_grooming', label: 'Beauty & Grooming', icon: 'sparkles', aliases: ['salon', 'barber', 'beauty', 'صالون', 'حلاقة', 'كوافير', 'spa', 'skincare', 'nail', 'manicure', 'pedicure', 'toiletries', 'personal care', 'عناية شخصية', 'مساج', 'تجميل'] },
      { key: 'sports_clubs', label: 'Sports Clubs', icon: 'dumbbell', aliases: ['gym', 'club', 'sports club', 'fitness first', 'gold gym', 'نادي', 'جيم', 'فتنس فرست', 'نادي رياضي'] },
      { key: 'social_outings', label: 'Social Outings', icon: 'party-popper', aliases: ['outing', 'hangout', 'طلعة', 'خروجة', 'فسحة', 'نزهة'] },
      { key: 'smoking_shisha', label: 'Smoking & Shisha', icon: 'cigarette', aliases: ['cigarettes', 'shisha', 'دخان', 'شيشة'] },
      { key: 'laundry', label: 'Laundry & Dry Clean', icon: 'washing-machine', aliases: ['laundry', 'dry clean', 'dry cleaning', 'ironing', 'مصبغة', 'مغسلة', 'غسيل', 'كي', 'تنظيف ملابس', 'أوتوماتيك'], regionTags: ['gulf'] },
    ],
  },
  {
    key: 'subscriptions_digital',
    label: 'Subscriptions & Digital',
    type: 'expense',
    icon: 'smartphone-nfc',
    color: '#06B6D4',
    analyticsGroup: 'digital',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'netflix', label: 'Netflix', icon: 'monitor-play', aliases: ['netflix'] },
      { key: 'shahid_vip', label: 'Shahid VIP', icon: 'tv', aliases: ['shahid', 'shahid vip', 'شاهد'] },
      { key: 'disney_plus', label: 'Disney+', icon: 'film', aliases: ['disney+', 'disney plus'] },
      { key: 'spotify', label: 'Spotify', icon: 'music-4', aliases: ['spotify'] },
      { key: 'youtube_premium', label: 'YouTube Premium', icon: 'youtube', aliases: ['youtube premium'] },
      { key: 'anghami', label: 'Anghami', icon: 'music', aliases: ['anghami', 'أنغامي'] },
      { key: 'icloud_storage', label: 'iCloud / Storage', icon: 'cloud', aliases: ['icloud', 'google one', 'storage', 'مساحة تخزين', 'dropbox', 'onedrive'] },
      { key: 'chatgpt_ai_tools', label: 'ChatGPT / AI Tools', icon: 'bot', aliases: ['chatgpt', 'openai', 'claude', 'gemini', 'ai tools', 'ذكاء اصطناعي'] },
      { key: 'vpn_security', label: 'VPN', icon: 'shield-ellipsis', aliases: ['vpn', 'nordvpn', 'expressvpn'] },
      { key: 'other_digital', label: 'Other Digital', icon: 'globe', aliases: ['digital subscription', 'online subscription', 'اشتراك رقمي', 'app subscription', 'google play', 'app store', 'apple music', 'apple tv'] },
    ],
  },
  {
    key: 'savings_goals',
    label: 'Savings & Goals',
    type: 'savings',
    icon: 'piggy-bank',
    color: '#14B8A6',
    analyticsGroup: 'savings',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'emergency_fund', label: 'Emergency Fund', icon: 'shield-alert', aliases: ['emergency fund', 'fund', 'صندوق طوارئ'] },
      { key: 'general_savings', label: 'General Savings', icon: 'wallet-cards', aliases: ['savings', 'save money', 'ادخار'] },
      { key: 'home_goal', label: 'Home Goal', icon: 'house', aliases: ['home goal', 'house savings', 'ادخار بيت'] },
      { key: 'car_goal', label: 'Car Goal', icon: 'car', aliases: ['car goal', 'car savings', 'ادخار سيارة'] },
      { key: 'wedding_goal', label: 'Wedding Goal', icon: 'heart-handshake', aliases: ['wedding fund', 'marriage savings', 'جهاز', 'زواج'] },
      { key: 'education_goal', label: 'Education Goal', icon: 'graduation-cap', aliases: ['education savings', 'study fund', 'ادخار تعليم'] },
      { key: 'travel_goal', label: 'Travel Goal', icon: 'plane', aliases: ['travel savings', 'trip fund', 'ادخار سفر'] },
      { key: 'hajj_umrah_goal', label: 'Hajj / Umrah Goal', icon: 'moon-star', aliases: ['hajj savings', 'umrah savings', 'ادخار عمرة', 'ادخار حج'] },
    ],
  },
  {
    key: 'investments',
    label: 'Investments',
    type: 'savings',
    icon: 'candlestick-chart',
    color: '#0EA5E9',
    analyticsGroup: 'investments',
    budgetable: false,
    goalEligible: true,
    subcategories: [
      { key: 'stocks', label: 'Stocks', icon: 'chart-line', aliases: ['stocks', 'shares', 'أسهم'] },
      { key: 'etfs_funds', label: 'ETFs & Funds', icon: 'chart-pie', aliases: ['etf', 'fund', 'mutual fund', 'صناديق', 'broker fee', 'trading fee', 'investment fee', 'رسوم استثمار', 'رسوم وساطة'] },
      { key: 'crypto', label: 'Crypto', icon: 'bitcoin', aliases: ['crypto', 'bitcoin', 'usdt', 'كريبتو', 'بيتكوين'] },
      { key: 'gold_silver', label: 'Gold & Silver', icon: 'coins', aliases: ['gold', 'silver', 'ذهب', 'فضة'] },
      { key: 'real_estate_investment', label: 'Real Estate Investment', icon: 'building-2', aliases: ['real estate', 'property investment', 'استثمار عقاري'] },
      { key: 'private_business', label: 'Private Business', icon: 'store', aliases: ['business investment', 'partnership', 'شراكة', 'استثمار مشروع'] },
      { key: 'retirement', label: 'Retirement', icon: 'hourglass', aliases: ['retirement', 'pension', 'gosi', 'تقاعد', 'جوسي', 'معاش', 'تأمينات اجتماعية'] },
    ],
  },
  {
    key: 'debt_obligations',
    label: 'Debt & Obligations',
    type: 'expense',
    icon: 'credit-card',
    color: '#DC2626',
    analyticsGroup: 'obligations',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'credit_card_payment', label: 'Credit Card Payment', icon: 'credit-card', aliases: ['credit card', 'card payment', 'بطاقة ائتمان', 'سداد بطاقة ائتمانية', 'سداد بطاقة'] },
      { key: 'personal_loan', label: 'Personal Loan', icon: 'hand-coins', aliases: ['personal loan', 'loan installment', 'قرض شخصي', 'تمويل شخصي', 'قسط تمويل'] },
      { key: 'mortgage_payment', label: 'Mortgage Payment', icon: 'house-plus', aliases: ['mortgage payment', 'home installment', 'قسط عقار', 'تمويل عقاري', 'تمويل عقار', 'قسط منزل', 'home loan'] },
      { key: 'car_loan', label: 'Car Loan', icon: 'car-front', aliases: ['car loan', 'vehicle installment', 'قسط سيارة', 'تمويل سيارة', 'تمويل سياره', 'car installment'] },
      { key: 'installments_bnpl', label: 'Installments / BNPL', icon: 'calendar-sync', aliases: ['installment', 'تقسيط', 'أقساط'] },
      { key: 'tabby', label: 'Tabby', icon: 'smartphone-nfc', aliases: ['tabby', 'تابي'], regionTags: ['gulf'] },
      { key: 'tamara', label: 'Tamara', icon: 'smartphone-nfc', aliases: ['tamara', 'تمارا'], regionTags: ['gulf'] },
      { key: 'taxes_fees', label: 'Taxes & Government Fees', icon: 'receipt-text', aliases: ['tax', 'government fee', 'رسوم حكومية', 'ضريبة'] },
      { key: 'legal_support', label: 'Legal Support', icon: 'scale', aliases: ['legal fee', 'court', 'محامي', 'قانوني'] },
      { key: 'alimony_support', label: 'Alimony / Support', icon: 'hand-heart', aliases: ['alimony', 'support payment', 'نفقة'] },
    ],
  },
  {
    key: 'travel',
    label: 'Travel',
    type: 'expense',
    icon: 'plane',
    color: '#0F766E',
    analyticsGroup: 'travel',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'flights', label: 'Flights', icon: 'plane-takeoff', aliases: ['flight', 'air ticket', 'طيران', 'تذكرة', 'saudia', 'الخطوط السعودية', 'flynas', 'فلاي ناس', 'flyadeal', 'فلاي أديل', 'airasia', 'emirates', 'الإمارات', 'qatar airways', 'etihad'] },
      { key: 'hotels', label: 'Hotels', icon: 'hotel', aliases: ['hotel', 'resort', 'فندق'] },
      { key: 'visa_fees', label: 'Visa Fees', icon: 'passport', aliases: ['visa fee', 'travel visa', 'تأشيرة'] },
      { key: 'travel_transport', label: 'Travel Transport', icon: 'train-front', aliases: ['train', 'airport transfer', 'مواصلات سفر'] },
      { key: 'travel_food', label: 'Travel Food', icon: 'utensils', aliases: ['travel food', 'meals abroad', 'أكل سفر'] },
      { key: 'travel_shopping', label: 'Travel Shopping', icon: 'shopping-bag', aliases: ['souvenirs', 'travel shopping', 'مشتريات سفر'] },
      { key: 'travel_insurance', label: 'Travel Insurance', icon: 'shield-check', aliases: ['travel insurance', 'تأمين سفر'] },
      { key: 'hajj_umrah_trip', label: 'Hajj / Umrah', icon: 'moon-star', aliases: ['umrah', 'hajj', 'عمرة', 'حج'] },
    ],
  },
  {
    key: 'religion_charity_social',
    label: 'Religion / Charity / Social Duties',
    type: 'expense',
    icon: 'heart-handshake',
    color: '#16A34A',
    analyticsGroup: 'social',
    budgetable: true,
    goalEligible: true,
    subcategories: [
      { key: 'zakat', label: 'Zakat', icon: 'hand-coins', aliases: ['zakat', 'زكاة'] },
      { key: 'sadaqah', label: 'Sadaqah / Charity', icon: 'heart', aliases: ['charity', 'donation', 'sadaqah', 'صدقة', 'تبرع'] },
      { key: 'mosque_community', label: 'Mosque / Community', icon: 'building', aliases: ['mosque donation', 'community fund', 'مسجد', 'جمعية'] },
      { key: 'eid_social_giving', label: 'Eid / Social Giving', icon: 'gift', aliases: ['eidiya', 'eid gift', 'عيدية'] },
      { key: 'family_occasions', label: 'Family Occasions', icon: 'users', aliases: ['wedding gift', 'occasion', 'مناسبة', 'فرح'] },
      { key: 'funeral_support', label: 'Funeral Support', icon: 'flower-2', aliases: ['funeral support', 'عزاء'] },
      { key: 'religious_courses', label: 'Religious Courses', icon: 'book-heart', aliases: ['quran course', 'religious class', 'تحفيظ', 'درس ديني'] },
      { key: 'qurbani', label: 'Qurbani / Sacrifice', icon: 'beef', aliases: ['qurbani', 'udhiya', 'أضحية'] },
      { key: 'ramadan_supplies', label: 'Ramadan Supplies', icon: 'moon-star', aliases: ['ramadan', 'ramadan supplies', 'suhoor', 'iftar', 'مستلزمات رمضان', 'رمضان', 'إفطار', 'سحور', 'فانوس'] },
    ],
  },
  {
    key: 'business_work_expenses',
    label: 'Business / Work Expenses',
    type: 'expense',
    icon: 'briefcase-business',
    color: '#475569',
    analyticsGroup: 'business',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'office_supplies', label: 'Office Supplies', icon: 'paperclip', aliases: ['office supplies', 'stationery', 'مستلزمات مكتب'] },
      { key: 'software_tools', label: 'Software & Tools', icon: 'monitor-cog', aliases: ['software', 'saas', 'tool subscription', 'برامج', 'adobe', 'creative cloud', 'photoshop', 'illustrator', 'microsoft', 'office 365', 'microsoft 365', 'أدوبي', 'مايكروسوفت'] },
      { key: 'business_travel', label: 'Business Travel', icon: 'plane', aliases: ['business travel', 'سفر عمل'] },
      { key: 'marketing_ads', label: 'Marketing & Ads', icon: 'megaphone', aliases: ['ads', 'marketing', 'إعلانات', 'تسويق'] },
      { key: 'shipping_logistics', label: 'Shipping & Logistics', icon: 'truck', aliases: ['shipping', 'courier', 'شحن', 'aramex', 'ارامكس', 'smsa', 'dhl', 'fedex', 'toyou', 'اكسبريس', 'j&t', 'naqel', 'ناقل'] },
      { key: 'professional_services', label: 'Professional Services', icon: 'users-round', aliases: ['accountant', 'designer', 'consultant', 'خدمات مهنية'] },
      { key: 'coworking_office_rent', label: 'Coworking / Office Rent', icon: 'building', aliases: ['office rent', 'coworking', 'مكتب'] },
      { key: 'internet_phone_work', label: 'Work Internet & Phone', icon: 'smartphone', aliases: ['business phone', 'work internet', 'خط شغل'] },
    ],
  },
  {
    key: 'pets',
    label: 'Pets',
    type: 'expense',
    icon: 'paw-print',
    color: '#8B5E3C',
    analyticsGroup: 'family',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'pet_food', label: 'Pet Food', icon: 'bone', aliases: ['pet food', 'dog food', 'cat food', 'أكل حيوانات'] },
      { key: 'vet', label: 'Vet', icon: 'stethoscope', aliases: ['vet', 'veterinary', 'بيطري'] },
      { key: 'pet_supplies', label: 'Pet Supplies', icon: 'package', aliases: ['pet supplies', 'لوازم حيوانات'] },
      { key: 'grooming', label: 'Grooming', icon: 'scissors', aliases: ['pet grooming', 'تنظيف حيوانات'] },
      { key: 'boarding', label: 'Boarding / Sitting', icon: 'house', aliases: ['pet hotel', 'boarding', 'إقامة حيوانات'] },
      { key: 'pet_toys', label: 'Pet Toys', icon: 'toy-brick', aliases: ['pet toys', 'لعب حيوانات'] },
    ],
  },
  {
    key: 'fines',
    label: 'Fines & Violations',
    type: 'expense',
    icon: 'siren',
    color: '#DC2626',
    analyticsGroup: 'living',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'traffic_fines', label: 'Traffic Fines', icon: 'car', aliases: ['traffic fine', 'traffic violation', 'speeding', 'saher', 'ساهر', 'مخالفة مرورية', 'مخالفات مرورية', 'المخالفات المرورية', 'مرور', 'سرعة'] },
      { key: 'parking_fines', label: 'Parking Fines', icon: 'parking-circle', aliases: ['parking fine', 'parking ticket', 'مخالفة وقوف', 'مخالفة ركنة'] },
      { key: 'government_fines', label: 'Government Fines', icon: 'landmark', aliases: ['government fine', 'moi fine', 'ministry fine', 'وزارة الداخلية', 'مدفوعات حكومية', 'غرامة حكومية', 'absher', 'أبشر'] },
      { key: 'late_payment_fines', label: 'Late Payment Penalties', icon: 'clock', aliases: ['late payment', 'late fee', 'late penalty', 'غرامة تأخير', 'تأخر سداد'] },
      { key: 'other_fines', label: 'Other Fines', icon: 'octagon-alert', aliases: ['fine', 'penalty', 'violation', 'مخالفة', 'غرامة', 'جزاء'] },
    ],
  },
  {
    key: 'miscellaneous',
    label: 'Miscellaneous',
    type: 'expense',
    icon: 'boxes',
    color: '#94A3B8',
    analyticsGroup: 'other',
    budgetable: true,
    goalEligible: false,
    subcategories: [
      { key: 'cash_withdrawal', label: 'Cash Withdrawal', icon: 'banknote', aliases: ['cash withdrawal', 'atm', 'سحب نقدي', 'atm withdrawal'] },
      { key: 'fees_commissions', label: 'Fees & Commissions', icon: 'receipt', aliases: ['fee', 'commission', 'رسوم', 'عمولة', 'bank fee', 'atm fee', 'رسوم بنكية'] },
      { key: 'unexpected_expense', label: 'Unexpected Expense', icon: 'triangle-alert', aliases: ['unexpected', 'misc expense', 'مصروف مفاجئ', 'loss', 'damage', 'تلف', 'خسارة'] },
      { key: 'uncategorized', label: 'Uncategorized', icon: 'circle-help', aliases: ['uncategorized', 'other', 'أخرى', 'غير مصنف', 'miscellaneous', 'general', 'متفرقات'] },
    ],
  },
  {
    key: 'transfers',
    label: 'Transfers',
    type: 'transfer',
    icon: 'arrow-left-right',
    color: '#3B82F6',
    analyticsGroup: 'transfer',
    budgetable: false,
    goalEligible: false,
    subcategories: [
      { key: 'between_accounts', label: 'Between Accounts', icon: 'repeat', aliases: ['transfer between accounts', 'internal transfer', 'تحويل بين الحسابات'] },
      { key: 'cash_to_bank', label: 'Cash to Bank', icon: 'landmark', aliases: ['cash to bank', 'deposit to bank', 'إيداع نقدي'] },
      { key: 'bank_to_cash', label: 'Bank to Cash', icon: 'wallet', aliases: ['bank to cash', 'withdraw to cash', 'سحب للكاش'] },
      { key: 'wallet_top_up', label: 'Wallet Top-up', icon: 'smartphone', aliases: ['wallet top up', 'mobile wallet', 'شحن محفظة'] },
      { key: 'savings_transfer', label: 'Move to Savings', icon: 'piggy-bank', aliases: ['move to savings', 'transfer to savings', 'تحويل للادخار'] },
      { key: 'investment_transfer', label: 'Move to Investment', icon: 'candlestick-chart', aliases: ['transfer to broker', 'investment transfer', 'تحويل استثمار'] },
    ],
  },
] as const satisfies readonly CategoryTaxonomyCategory[];

export const MAIN_CATEGORIES = CATEGORY_TAXONOMY.map(({ subcategories: _subcategories, ...category }) => category);

export const FLATTENED_SUBCATEGORIES: readonly FlattenedTaxonomySubcategory[] = CATEGORY_TAXONOMY.flatMap((category) =>
  category.subcategories.map((subcategory) => ({
    ...subcategory,
    parentKey: category.key,
    parentLabel: category.label,
    parentType: category.type,
    analyticsGroup: category.analyticsGroup,
  })),
);

export const CATEGORY_TAXONOMY_BY_KEY: Readonly<Record<string, CategoryTaxonomyCategory>> = Object.freeze(
  Object.fromEntries(CATEGORY_TAXONOMY.map((category) => [category.key, category])),
);

export const SUBCATEGORY_TAXONOMY_BY_KEY: Readonly<Record<string, FlattenedTaxonomySubcategory>> = Object.freeze(
  Object.fromEntries(FLATTENED_SUBCATEGORIES.map((subcategory) => [subcategory.key, subcategory])),
);

export const CATEGORY_ALIAS_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze(
  Object.fromEntries(
    CATEGORY_TAXONOMY.map((category) => [
      category.key,
      category.subcategories.flatMap((subcategory) => subcategory.aliases ?? []),
    ]),
  ),
);

export const SUBCATEGORY_ALIAS_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze(
  Object.fromEntries(
    FLATTENED_SUBCATEGORIES.map((subcategory) => [
      subcategory.key,
      subcategory.aliases ?? [],
    ]),
  ),
);

// ─── Country → Region mapping ────────────────────────────────────────

const GULF_COUNTRIES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'] as const;

/** Resolve which region tags apply for a given ISO country code */
export function getRegionTagsForCountry(countryCode: string | null): readonly RegionTag[] {
  if (!countryCode) return ['all', 'gulf']; // Default to gulf (KSA-first)
  const cc = countryCode.toUpperCase();
  const tags: RegionTag[] = ['all'];
  if (GULF_COUNTRIES.includes(cc as typeof GULF_COUNTRIES[number])) tags.push('gulf');
  if (cc === 'SA') tags.push('ksa');
  if (cc === 'AE') tags.push('uae');
  if (cc === 'EG') tags.push('egypt');
  return tags;
}

/** Check if a subcategory should be visible for a user's country */
export function isSubcategoryVisibleForCountry(
  sub: CategoryTaxonomySubcategory,
  countryCode: string | null,
): boolean {
  const subTags = sub.regionTags;
  if (!subTags || subTags.length === 0 || subTags.includes('all')) return true;
  const userTags = getRegionTagsForCountry(countryCode);
  return subTags.some((tag) => userTags.includes(tag));
}

/** Filter the full taxonomy for a specific country */
export function getFilteredTaxonomy(
  countryCode: string | null,
): readonly CategoryTaxonomyCategory[] {
  return CATEGORY_TAXONOMY.map((cat) => ({
    ...cat,
    subcategories: cat.subcategories.filter((sub) =>
      isSubcategoryVisibleForCountry(sub, countryCode),
    ),
  })).filter((cat) => cat.subcategories.length > 0);
}

/** Filter flattened subcategories for a specific country */
export function getFilteredSubcategories(
  countryCode: string | null,
): readonly FlattenedTaxonomySubcategory[] {
  return FLATTENED_SUBCATEGORIES.filter((sub) =>
    isSubcategoryVisibleForCountry(sub, countryCode),
  );
}
