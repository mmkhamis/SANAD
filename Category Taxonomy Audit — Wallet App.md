# 🏦 Wallet App — Category Taxonomy Audit v2

> **Last updated:** April 16, 2026
> **Strategy:** KSA-first · Country-aware · Gulf + Egypt coverage
> **Status:** Ready for implementation

---

## 📐 Architecture: Country-Aware Category System

The user selects their country during onboarding. Categories are filtered and prioritized based on that selection.

```
┌──────────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                               │
│                                                                  │
│   🇸🇦 Saudi Arabia     🇪🇬 Egypt     🇦🇪 UAE     🇰🇼 Kuwait      │
│   🇶🇦 Qatar            🇧🇭 Bahrain   🇴🇲 Oman    🇯🇴 Jordan      │
│                                                                  │
│   User picks country → stored in profile.country_code            │
│   Categories filtered by: region_tags on each subcategory        │
│                                                                  │
│   region_tags:                                                   │
│     'all'   → shown everywhere                                   │
│     'gulf'  → 🇸🇦 🇦🇪 🇰🇼 🇶🇦 🇧🇭 🇴🇲                              │
│     'egypt' → 🇪🇬                                                 │
│     'ksa'   → 🇸🇦 only                                            │
│     'uae'   → 🇦🇪 only                                            │
└──────────────────────────────────────────────────────────────────┘
```

**Visible Arabic labels** → KSA-first (Saudi Gulf dialect)
**Parser aliases** → aggressive multi-dialect (KSA + Egypt + Levant)
**Icons** → Lucide icon names (vector, not emoji)
**Emoji fallback** → upgraded emoji set for DB storage

---

## 🗂️ A) Source File Inventory

| # | Source File | What It Contains | Lines |
|---|-------------|-----------------|-------|
| 1 | `constants/category-taxonomy.ts` | Master taxonomy: 20 parents, ~155 subcategories, aliases, icons, colors | 465 |
| 2 | `constants/category-names.ar.ts` | Arabic translation map (English label → Arabic) | 267 |
| 3 | `services/category-service.ts` | GROUP_EMOJI + SUB_EMOJI maps, seed logic, CRUD | 428 |
| 4 | `hooks/useCategories.ts` | TanStack Query hooks for categories | 131 |
| 5 | `components/finance/CategoryPicker.tsx` | Drill-down category selection UI | 370 |
| 6 | `supabase/functions/parse-transaction/index.ts` | AI parser CATEGORY_HINTS keyword map | 800+ |
| 7 | `services/smart-input-service.ts` | Alias index for smart matching | 150 |
| 8 | `supabase/migrations/012_category_groups.sql` | Legacy flat categories (stale) | — |
| 9 | `supabase/migrations/013_expand_mena_categories.sql` | MENA expansion (partially stale) | — |

---

## 🔍 B) Duplicates, Conflicts & Issues Found

### Critical Issues

| # | Issue | Where | Impact | Fix |
|---|-------|-------|--------|-----|
| 1 | `SUB_EMOJI` has keys for removed subcategories | `category-service.ts` | Dead code, no runtime error | Remove: `landline`, `vision`, `adobe`, `microsoft`, `personal_care`, `bank_fees`, `loss_damage`, `other_misc`, `investment_fees`, all `luxury_*` keys |
| 2 | `category-names.ar.ts` has translations for removed labels | `category-names.ar.ts` | Dead translations | Remove: `Landline`, `Vision & Glasses`, `Personal Care`, `Adobe`, `Microsoft`, `Investment Fees`, `Bank Fees`, `Loss / Damage`, `Other Miscellaneous`, all Luxury labels |
| 3 | `therapy_fitness` icon is `dumbbell` — same as `sports_clubs` | `category-taxonomy.ts` | Visual confusion in picker | Change `therapy_fitness` icon to `activity` (rehab/physio feel) |
| 4 | `car_rental` icon is `car` — same as parent Transport | `category-taxonomy.ts` | Visual confusion | Change to `car-front` |
| 5 | `home_appliances` sub-emoji is `🏠` — same as `rent` | `category-service.ts` | Generic | Change to `🔌` |
| 6 | `domestic_worker` sub-emoji is `🧹` — misleading | `category-service.ts` | Change to `🏡` |
| 7 | Migration 013 group names ≠ taxonomy keys | DB | Stale but harmless if taxonomy_key populated | Verify via SQL query |

### Near-Duplicates Already Resolved

| Pair | Resolution | Status |
|------|-----------|--------|
| `personal_care` + `beauty_grooming` | Merged into `beauty_grooming` | ✅ Done in taxonomy |
| `bank_fees` + `fees_commissions` | Merged into `fees_commissions` | ✅ Done |
| `loss_damage` + `unexpected_expense` | Merged into `unexpected_expense` (aliases absorbed) | ✅ Done |
| `other_misc` + `uncategorized` | Removed `other_misc`, kept `uncategorized` | ✅ Done |
| `investment_fees` + `etfs_funds` | Merged aliases into `etfs_funds` | ✅ Done |
| `adobe` / `microsoft` → `software_tools` | Moved to business, aliases absorbed | ✅ Done |
| `luxury_status` (entire parent) → `shopping` + others | Remapped all 8 subcategories | ✅ Done |

---

## 🏗️ C) Final Category Taxonomy — Country-Aware

### How to read each table

- **Icon** = Lucide icon name (used in `category-taxonomy.ts`)
- **Emoji** = fallback for DB storage (used in `SUB_EMOJI` map)
- **Region** = `all` / `gulf` / `egypt` / `ksa` / `uae` — controls visibility per country
- **Arabic** = KSA-first visible label
- **Egypt Aliases** = hidden parser aliases for Egyptian dialect (never shown in UI)

---

### 1. 💰 Income — الدخل

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region | Egypt Aliases |
|---|-----|---------|-------------|------|-------|--------|---------------|
| 1 | `salary` | Salary | الراتب | `briefcase` | 💰 | all | مرتب, ماهية |
| 2 | `bonus` | Bonus | مكافأة | `award` | 🎁 | all | حوافز |
| 3 | `freelance` | Freelance | عمل حر | `laptop` | 💻 | all | شغل فريلانس |
| 4 | `business_profit` | Business Profit | ربح مشروع | `store` | 🏢 | all | أرباح تجارية |
| 5 | `rental_income` | Rental Income | دخل إيجار | `building-2` | 🏠 | all | إيجار وارد |
| 6 | `investment_income` | Investment Income | أرباح استثمار | `chart-column` | 📈 | all | عوائد, أرباح |
| 7 | `family_support_in` | Support Received | مساعدة من الأهل | `hand-coins` | 🤝 | all | مصاريف من الأهل |
| 8 | `gift_received` | Gift Received | هدية | `gift` | 🎀 | all | — |
| 9 | `refund_rebate` | Refund / Cashback | استرداد | `rotate-ccw` | 🔄 | all | مرتجعات |
| 10 | `other_income` | Other Income | دخل آخر | `plus-circle` | 💵 | all | — |

---

### 2. 🧾 Bills & Utilities — الفواتير والخدمات

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region | Notes |
|---|-----|---------|-------------|------|-------|--------|-------|
| 1 | `electricity` | Electricity | كهرباء | `zap` | ⚡ | all | SEC (KSA), EDE (Egypt) |
| 2 | `water` | Water | ماء | `droplets` | 💧 | all | NWC (KSA), Holding Co (Egypt) |
| 3 | `gas` | Gas | غاز | `flame` | 🔥 | egypt | Rare in Gulf — show for Egypt users |
| 4 | `internet` | Internet | إنترنت | `wifi` | 🌐 | all | STC, Mobily, Zain, WE, Vodafone |
| 5 | `mobile` | Mobile / SIM | جوال | `smartphone` | 📱 | all | Absorbed landline aliases |
| 6 | `tv_satellite` | TV / Satellite | قنوات / دش | `tv` | 📡 | all | OSN, beIN |
| 7 | `building_fees` | Building Fees | رسوم الخدمات | `building` | 🏢 | gulf | Common in KSA/UAE compounds |
| 8 | `government_services` | Government Services | خدمات حكومية | `landmark` | 🏛️ | all | 🇸🇦 Absher, Qiwa, Mudad, Muqeem · 🇪🇬 Sahel, بوابة الحكومة |

---

### 3. 🏠 Housing & Home — السكن والبيت

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region | Notes |
|---|-----|---------|-------------|------|-------|--------|-------|
| 1 | `rent` | Rent | إيجار | `key` | 🔑 | all | — |
| 2 | `mortgage` | Mortgage | قسط البيت | `landmark` | 🏦 | all | — |
| 3 | `home_maintenance` | Maintenance | صيانة المنزل | `hammer` | 🔨 | all | — |
| 4 | `furniture` | Furniture | أثاث | `sofa` | 🛋️ | all | — |
| 5 | `home_appliances` | Appliances | أجهزة منزلية | `refrigerator` | 🔌 | all | — |
| 6 | `cleaning_supplies` | Cleaning | منظفات | `spray-can` | 🧹 | all | — |
| 7 | `home_decor` | Decor | ديكور | `lamp` | 🖼️ | all | — |
| 8 | `security_services` | Security | أمن وحراسة | `shield` | 🔒 | gulf | Compounds, villas |
| 9 | `domestic_worker` | Domestic Worker | عمالة منزلية | `user-round` | 🏡 | gulf | Maid/driver salary. 🇸🇦 شغالة, سائق. Very common Gulf expense |

---

### 4. 🍽️ Food & Dining — الأكل والمطاعم

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `groceries` | Groceries | بقالة | `shopping-cart` | 🛒 | all |
| 2 | `bakery` | Bakery | مخبز | `croissant` | 🍞 | all |
| 3 | `meat_seafood` | Meat & Seafood | لحوم وأسماك | `fish` | 🥩 | all |
| 4 | `restaurants` | Restaurants | مطاعم | `chef-hat` | 🍽️ | all |
| 5 | `cafes_coffee` | Cafes & Coffee | قهوة وكافيه | `coffee` | ☕ | all |
| 6 | `food_delivery` | Food Delivery | توصيل طلبات | `bike` | 🛵 | all |
| 7 | `snacks_sweets` | Snacks & Sweets | سناكات وحلويات | `ice-cream-cone` | 🍰 | all |
| 8 | `water_beverages` | Water & Beverages | مياه ومشروبات | `cup-soda` | 🥤 | all |

---

### 5. 🚗 Transport — المواصلات

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region | Notes |
|---|-----|---------|-------------|------|-------|--------|-------|
| 1 | `fuel` | Fuel | بنزين | `fuel` | ⛽ | all | — |
| 2 | `uber_taxi` | Uber / Taxi | أوبر / تاكسي | `car-taxi-front` | 🚕 | all | Careem aliased |
| 3 | `public_transport` | Public Transport | مواصلات عامة | `bus` | 🚌 | all | Metro (Cairo, Riyadh, Dubai) |
| 4 | `parking` | Parking | مواقف | `parking-circle` | 🅿️ | all | — |
| 5 | `tolls` | Tolls | رسوم طريق | `road` | 🛣️ | all | Salik (UAE), Darb (KSA) |
| 6 | `car_maintenance` | Car Maintenance | صيانة السيارة | `wrench` | 🔧 | all | — |
| 7 | `car_insurance` | Car Insurance | تأمين السيارة | `shield-check` | 🛡️ | all | — |
| 8 | `registration_licensing` | Registration | ترخيص وتجديد | `file-badge` | 📋 | all | Muroor, Istimara |
| 9 | `car_rental` | Car Rental | تأجير سيارة | `car-front` | 🚙 | all | Udrive, Ekar, Theeb |

---

### 6. 🛍️ Shopping — التسوّق

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `fashion` | Fashion | ملابس وأزياء | `shirt` | 👕 | all |
| 2 | `shoes` | Shoes | أحذية | `footprints` | 👟 | all |
| 3 | `bags_accessories` | Bags & Accessories | شنط واكسسوارات | `briefcase` | 👜 | all |
| 4 | `jewelry` | Jewelry & Gold | مجوهرات وذهب | `gem` | 💎 | all |
| 5 | `watches` | Watches | ساعات | `watch` | ⌚ | all |
| 6 | `electronics` | Electronics | إلكترونيات | `smartphone` | 📱 | all |
| 7 | `general_shopping` | General Shopping | مشتريات عامة | `package` | 📦 | all |
| 8 | `gifts` | Gifts | هدايا | `gift` | 🎁 | all |

---

### 7. 🏥 Health & Medical — الصحة والعلاج

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `doctor_visits` | Doctor Visits | دكتور | `stethoscope` | 🩺 | all |
| 2 | `medicines` | Medicines | أدوية | `pill` | 💊 | all |
| 3 | `lab_tests` | Lab Tests | تحاليل | `flask-conical` | 🧪 | all |
| 4 | `hospital` | Hospital | مستشفى | `hospital` | 🏥 | all |
| 5 | `dental` | Dental | أسنان | `smile-plus` | 🦷 | all |
| 6 | `therapy_fitness` | Physiotherapy | علاج طبيعي | `activity` | 🏋️ | all |
| 7 | `health_insurance` | Health Insurance | تأمين صحي | `shield-plus` | 🛡️ | all |

> **Removed:** `vision` — merged into `doctor_visits` with aliases (glasses, optician, optometrist, نظارة, بصريات)

---

### 8. 🎓 Education — التعليم

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `school_fees` | School Fees | رسوم المدرسة | `school` | 🎓 | all |
| 2 | `university` | University | جامعة | `building-library` | 🏫 | all |
| 3 | `courses_training` | Courses & Training | دورات وتدريب | `book-open` | 💻 | all |
| 4 | `books_supplies` | Books & Supplies | كتب وأدوات | `book` | 📖 | all |
| 5 | `tutoring` | Tutoring | دروس خصوصية | `user-round` | 👨‍🏫 | all |
| 6 | `exam_fees` | Exam Fees | رسوم امتحان | `file-pen-line` | 📝 | all |
| 7 | `school_transport` | School Transport | باص المدرسة | `bus-front` | 🚌 | all |
| 8 | `language_learning` | Language Learning | تعلم لغة | `languages` | 🗣️ | all |

---

### 9. 👨‍👩‍👧‍👦 Family & Children — العائلة والأطفال

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `childcare` | Childcare | حضانة | `baby` | 👶 | all |
| 2 | `baby_supplies` | Baby Supplies | مستلزمات رضيع | `baby` | 🍼 | all |
| 3 | `kids_clothing` | Kids Clothing | ملابس أطفال | `shirt` | 👗 | all |
| 4 | `allowances` | Allowances | مصروف العيال | `banknote` | 💵 | all |
| 5 | `family_support_out` | Family Support | مساعدة الأهل | `hand-heart` | 🤝 | all |
| 6 | `school_needs` | School Needs | مستلزمات المدرسة | `backpack` | 🎒 | all |
| 7 | `kids_activities` | Kids Activities | أنشطة الأطفال | `toy-brick` | 🎪 | all |
| 8 | `maternity` | Maternity | حمل وولادة | `heart` | ❤️ | all |
| 9 | `elderly_care` | Elderly Care | رعاية الوالدين | `heart-handshake` | 🧓 | all |

> **Arabic note:** `مصروف العيال` — Saudi/Gulf natural. Egypt alias: `مصروف الأولاد`
> **Arabic note:** `رعاية الوالدين` — religiously resonant for caring for parents. Alias: `رعاية كبار السن`

---

### 10. 🎬 Entertainment & Lifestyle — الترفيه

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `cinema_events` | Cinema & Events | سينما وفعاليات | `ticket` | 🎬 | all |
| 2 | `gaming` | Gaming | ألعاب | `gamepad-2` | 🎮 | all |
| 3 | `hobbies` | Hobbies | هوايات | `palette` | 🎨 | all |
| 4 | `beauty_grooming` | Beauty & Grooming | صالون وحلاقة | `sparkles` | 💇 | all |
| 5 | `sports_clubs` | Sports & Gym | نادي ورياضة | `dumbbell` | 🏋️ | all |
| 6 | `social_outings` | Social Outings | طلعات | `party-popper` | 🎉 | all |
| 7 | `smoking_shisha` | Smoking & Shisha | تدخين وشيشة | `cigarette` | 💨 | all |
| 8 | `laundry` | Laundry & Dry Clean | غسيل وكي | `washing-machine` | 👔 | gulf |

> **Arabic note:** `طلعات` — Saudi/Gulf identity term. Egypt aliases: `فسحة`, `نزهة`, `خروجة`
> **Removed:** `personal_care` — merged into `beauty_grooming`

---

### 11. 🔄 Subscriptions & Digital — الاشتراكات الرقمية

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `netflix` | Netflix | نتفلكس | `monitor-play` | 📺 | all |
| 2 | `shahid_vip` | Shahid VIP | شاهد VIP | `tv` | 📺 | all |
| 3 | `disney_plus` | Disney+ | ديزني+ | `film` | 🎬 | all |
| 4 | `spotify` | Spotify | سبوتيفاي | `music-4` | 🎵 | all |
| 5 | `youtube_premium` | YouTube Premium | يوتيوب بريميوم | `youtube` | ▶️ | all |
| 6 | `anghami` | Anghami | أنغامي | `music` | 🎶 | all |
| 7 | `icloud_storage` | Cloud Storage | مساحة تخزين | `cloud` | ☁️ | all |
| 8 | `chatgpt_ai_tools` | AI Tools | ذكاء اصطناعي | `bot` | 🤖 | all |
| 9 | `vpn_security` | VPN | VPN | `shield-ellipsis` | 🔐 | all |
| 10 | `other_digital` | Other Digital | اشتراكات أخرى | `globe` | 🌐 | all |

> **Removed:** `adobe`, `microsoft` — moved to `business_work_expenses.software_tools` as aliases

---

### 12. 🏦 Savings & Goals — الادخار والأهداف

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `emergency_fund` | Emergency Fund | صندوق طوارئ | `shield-alert` | 🆘 | all |
| 2 | `general_savings` | General Savings | ادخار عام | `wallet-cards` | 🏦 | all |
| 3 | `home_goal` | Home Goal | ادخار بيت | `house` | 🏠 | all |
| 4 | `car_goal` | Car Goal | ادخار سيارة | `car` | 🚗 | all |
| 5 | `wedding_goal` | Wedding Goal | ادخار زواج / جهاز | `heart-handshake` | 💍 | all |
| 6 | `education_goal` | Education Goal | ادخار تعليم | `graduation-cap` | 🎓 | all |
| 7 | `travel_goal` | Travel Goal | ادخار سفر | `plane` | ✈️ | all |
| 8 | `hajj_umrah_goal` | Hajj / Umrah Goal | ادخار حج وعمرة | `moon-star` | 🕋 | all |

---

### 13. 📈 Investments — الاستثمارات

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `stocks` | Stocks | أسهم | `chart-line` | 📈 | all |
| 2 | `etfs_funds` | ETFs & Funds | صناديق | `chart-pie` | 📊 | all |
| 3 | `crypto` | Crypto | كريبتو | `bitcoin` | ₿ | all |
| 4 | `gold_silver` | Gold & Silver | ذهب وفضة | `coins` | 🪙 | all |
| 5 | `real_estate_investment` | Real Estate | استثمار عقاري | `building-2` | 🏗️ | all |
| 6 | `private_business` | Private Business | استثمار مشروع | `store` | 🏢 | all |
| 7 | `retirement` | Retirement | تقاعد | `hourglass` | 🏖️ | all |

> **Removed:** `investment_fees` — absorbed into `etfs_funds` aliases
> **Aliases:** 🇸🇦 gosi, جوسي · 🇪🇬 معاش, تأمينات اجتماعية

---

### 14. 💳 Debt & Obligations — الديون والالتزامات

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `credit_card_payment` | Credit Card | سداد بطاقة | `credit-card` | 💳 | all |
| 2 | `personal_loan` | Personal Loan | قرض شخصي | `hand-coins` | 🏦 | all |
| 3 | `mortgage_payment` | Mortgage Payment | قسط عقار | `house-plus` | 🏠 | all |
| 4 | `car_loan` | Car Loan | قسط سيارة | `car-front` | 🚗 | all |
| 5 | `installments_bnpl` | Installments / BNPL | تقسيط | `calendar-sync` | 🛒 | all |
| 6 | `taxes_fees` | Taxes & Fees | ضرائب ورسوم | `receipt-text` | 🏛️ | all |
| 7 | `legal_support` | Legal Fees | رسوم قانونية | `scale` | ⚖️ | all |
| 8 | `alimony_support` | Alimony / Support | نفقة | `hand-heart` | 🤝 | all |

> **Parser brands:** Tabby (تابي), Tamara (تمارا) → `installments_bnpl`

---

### 15. ✈️ Travel — السفر

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `flights` | Flights | تذاكر طيران | `plane-takeoff` | ✈️ | all |
| 2 | `hotels` | Hotels | فندق | `hotel` | 🏨 | all |
| 3 | `visa_fees` | Visa Fees | تأشيرة | `passport` | 🛂 | all |
| 4 | `travel_transport` | Travel Transport | مواصلات سفر | `train-front` | 🚐 | all |
| 5 | `travel_food` | Travel Food | أكل السفر | `utensils` | 🍜 | all |
| 6 | `travel_shopping` | Travel Shopping | مشتريات سفر | `shopping-bag` | 🎒 | all |
| 7 | `travel_insurance` | Travel Insurance | تأمين سفر | `shield-check` | 🛡️ | all |
| 8 | `hajj_umrah_trip` | Hajj / Umrah | حج وعمرة | `moon-star` | 🕋 | all |

---

### 16. 🕌 Religion / Charity / Social — الدين والصدقات والمناسبات

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `zakat` | Zakat | زكاة | `hand-coins` | 🤲 | all |
| 2 | `sadaqah` | Sadaqah / Charity | صدقة | `heart` | 💚 | all |
| 3 | `mosque_community` | Mosque / Community | مسجد وجمعية | `building` | 🕌 | all |
| 4 | `eid_social_giving` | Eid / Social Giving | عيدية | `gift` | 🌙 | all |
| 5 | `family_occasions` | Family Occasions | مناسبات | `users` | 🎊 | all |
| 6 | `funeral_support` | Funeral Support | عزاء | `flower-2` | 🌸 | all |
| 7 | `religious_courses` | Religious Courses | تحفيظ ودروس دينية | `book-heart` | 📕 | all |
| 8 | `qurbani` | Qurbani / Sacrifice | أضحية | `beef` | 🐑 | all |
| 9 | `ramadan_supplies` | Ramadan Supplies | مستلزمات رمضان | `moon-star` | 🌙 | all |

> **Arabic note:** `الدين والصدقات والمناسبات` — covers religious obligations + social duties (عيدية, مناسبات, عزاء)

---

### 17. 💼 Business / Work — مصروفات العمل

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `office_supplies` | Office Supplies | أدوات مكتبية | `paperclip` | 📎 | all |
| 2 | `software_tools` | Software & Tools | برامج وأدوات | `monitor-cog` | 💿 | all |
| 3 | `business_travel` | Business Travel | سفر عمل | `plane` | ✈️ | all |
| 4 | `marketing_ads` | Marketing & Ads | تسويق وإعلانات | `megaphone` | 📣 | all |
| 5 | `shipping_logistics` | Shipping | شحن | `truck` | 📮 | all |
| 6 | `professional_services` | Professional Services | خدمات مهنية | `users-round` | 🤝 | all |
| 7 | `coworking_office_rent` | Office Rent | إيجار مكتب | `building` | 🏢 | all |
| 8 | `internet_phone_work` | Work Phone & Internet | خط شغل | `smartphone` | 📱 | all |

> **Absorbed aliases:** adobe, creative cloud, photoshop, illustrator, microsoft, office 365 → `software_tools`

---

### 18. 🐾 Pets — حيوانات أليفة

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `pet_food` | Pet Food | أكل حيوانات | `bone` | 🦴 | all |
| 2 | `vet` | Vet | بيطري | `stethoscope` | 🩺 | all |
| 3 | `pet_supplies` | Pet Supplies | لوازم حيوانات | `package` | 📦 | all |
| 4 | `grooming` | Grooming | تجميل الحيوان | `scissors` | ✂️ | all |
| 5 | `boarding` | Boarding | إقامة حيوانات | `house` | 🏠 | all |
| 6 | `pet_toys` | Pet Toys | ألعاب حيوانات | `toy-brick` | 🧸 | all |

---

### 19. 📦 Miscellaneous — متفرقات

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `cash_withdrawal` | Cash Withdrawal | سحب نقدي | `banknote` | 💵 | all |
| 2 | `fees_commissions` | Fees & Commissions | رسوم وعمولات | `receipt` | 🧾 | all |
| 3 | `fines_penalties` | Fines & Penalties | مخالفات وغرامات | `octagon-alert` | ⚠️ | all |
| 4 | `unexpected_expense` | Unexpected Expense | مصروف مفاجئ | `triangle-alert` | ⚡ | all |
| 5 | `uncategorized` | Uncategorized | غير مصنف | `circle-help` | ❓ | all |

> **Removed:** `bank_fees` (→ `fees_commissions`), `loss_damage` (→ `unexpected_expense`), `other_misc` (→ `uncategorized`)

---

### 20. ↔️ Transfers — التحويلات

| # | Key | English | Arabic (KSA) | Icon | Emoji | Region |
|---|-----|---------|-------------|------|-------|--------|
| 1 | `between_accounts` | Between Accounts | تحويل بين الحسابات | `repeat` | 🔄 | all |
| 2 | `cash_to_bank` | Cash to Bank | إيداع نقدي | `landmark` | 🏦 | all |
| 3 | `bank_to_cash` | Bank to Cash | سحب للكاش | `wallet` | 💵 | all |
| 4 | `wallet_top_up` | Wallet Top-up | شحن محفظة | `smartphone` | 📱 | all |
| 5 | `savings_transfer` | Move to Savings | تحويل للادخار | `piggy-bank` | 🏦 | all |
| 6 | `investment_transfer` | Move to Investment | تحويل للاستثمار | `candlestick-chart` | 📈 | all |

---

## 📊 D) Summary Statistics

| Metric | Before (v1) | After (v2) |
|--------|-------------|------------|
| Parent categories | 22 | **20** |
| Total subcategories | 166 | **148** |
| Removed subcategories | — | 18 (duplicates + dead) |
| New MENA subcategories | — | +6 |
| Arabic naming fixes | — | 9 |
| Legacy compat labels | 10 | 10 (preserved) |
| Country-filtered subcategories | 0 | **5** (`gas`→egypt, `building_fees`→gulf, `security_services`→gulf, `domestic_worker`→gulf, `laundry`→gulf) |

### Removed Parent Category
- ❌ **Luxury & Status** — all 8 subcategories remapped to `shopping`, `food_dining`, `travel`, `entertainment_lifestyle`, `housing_home`

### Removed Subcategories
| Removed | Absorbed Into | Reason |
|---------|--------------|--------|
| `landline` | `mobile` aliases | Dead category |
| `vision` | `doctor_visits` aliases | Low frequency |
| `personal_care` | `beauty_grooming` aliases | Duplicate |
| `adobe` | `software_tools` aliases | Not consumer |
| `microsoft` | `software_tools` aliases | Not consumer |
| `bank_fees` | `fees_commissions` aliases | Subset |
| `loss_damage` | `unexpected_expense` aliases | Not trackable |
| `other_misc` | `uncategorized` | Exact duplicate |
| `investment_fees` | `etfs_funds` aliases | Too granular |
| `designer_fashion` | `fashion` | Luxury removed |
| `luxury_bags` | `bags_accessories` | Luxury removed |
| `watches_premium` | `watches` | Luxury removed |
| `fine_dining` | `restaurants` | Luxury removed |
| `premium_travel` | `hotels` / `flights` | Luxury removed |
| `vip_events` | `cinema_events` | Luxury removed |
| `collectibles` | `general_shopping` | Luxury removed |
| `luxury_home` | `home_decor` | Luxury removed |

---

## 🇸🇦🇪🇬 E) Country-Specific Behavior

### Region Tags Implementation

```typescript
// Add to CategoryTaxonomySubcategory interface:
regionTags?: readonly ('all' | 'gulf' | 'egypt' | 'ksa' | 'uae')[];

// Default: 'all' (shown everywhere if omitted)
// Gulf countries: SA, AE, KW, QA, BH, OM
// Egypt: EG
```

### 🇸🇦 Saudi Arabia — Special Categories

| Category | Why It Matters |
|----------|---------------|
| `domestic_worker` | SAR 1,000–3,000/month — major household expense |
| `government_services` | Absher, Qiwa, Mudad, Muqeem, Musaned daily fees |
| `building_fees` | Compound service charges, إتحاد ملاك |
| `installments_bnpl` | Tabby, Tamara are mainstream payment |
| `hajj_umrah_goal` + `hajj_umrah_trip` | Core lifecycle expenses |
| `ramadan_supplies` | Massive seasonal spend |
| `zakat` | Mandatory annual obligation |
| `laundry` | Heat + formal dress culture |

### 🇪🇬 Egypt — Special Categories & Aliases

| Category | Egypt-Specific Alias |
|----------|---------------------|
| `gas` (Bills) | Show by default (cooking gas is major expense) |
| `salary` | مرتب, ماهية |
| `allowances` | مصروف الأولاد |
| `social_outings` | فسحة, نزهة, خروجة |
| `beauty_grooming` | كوافير |
| `retirement` | معاش, تأمينات |
| `government_services` | ساهل, بوابة الحكومة, نافذة |
| `public_transport` | ميكروباص, توك توك |
| `uber_taxi` | اندريف, سويفل |
| `mobile` | فودافون, اورنج, وي, اتصالات |
| `ramadan_supplies` | عروض رمضان, مائدة رمضان |
| `laundry` | مغسلة, أوتوماتيك |

---

## ⚠️ F) Risks & Migration Notes

### Risk 1: DB Remapping for `luxury_status`
Any user with transactions tagged to `luxury_status.*` subcategories will be orphaned after removal. Required migration:

```sql
-- 029_taxonomy_cleanup.sql
UPDATE categories SET taxonomy_key = 'fashion' WHERE taxonomy_key = 'designer_fashion';
UPDATE categories SET taxonomy_key = 'bags_accessories' WHERE taxonomy_key = 'luxury_bags';
UPDATE categories SET taxonomy_key = 'watches' WHERE taxonomy_key = 'watches_premium';
UPDATE categories SET taxonomy_key = 'restaurants' WHERE taxonomy_key = 'fine_dining';
UPDATE categories SET taxonomy_key = 'hotels' WHERE taxonomy_key = 'premium_travel';
UPDATE categories SET taxonomy_key = 'cinema_events' WHERE taxonomy_key = 'vip_events';
UPDATE categories SET taxonomy_key = 'general_shopping' WHERE taxonomy_key = 'collectibles';
UPDATE categories SET taxonomy_key = 'home_decor' WHERE taxonomy_key = 'luxury_home';

-- Merge other removed subcategories
UPDATE categories SET taxonomy_key = 'beauty_grooming' WHERE taxonomy_key = 'personal_care';
UPDATE categories SET taxonomy_key = 'doctor_visits' WHERE taxonomy_key = 'vision';
UPDATE categories SET taxonomy_key = 'software_tools' WHERE taxonomy_key IN ('adobe', 'microsoft');
UPDATE categories SET taxonomy_key = 'fees_commissions' WHERE taxonomy_key = 'bank_fees';
UPDATE categories SET taxonomy_key = 'uncategorized' WHERE taxonomy_key IN ('loss_damage', 'other_misc');
UPDATE categories SET taxonomy_key = 'etfs_funds' WHERE taxonomy_key = 'investment_fees';
UPDATE categories SET taxonomy_key = 'mobile' WHERE taxonomy_key = 'landline';

-- Delete luxury_status group rows (after verifying no FK violations)
DELETE FROM category_groups WHERE taxonomy_key = 'luxury_status';
```

### Risk 2: Parser Collision `therapy_fitness` vs `sports_clubs`
Both had "gym" alias. **Already fixed** — removed "gym" from `therapy_fitness`, kept only physiotherapy terms.

### Risk 3: SUB_EMOJI Map Out of Sync
`SUB_EMOJI` in `category-service.ts` still contains entries for removed subcategories. Clean up dead keys to prevent confusion.

### Risk 4: Legacy Arabic Labels
10 backward-compat labels in `category-names.ar.ts` — keep for now. Safe to remove after verifying no user's DB still references old English labels.

---

## 🚀 G) Implementation Plan

### Phase 1 — Code Cleanup (No Migration Needed)

| # | File | Action |
|---|------|--------|
| 1 | `services/category-service.ts` | Remove dead keys from `SUB_EMOJI`: `landline`, `vision`, `personal_care`, `adobe`, `microsoft`, `bank_fees`, `loss_damage`, `other_misc`, `investment_fees`, all `luxury_*` keys. Update emoji values: `home_appliances`→`🔌`, `domestic_worker`→`🏡` |
| 2 | `constants/category-names.ar.ts` | Remove Arabic translations for all removed labels. Keep legacy compat labels. |
| 3 | `constants/category-taxonomy.ts` | Change `therapy_fitness` icon to `activity`. Change `car_rental` icon to `car-front`. |
| 4 | `types/index.ts` | Add `country_code` to user profile type if not already present |
| 5 | `constants/category-taxonomy.ts` | Add `regionTags` field to subcategories that are country-specific |

### Phase 2 — Country Selection (UI)

| # | Task |
|---|------|
| 1 | Add country picker to onboarding flow |
| 2 | Store `country_code` in user profile |
| 3 | Filter `seedDefaultCategories()` based on country's region |
| 4 | CategoryPicker respects region filtering |

### Phase 3 — DB Migration

| # | Task |
|---|------|
| 1 | Create `029_taxonomy_cleanup.sql` with all remaps above |
| 2 | Apply to staging, verify no orphaned transactions |
| 3 | Apply to production |
| 4 | Seed new subcategories (`domestic_worker`, `government_services`, `car_rental`, `elderly_care`, `laundry`, `ramadan_supplies`) for existing users |

### Phase 4 — Parser Enhancement

| # | Task |
|---|------|
| 1 | Add Egypt-specific parser aliases to `parse-transaction` edge function |
| 2 | Add Saudi government service keywords (Qiwa, Mudad, Muqeem) |
| 3 | Verify CATEGORY_HINTS keys match updated taxonomy |
| 4 | Deploy updated edge function |

---

## 📁 Files to Modify (In Order)

```
1. constants/category-taxonomy.ts          → icon fixes, regionTags
2. constants/category-names.ar.ts          → remove dead translations
3. services/category-service.ts            → clean SUB_EMOJI map
4. types/index.ts                          → country_code on profile
5. supabase/migrations/029_taxonomy_cleanup.sql → DB remaps
6. supabase/functions/parse-transaction/index.ts → Egypt aliases + KSA keywords
7. services/smart-input-service.ts         → verify alias index
8. app/onboarding/                         → country picker step
9. services/category-service.ts            → region-filtered seeding
```
