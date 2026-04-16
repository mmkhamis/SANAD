// Supabase Edge Function: parse-transaction
// Accepts raw text + optional user context (accounts, categories).
// Uses rule-based classification for bank SMS, OpenAI for everything else.

import { verifyAuth } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Rule Engine ─────────────────────────────────────────────────────

const EXPENSE_KEYWORDS = [
  'purchase', 'spent', 'paid', 'payment', 'debit', 'deducted', 'withdrawn',
  'withdrawal', 'charged', 'debited', 'pos', 'buy', 'bought', 'sale', 'bill',
  'card purchase', 'شراء', 'سحب', 'خصم', 'دفع', 'مشتريات', 'نقطة بيع',
  'حولت', 'بعت', 'ارسلت', 'دفعت', 'حوّلت',
];

const INCOME_KEYWORDS = [
  'received', 'credited', 'credit', 'deposit', 'salary', 'transfer in',
  'incoming', 'refund', 'cash back', 'cashback',
  'إيداع', 'تحويل وارد', 'راتب', 'استرداد', 'ائتمان',
  'حولي', 'حوّل لي', 'بعتلي', 'ارسل لي', 'وصلي', 'جالي',
  'حوّلي', 'ارسلي', 'بعت لي', 'ارسل لي', 'وصل لي', 'جا لي',
];

const TRANSFER_KEYWORDS = [
  'transfer to', 'transfer from', 'moved to', 'internal transfer',
  'transferred to', 'transferred from',
  'تحويل إلى', 'تحويل من', 'نقل إلى',
];

// ─── Expanded CATEGORY_HINTS: products, brands, items ────────────────

const CATEGORY_HINTS: Record<string, string> = {
  // Groceries
  'carrefour': 'Groceries', 'spinneys': 'Groceries', 'lulu': 'Groceries',
  'tamimi': 'Groceries', 'panda': 'Groceries', 'danube': 'Groceries',
  'farm': 'Groceries', 'supermarket': 'Groceries', 'grocery': 'Groceries',
  'baqala': 'Groceries', 'بقالة': 'Groceries', 'سوبر ماركت': 'Groceries',
  'hypermarket': 'Groceries', 'hyper': 'Groceries',
  'seoudi': 'Groceries', 'kazyon': 'Groceries', // Egypt
  'oscar': 'Groceries', 'metro market': 'Groceries', // Egypt

  // Restaurants & Dining
  'restaurant': 'Food & Dining', 'cafe': 'Food & Dining', 'coffee': 'Food & Dining',
  'starbucks': 'Food & Dining', 'mcdonalds': 'Food & Dining', 'kfc': 'Food & Dining',
  'pizza': 'Food & Dining', 'burger': 'Food & Dining', 'food': 'Food & Dining',
  'lunch': 'Food & Dining', 'dinner': 'Food & Dining', 'breakfast': 'Food & Dining',
  'sushi': 'Food & Dining', 'shawarma': 'Food & Dining', 'falafel': 'Food & Dining',
  'مطعم': 'Food & Dining', 'كافيه': 'Food & Dining', 'غداء': 'Food & Dining',
  'عشاء': 'Food & Dining', 'فطور': 'Food & Dining',
  'subway': 'Food & Dining', 'hardees': 'Food & Dining', 'popeyes': 'Food & Dining',
  'dominos': 'Food & Dining', 'zaatar w zeit': 'Food & Dining',
  'chilis': 'Food & Dining', 'applebees': 'Food & Dining', 'nandos': 'Food & Dining',
  'tim hortons': 'Food & Dining', 'costa': 'Food & Dining', 'dunkin': 'Food & Dining',

  // Snacks & Sweets
  'chips': 'Snacks & Sweets', 'lays': 'Snacks & Sweets', 'doritos': 'Snacks & Sweets',
  'chocolate': 'Snacks & Sweets', 'candy': 'Snacks & Sweets', 'gum': 'Snacks & Sweets',
  'ice cream': 'Snacks & Sweets', 'dessert': 'Snacks & Sweets',
  'snack': 'Snacks & Sweets', 'sweets': 'Snacks & Sweets',
  'شيبسي': 'Snacks & Sweets', 'شوكولاتة': 'Snacks & Sweets',
  'ايس كريم': 'Snacks & Sweets', 'حلويات': 'Snacks & Sweets',

  // Water & Beverages
  'pepsi': 'Water & Beverages', 'coca cola': 'Water & Beverages', 'coke': 'Water & Beverages',
  'cola': 'Water & Beverages', 'sprite': 'Water & Beverages', 'fanta': 'Water & Beverages',
  'miranda': 'Water & Beverages', 'mountain dew': 'Water & Beverages',
  'redbull': 'Water & Beverages', 'red bull': 'Water & Beverages',
  'juice': 'Water & Beverages', 'water bottle': 'Water & Beverages',
  'بيبسي': 'Water & Beverages', 'كولا': 'Water & Beverages',
  'عصير': 'Water & Beverages', 'مشروبات': 'Water & Beverages',
  'tea': 'Water & Beverages', 'شاي': 'Water & Beverages',
  'energy drink': 'Water & Beverages',
  'شاملة': 'Water & Beverages', 'قلون': 'Water & Beverages', // KSA water delivery

  // Food Delivery — KSA-first, Egypt compat
  'talabat': 'Food Delivery', 'hungerstation': 'Food Delivery',
  'deliveroo': 'Food Delivery', 'jahez': 'Food Delivery',
  'marsool': 'Food Delivery', 'مرسول': 'Food Delivery',
  'طلبات': 'Food Delivery', 'هنقرستيشن': 'Food Delivery',
  'delivery': 'Food Delivery', 'توصيل': 'Food Delivery',
  'otlob': 'Food Delivery', 'elmenus': 'Food Delivery', // Egypt
  'breadfast': 'Food Delivery', 'rabbit': 'Food Delivery', // Egypt grocery delivery

  // Transport
  'uber': 'Transport', 'careem': 'Transport', 'taxi': 'Transport',
  'fuel': 'Transport', 'petrol': 'Transport', 'gas station': 'Transport',
  'parking': 'Transport', 'bus': 'Transport', 'metro': 'Transport',
  'بنزين': 'Transport', 'وقود': 'Transport', 'كريم': 'Transport',
  'اوبر': 'Transport', 'تاكسي': 'Transport',
  'indriver': 'Transport', 'اندريف': 'Transport', // Egypt
  'swvl': 'Transport', 'سويفل': 'Transport', // Egypt
  'ميكروباص': 'Transport', 'توك توك': 'Transport', // Egypt
  'darb': 'Transport', 'salik': 'Transport', // KSA/UAE tolls
  'car rental': 'Car Rental', 'rent a car': 'Car Rental', 'udrive': 'Car Rental',
  'ekar': 'Car Rental', 'theeb': 'Car Rental', 'تأجير سيارة': 'Car Rental',

  // Shopping
  'amazon': 'Shopping', 'noon': 'Shopping', 'shein': 'Shopping', 'zara': 'Shopping',
  'ikea': 'Shopping', 'mall': 'Shopping', 'shop': 'Shopping',
  'h&m': 'Shopping', 'nike': 'Shopping', 'adidas': 'Shopping',
  'jarir': 'Shopping', 'extra': 'Shopping',
  'centrepoint': 'Shopping', 'splash': 'Shopping', 'max': 'Shopping',
  'namshi': 'Shopping', 'ounass': 'Shopping', 'سوق': 'Shopping',
  'مشتريات': 'Shopping', 'تسوق': 'Shopping',
  'clothes': 'Shopping', 'shoes': 'Shopping', 'ملابس': 'Shopping',

  // Health & Medical
  'pharmacy': 'Health & Medical', 'hospital': 'Health & Medical', 'clinic': 'Health & Medical',
  'doctor': 'Health & Medical', 'medical': 'Health & Medical', 'medicine': 'Health & Medical',
  'drug': 'Health & Medical', 'صيدلية': 'Health & Medical', 'مستشفى': 'Health & Medical',
  'دكتور': 'Health & Medical', 'علاج': 'Health & Medical', 'دواء': 'Health & Medical',

  // Entertainment & Lifestyle
  'cinema': 'Entertainment & Lifestyle', 'movie': 'Entertainment & Lifestyle',
  'game': 'Entertainment & Lifestyle', 'playstation': 'Entertainment & Lifestyle',
  'ps5': 'Entertainment & Lifestyle', 'xbox': 'Entertainment & Lifestyle',
  'steam': 'Entertainment & Lifestyle',
  'طلعة': 'Entertainment & Lifestyle', 'فسحة': 'Entertainment & Lifestyle', // KSA social outings

  // Subscriptions & Digital
  'netflix': 'Subscriptions & Digital', 'spotify': 'Subscriptions & Digital',
  'youtube': 'Subscriptions & Digital', 'disney': 'Subscriptions & Digital',
  'shahid': 'Subscriptions & Digital', 'anghami': 'Subscriptions & Digital',
  'subscription': 'Subscriptions & Digital', 'icloud': 'Subscriptions & Digital',
  'google one': 'Subscriptions & Digital', 'chatgpt': 'Subscriptions & Digital',
  'openai': 'Subscriptions & Digital', 'vpn': 'Subscriptions & Digital',
  'adobe': 'Software & Tools', 'creative cloud': 'Software & Tools',
  'microsoft 365': 'Software & Tools', 'office 365': 'Software & Tools',

  // Installments / BNPL — KSA-first
  'tabby': 'Installments / BNPL', 'tamara': 'Installments / BNPL',
  'bnpl': 'Installments / BNPL', 'تقسيط': 'Installments / BNPL',
  'تابي': 'Installments / BNPL', 'تمارا': 'Installments / BNPL',

  // Bills & Utilities — Telecom
  'stc': 'Bills & Utilities', 'mobily': 'Bills & Utilities', 'zain': 'Bills & Utilities',
  'etisalat': 'Bills & Utilities', 'vodafone': 'Bills & Utilities', 'orange': 'Bills & Utilities',
  'we': 'Bills & Utilities', 'اتصالات': 'Bills & Utilities', 'شحن': 'Bills & Utilities',
  'absher': 'Government Services', 'sahel': 'Government Services',
  'baladiya': 'Government Services', 'خدمات حكومية': 'Government Services',
  'qiwa': 'Government Services', 'mudad': 'Government Services',
  'muqeem': 'Government Services', 'musaned': 'Government Services',
  'nafath': 'Government Services', 'ajeer': 'Government Services',
  'tawakkalna': 'Government Services', 'etimad': 'Government Services',
  'قوى': 'Government Services', 'مدد': 'Government Services',
  'مقيم': 'Government Services', 'مساند': 'Government Services',
  'أبشر': 'Government Services', 'بلدية': 'Government Services',
  'نفاذ': 'Government Services', 'توكلنا': 'Government Services',
  'ساهل': 'Government Services', 'نافذة': 'Government Services', // Egypt
  'fawry': 'Government Services', 'فوري': 'Government Services', // Egypt payments

  // Housing & Home
  'rent': 'Housing & Home', 'electricity': 'Electricity', 'water bill': 'Water',
  'إيجار': 'Housing & Home', 'كهرباء': 'Electricity', 'مياه': 'Water',
  'maid': 'Domestic Worker', 'housekeeper': 'Domestic Worker', 'عمالة منزلية': 'Domestic Worker',

  // Education
  'university': 'Education', 'school': 'Education', 'course': 'Education',
  'tuition': 'Education', 'books': 'Education', 'udemy': 'Education',
  'coursera': 'Education', 'جامعة': 'Education', 'مدرسة': 'Education',
  'كورس': 'Education', 'دورة': 'Education',

  // Income
  'salary': 'Salary', 'freelance': 'Freelance', 'bonus': 'Bonus',
  'راتب': 'Salary', 'مكافأة': 'Bonus',

  // Beauty & Grooming
  'haircut': 'Beauty & Grooming', 'barber': 'Beauty & Grooming', 'salon': 'Beauty & Grooming',
  'spa': 'Beauty & Grooming', 'skincare': 'Beauty & Grooming', 'nail': 'Beauty & Grooming',
  'حلاق': 'Beauty & Grooming', 'صالون': 'Beauty & Grooming',
  'كوافير': 'Beauty & Grooming', // Egypt dialect

  // Sports & Gym (distinct from Beauty & Grooming)
  'gym': 'Sports Clubs', 'fitness': 'Sports Clubs', 'sports club': 'Sports Clubs',
  'جيم': 'Sports Clubs', 'نادي رياضي': 'Sports Clubs',

  // Laundry
  'laundry': 'Laundry & Dry Clean', 'dry clean': 'Laundry & Dry Clean',
  'مغسلة': 'Laundry & Dry Clean', 'غسيل': 'Laundry & Dry Clean',

  // Religion / Charity / Social
  'charity': 'Religion / Charity / Social Duties', 'donation': 'Religion / Charity / Social Duties',
  'zakat': 'Religion / Charity / Social Duties', 'زكاة': 'Religion / Charity / Social Duties',
  'صدقة': 'Religion / Charity / Social Duties', 'تبرع': 'Religion / Charity / Social Duties',
  'ramadan': 'Ramadan Supplies', 'iftar': 'Ramadan Supplies',
  'رمضان': 'Ramadan Supplies', 'إفطار': 'Ramadan Supplies',
};

const CURRENCY_SYMBOLS = [
  'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD',
  'USD', 'EUR', 'GBP', 'LE', 'ج.م', 'ر.س', 'د.إ',
];

// Words that should never be captured as merchant names
const NON_MERCHANT_WORDS = new Set([
  'my', 'account', 'bank', 'card', 'wallet', 'cash', 'balance', 'from', 'to',
  'the', 'a', 'an', 'by', 'for', 'with', 'on', 'in', 'at', 'of',
  'حسابي', 'بطاقتي', 'محفظتي', 'كاش', 'نقد', 'بنك',
]);

interface RuleResult {
  amount: number | null;
  currency: string | null;
  transaction_type: 'income' | 'expense' | 'transfer';
  category: string | null;
  merchant: string | null;
  counterparty: string | null;
  confidence: number;
  needs_review: boolean;
}

/**
 * Check if text looks like a formal bank SMS (vs natural language).
 */
function isBankSMS(text: string): boolean {
  const lower = text.toLowerCase();
  const bankIndicators = [
    'تم إضافة', 'تم اضافة', 'تم خصم', 'تم إرسال', 'تم ارسال',
    'تم الدفع', 'تم السحب', 'تم سحب', 'تم استلام', 'تم ايداع', 'تم إيداع',
    'بطاقتكم', 'حسابكم', 'بطاقتك', 'حسابك',
    'رقم العملية', 'رقم المرجع', 'ref#', 'ref:', 'trx', 'transaction id',
    'pos purchase', 'card purchase', 'atm withdrawal', 'online purchase',
  ];
  return bankIndicators.some((ind) => lower.includes(ind));
}

function runRuleEngine(text: string): RuleResult {
  const lower = text.toLowerCase();

  // Extract amount
  const currencyPattern = CURRENCY_SYMBOLS.map((s) => s.replace(/\./g, '\\.')).join('|');
  const amountPatterns = [
    new RegExp(`(?:${currencyPattern})\\s*([\\d,]+\\.?\\d*)`, 'i'),
    new RegExp(`([\\d,]+\\.?\\d*)\\s*(?:${currencyPattern})`, 'i'),
    /(?:amount|مبلغ|قيمة)[:\s]*([\d,]+\.?\d*)/i,
    /(?:by|for|=|ب|بـ)\s*([\d,]+\.?\d*)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/,
  ];

  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) { amount = num; break; }
    }
  }

  // Extract currency
  let currency: string | null = null;
  for (const sym of CURRENCY_SYMBOLS) {
    if (lower.includes(sym.toLowerCase())) { currency = sym; break; }
  }

  // Detect type
  let transaction_type: 'income' | 'expense' | 'transfer' = 'expense';
  let typeScore = 0;
  let counterparty: string | null = null;

  // 1. Arabic bank SMS incoming patterns
  const arabicBankIncoming = ['تم إضافة', 'تم اضافة', 'تم استلام', 'تم ايداع', 'تم إيداع'];
  const arabicBankOutgoing = ['تم خصم', 'تم إرسال', 'تم ارسال', 'تم الدفع', 'تم السحب', 'تم سحب'];
  const arabicIncomingContext = ['لبطاقتكم', 'لبطاقتك', 'لحسابكم', 'لحسابك', 'إلى بطاقتكم', 'الى بطاقتكم', 'إلى حسابكم', 'الى حسابكم'];
  const arabicOutgoingContext = ['من حسابكم', 'من حسابك', 'من بطاقتكم', 'من بطاقتك'];

  for (const kw of arabicBankIncoming) {
    if (lower.includes(kw)) { transaction_type = 'income'; typeScore = 0.95; break; }
  }
  if (typeScore === 0) {
    for (const kw of arabicBankOutgoing) {
      if (lower.includes(kw)) { transaction_type = 'expense'; typeScore = 0.95; break; }
    }
  }
  if (typeScore === 0) {
    for (const kw of arabicIncomingContext) {
      if (lower.includes(kw)) { transaction_type = 'income'; typeScore = 0.9; break; }
    }
  }
  if (typeScore === 0) {
    for (const kw of arabicOutgoingContext) {
      if (lower.includes(kw)) { transaction_type = 'expense'; typeScore = 0.9; break; }
    }
  }

  // 2. Extract counterparty from bank SMS based on direction
  if (transaction_type === 'income' && typeScore >= 0.9) {
    const cpMatch = text.match(
      /من\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم|خلال)([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.]{2,50}?)(?:\s+رقم|\s+يوم|\s+بتاريخ|\s+في\b|\s*$)/,
    );
    counterparty = cpMatch?.[1]?.trim() ?? null;
  } else if (transaction_type === 'expense' && typeScore >= 0.9) {
    const cpMatch = text.match(
      /(?:إلى|الى)\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم)([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.]{2,50}?)(?:\s+رقم|\s+يوم|\s+بتاريخ|\s+في\b|\s*$)/,
    );
    counterparty = cpMatch?.[1]?.trim() ?? null;
  }

  // 3. Arabic personal income verbs
  const arabicIncomePatterns = ['حولي', 'حوّل لي', 'حوّلي', 'بعتلي', 'بعت لي', 'ارسل لي', 'ارسلي', 'وصلي', 'وصل لي', 'جالي', 'جا لي'];
  if (typeScore === 0) {
    for (const kw of arabicIncomePatterns) {
      if (lower.includes(kw)) { transaction_type = 'income'; typeScore = 0.9; break; }
    }
  }

  // 4. Generic keyword layers
  if (typeScore === 0) {
    for (const kw of TRANSFER_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) { transaction_type = 'transfer'; typeScore = 0.9; break; }
    }
  }
  if (typeScore === 0) {
    for (const kw of INCOME_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) { transaction_type = 'income'; typeScore = 0.85; break; }
    }
  }
  if (typeScore === 0) {
    for (const kw of EXPENSE_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) { transaction_type = 'expense'; typeScore = 0.85; break; }
    }
  }

  // Detect merchant — skip account-related words
  const merchantPatterns = [
    /(?:at|from|to|عند|في|لدى|إلى)\s+([A-Za-z0-9\s&'._-]{2,40}?)(?:\s+on|\s+ref|\s*\.|\s*$)/i,
    /(?:merchant|store|shop|التاجر)[:\s]+([A-Za-z0-9\s&'._-]{2,40})/i,
  ];
  let merchant: string | null = null;
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const m = match[1].trim();
      const words = m.toLowerCase().split(/\s+/);
      const nonMerchantCount = words.filter((w) => NON_MERCHANT_WORDS.has(w)).length;
      if (m.length >= 2 && !/^\d+$/.test(m) && nonMerchantCount < words.length) {
        merchant = m;
        break;
      }
    }
  }

  // Detect category — sort by keyword length descending (longer matches win)
  let category: string | null = null;
  const sortedHints = Object.entries(CATEGORY_HINTS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, cat] of sortedHints) {
    if (lower.includes(keyword.toLowerCase())) { category = cat; break; }
  }

  // Compute confidence
  let confidence = 0.3;
  if (amount && amount > 0) confidence += 0.25;
  if (typeScore > 0) confidence += 0.2;
  if (merchant) confidence += 0.15;
  if (category) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  return {
    amount,
    currency,
    transaction_type,
    category,
    merchant: counterparty ? null : merchant,
    counterparty,
    confidence: Math.round(confidence * 100) / 100,
    needs_review: confidence < 0.7,
  };
}

// ─── OpenAI with User Context ────────────────────────────────────────

interface UserAccount {
  id: string;
  name: string;
  type: string;
}

interface UserCategory {
  id: string;
  name: string;
  type: string;
}

interface LLMResult {
  amount: number;
  currency: string;
  transaction_type: 'income' | 'expense' | 'transfer';
  category: string;
  merchant: string | null;
  counterparty: string | null;
  account_name: string | null;
  confidence: number;
  needs_review: boolean;
  description: string | null;
}

interface LLMMultiResult {
  transactions: LLMResult[];
}

function buildSystemPrompt(
  accounts: UserAccount[],
  categories: UserCategory[],
): string {
  const accountsList = accounts.length > 0
    ? accounts.map((a) => `  - "${a.name}" (type: ${a.type})`).join('\n')
    : '  (no accounts provided)';

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const expenseCatList = expenseCategories.length > 0
    ? expenseCategories.map((c) => `"${c.name}"`).join(', ')
    : 'Groceries, Food & Dining, Shopping, Transport, Health & Medical, Entertainment & Lifestyle, Subscriptions & Digital, Education, Housing & Home, Bills & Utilities, Beauty & Grooming, Religion / Charity / Social Duties, Miscellaneous';

  const incomeCatList = incomeCategories.length > 0
    ? incomeCategories.map((c) => `"${c.name}"`).join(', ')
    : 'Salary, Freelance, Bonus, Business, Investment Returns, Gifts, Other Income';

  return `You are a smart financial transaction parser for a personal finance app.
Parse the user's natural language input into structured transaction data.

USER'S ACCOUNTS:
${accountsList}

USER'S EXPENSE CATEGORIES: ${expenseCatList}
USER'S INCOME CATEGORIES: ${incomeCatList}

RULES:
1. Extract EACH transaction mentioned. The input may describe ONE or MULTIPLE transactions.
2. For each transaction return:
   - "amount": the monetary amount as a number
   - "currency": currency code (EGP, SAR, USD, etc.) — infer from context if not explicit
   - "transaction_type": "income", "expense", or "transfer"
   - "category": MUST match one of the user's categories listed above. Pick the BEST match.
     * Food/drink items (Pepsi, chips, chocolate, etc.) → beverage/snack or food category
     * Store purchases → match by store type (Amazon=Shopping, pharmacy=Healthcare)
     * Be smart: infer category from product names, merchant names, context clues
   - "merchant": the store/business name if mentioned. NOT the user's bank account name.
   - "counterparty": person name for P2P transfers
   - "account_name": if the user mentions which account to use (e.g. "from my bank", "from cash", "from Bank Account"), return the MATCHING account name from the list above. If unclear, return null.
   - "description": a clean, short description (e.g. "Pepsi purchase", "Lunch at McDonalds")
   - "confidence": 0 to 1
   - "needs_review": true if uncertain

3. CRITICAL PARSING RULES:
   - "bought X from Y by Z" → X is the item (use for category), "from Y" may reference the account, Z is the amount
   - "bought Pepsi from my account by 25" → description="Pepsi", category=beverage/snack, amount=25, account_name=infer from user's accounts
   - "bought coffee from Starbucks" → merchant="Starbucks", category=dining/coffee
   - "paid 100 from bank account" → account_name=match to user's bank account
   - Do NOT use the user's account name as a merchant. "from my account"/"from bank"/"from cash" = SOURCE ACCOUNT.

4. Arabic bank SMS:
   - "تم إضافة" = income, "تم خصم" = expense
   - "لبطاقتكم"/"لحسابكم" = incoming
   - "من حسابكم"/"من بطاقتكم" = outgoing

5. Arabic casual verbs:
   - "حولي", "حوّل لي", "وصلي" = income
   - "حولت", "دفعت", "ارسلت" = expense

Return JSON only:
{
  "transactions": [
    {
      "amount": number,
      "currency": "string",
      "transaction_type": "income" | "expense" | "transfer",
      "category": "string",
      "merchant": string | null,
      "counterparty": string | null,
      "account_name": string | null,
      "description": "string",
      "confidence": number,
      "needs_review": boolean
    }
  ]
}`;
}

async function callOpenAI(
  text: string,
  ruleResult: RuleResult,
  accounts: UserAccount[],
  categories: UserCategory[],
): Promise<LLMResult[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const systemPrompt = buildSystemPrompt(accounts, categories);

  const hints: string[] = [];
  if (ruleResult.amount) hints.push(`Amount: ${ruleResult.amount}`);
  if (ruleResult.transaction_type) hints.push(`Type hint: ${ruleResult.transaction_type}`);
  if (ruleResult.category) hints.push(`Category hint: ${ruleResult.category}`);
  if (ruleResult.currency) hints.push(`Currency hint: ${ruleResult.currency}`);
  if (ruleResult.merchant) hints.push(`Merchant hint: ${ruleResult.merchant}`);

  const userPrompt = `Parse this financial input:\n"${text}"${hints.length > 0 ? `\n\nPre-extracted hints:\n${hints.join('\n')}` : ''}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');

  let parsed: LLMMultiResult | LLMResult;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse OpenAI response as JSON');
  }

  const items: LLMResult[] = 'transactions' in parsed && Array.isArray((parsed as LLMMultiResult).transactions)
    ? (parsed as LLMMultiResult).transactions
    : [parsed as LLMResult];

  const validTypes = ['income', 'expense', 'transfer'];
  for (const item of items) {
    if (!validTypes.includes(item.transaction_type)) {
      item.transaction_type = 'expense';
      item.needs_review = true;
    }
    if (typeof item.amount !== 'number' || item.amount <= 0) {
      item.needs_review = true;
    }
    item.confidence = Math.min(Math.max(item.confidence ?? 0.5, 0), 1);
    item.needs_review = item.needs_review || item.confidence < 0.7;
  }

  return items;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildDescription(
  txType: 'income' | 'expense' | 'transfer',
  merchant: string | null,
  counterparty: string | null,
  aiDescription: string | null,
): string {
  if (aiDescription && aiDescription.length > 0) return aiDescription;
  const person = counterparty || merchant;
  if (person) {
    if (txType === 'income') return `Received from ${person}`;
    if (txType === 'transfer') return `Transfer to ${person}`;
    return `Payment to ${person}`;
  }
  if (txType === 'income') return 'Incoming payment';
  if (txType === 'transfer') return 'Internal transfer';
  return 'Payment';
}

// ─── Main Handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json() as {
      text: string;
      accounts?: UserAccount[];
      categories?: UserCategory[];
    };
    const { text, accounts = [], categories = [] } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Input text is required (min 3 characters)' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const sanitized = text.trim().slice(0, 2000);
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Run rule engine
    const ruleResult = runRuleEngine(sanitized);

    // Step 2: For bank SMS with high confidence, skip AI
    const bankSMS = isBankSMS(sanitized);
    if (bankSMS && ruleResult.confidence >= 0.8 && ruleResult.amount !== null) {
      const result = {
        ...ruleResult,
        account_name: null as string | null,
        source: 'rules' as const,
        date: today,
        description: buildDescription(ruleResult.transaction_type, ruleResult.merchant, ruleResult.counterparty, null),
      };
      return new Response(
        JSON.stringify({ transactions: [result] }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Step 3: Use AI for all other inputs (natural language, voice, OCR text)
    try {
      const llmResults = await callOpenAI(sanitized, ruleResult, accounts, categories);
      const transactions = llmResults.map((item) => ({
        ...item,
        source: 'ai' as const,
        date: today,
        description: buildDescription(item.transaction_type, item.merchant, item.counterparty, item.description),
      }));
      return new Response(
        JSON.stringify({ transactions }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    } catch {
      // AI failed — return rule-engine result as fallback
      const result = {
        ...ruleResult,
        account_name: null as string | null,
        source: 'rules-fallback' as const,
        date: today,
        description: buildDescription(ruleResult.transaction_type, ruleResult.merchant, ruleResult.counterparty, null),
        needs_review: true,
      };
      return new Response(
        JSON.stringify({ transactions: [result] }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
