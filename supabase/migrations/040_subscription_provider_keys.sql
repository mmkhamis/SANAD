-- 040_subscription_provider_keys.sql
-- Add canonical provider keys so subscription presets can localize names
-- and logos independent of the language used when the row was created.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider_key text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_key
  ON public.subscriptions (user_id, provider_key)
  WHERE provider_key IS NOT NULL;

-- ─── Streaming ───────────────────────────────────────────────────────

UPDATE public.subscriptions
SET provider_key = 'netflix'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('netflix', 'نتفلكس');

UPDATE public.subscriptions
SET provider_key = 'shahid_vip'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('shahid', 'shahid vip', 'شاهد', 'شاهد vip');

UPDATE public.subscriptions
SET provider_key = 'disney_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('disney+', 'disney plus', 'ديزني+', 'ديزني بلس');

UPDATE public.subscriptions
SET provider_key = 'youtube_premium'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('youtube premium', 'يوتيوب بريميوم', 'يوتيوب premium');

UPDATE public.subscriptions
SET provider_key = 'prime_video'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('prime video', 'amazon prime video', 'برايم فيديو');

UPDATE public.subscriptions
SET provider_key = 'apple_tv_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('apple tv+', 'apple tv plus', 'apple tv', 'أبل تي في+', 'ابل تي في+');

UPDATE public.subscriptions
SET provider_key = 'osn_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('osn+', 'osn plus', '+osn');

UPDATE public.subscriptions
SET provider_key = 'starzplay'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('starzplay', 'starz play', 'ستارزبلاي', 'ستارز بلاي');

UPDATE public.subscriptions
SET provider_key = 'tod'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('tod', 'tod tv', 'تود');

UPDATE public.subscriptions
SET provider_key = 'stc_tv'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('stc tv', 'stctv', 'jawwy tv', 'جوّي tv', 'جوي tv');

-- ─── Music & audio ───────────────────────────────────────────────────

UPDATE public.subscriptions
SET provider_key = 'spotify'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('spotify', 'سبوتيفاي', 'سبوتفاي');

UPDATE public.subscriptions
SET provider_key = 'apple_music'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('apple music', 'أبل ميوزك', 'ابل ميوزك');

UPDATE public.subscriptions
SET provider_key = 'anghami'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('anghami', 'أنغامي', 'انغامي');

UPDATE public.subscriptions
SET provider_key = 'youtube_music'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('youtube music', 'يوتيوب ميوزك');

UPDATE public.subscriptions
SET provider_key = 'deezer'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('deezer', 'ديزر');

UPDATE public.subscriptions
SET provider_key = 'audible'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('audible', 'أوديبل', 'أودبل');

-- ─── Telecom ─────────────────────────────────────────────────────────

UPDATE public.subscriptions
SET provider_key = 'stc'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('stc', 'إس تي سي', 'اس تي سي', 'الاتصالات السعودية');

UPDATE public.subscriptions
SET provider_key = 'mobily'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('mobily', 'موبايلي', 'موبايلى');

UPDATE public.subscriptions
SET provider_key = 'zain_sa'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('zain', 'zain sa', 'زين', 'زين السعودية');

UPDATE public.subscriptions
SET provider_key = 'virgin_mobile_ksa'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('virgin mobile', 'virgin mobile ksa', 'فيرجن موبايل', 'فيرجن');

UPDATE public.subscriptions
SET provider_key = 'lebara_ksa'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('lebara', 'lebara ksa', 'ليبارا', 'ليبرا');

UPDATE public.subscriptions
SET provider_key = 'vodafone_egypt'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('vodafone egypt', 'فودافون مصر', 'فودافون');

UPDATE public.subscriptions
SET provider_key = 'orange_egypt'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('orange egypt', 'أورنج مصر', 'اورنج مصر');

UPDATE public.subscriptions
SET provider_key = 'etisalat_egypt'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('etisalat egypt', 'etisalat (e&)', 'اتصالات مصر', 'اتصالات');

UPDATE public.subscriptions
SET provider_key = 'we_egypt'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('we egypt', 'we', 'وي مصر', 'وي');

-- ─── Cloud & productivity ───────────────────────────────────────────

UPDATE public.subscriptions
SET provider_key = 'icloud_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('icloud+', 'icloud', 'icloud plus', 'آي كلاود+', 'اي كلاود', 'آيكلاود');

UPDATE public.subscriptions
SET provider_key = 'google_one'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('google one', 'googleone', 'جوجل ون', 'قوقل ون');

UPDATE public.subscriptions
SET provider_key = 'microsoft_365'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('microsoft 365', 'office 365', 'ms 365', 'مايكروسوفت 365', 'مايكروسوفت ٣٦٥');

UPDATE public.subscriptions
SET provider_key = 'notion'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('notion', 'نوشن', 'نوتشن');

UPDATE public.subscriptions
SET provider_key = 'chatgpt_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('chatgpt plus', 'chat gpt plus', 'chatgpt', 'شات جي بي تي بلس', 'شات جي بي تي', 'جي بي تي بلس');

UPDATE public.subscriptions
SET provider_key = 'canva_pro'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('canva pro', 'canva', 'كانفا برو', 'كانفا');

UPDATE public.subscriptions
SET provider_key = 'adobe_creative_cloud'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('adobe creative cloud', 'adobe cc', 'creative cloud', 'أدوبي كريتيف كلاود', 'ادوبي');

UPDATE public.subscriptions
SET provider_key = 'linkedin_premium'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('linkedin premium', 'لينكدإن بريميوم', 'لينكد ان بريميوم');

-- ─── Social ──────────────────────────────────────────────────────────

UPDATE public.subscriptions
SET provider_key = 'snapchat_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('snapchat+', 'snapchat plus', 'سناب شات+', 'سناب شات بلس', 'سناب+');

UPDATE public.subscriptions
SET provider_key = 'x_premium'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('x premium', 'x premium+', 'twitter blue', 'إكس بريميوم', 'اكس بريميوم');

UPDATE public.subscriptions
SET provider_key = 'telegram_premium'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('telegram premium', 'تيليجرام بريميوم', 'تلجرام بريميوم');

-- ─── Gaming ──────────────────────────────────────────────────────────

UPDATE public.subscriptions
SET provider_key = 'playstation_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('playstation plus', 'ps plus', 'بلايستيشن بلس', 'بلاي ستيشن بلس');

UPDATE public.subscriptions
SET provider_key = 'xbox_game_pass'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('xbox game pass', 'game pass', 'إكس بوكس جيم باس', 'جيم باس', 'قيم باس');

UPDATE public.subscriptions
SET provider_key = 'apple_arcade'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('apple arcade', 'أبل آركيد', 'ابل اركيد');

UPDATE public.subscriptions
SET provider_key = 'ea_play'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('ea play', 'إي إيه بلاي', 'اي ايه بلاي');

-- ─── Shopping, delivery, fitness, security, insurance ───────────────

UPDATE public.subscriptions
SET provider_key = 'amazon_prime'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('amazon prime', 'أمازون برايم', 'امازون برايم');

UPDATE public.subscriptions
SET provider_key = 'noon_one'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('noon one', 'نون one', 'نون ون');

UPDATE public.subscriptions
SET provider_key = 'careem_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('careem plus', 'careem+', 'كريم بلس', 'كريم+');

UPDATE public.subscriptions
SET provider_key = 'jahez'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('jahez', 'جاهز');

UPDATE public.subscriptions
SET provider_key = 'hungerstation'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('hungerstation', 'hunger station', 'هنقرستيشن', 'هنقر ستيشن');

UPDATE public.subscriptions
SET provider_key = 'talabat'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('talabat', 'طلبات');

UPDATE public.subscriptions
SET provider_key = 'fitness_time'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('fitness time', 'فتنس تايم', 'وقت اللياقة');

UPDATE public.subscriptions
SET provider_key = 'apple_fitness_plus'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('apple fitness+', 'apple fitness plus', 'أبل فتنس+', 'ابل فتنس+');

UPDATE public.subscriptions
SET provider_key = 'nordvpn'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('nordvpn', 'nord vpn', 'نورد vpn', 'نورد في بي ان');

UPDATE public.subscriptions
SET provider_key = 'expressvpn'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('expressvpn', 'express vpn', 'إكسبرس vpn', 'اكسبرس vpn');

UPDATE public.subscriptions
SET provider_key = 'tawuniya'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('tawuniya', 'التعاونية', 'التعاونية للتأمين');

UPDATE public.subscriptions
SET provider_key = 'bupa_arabia'
WHERE provider_key IS NULL
  AND lower(trim(name)) IN ('bupa arabia', 'bupa', 'بوبا العربية', 'بوبا');
