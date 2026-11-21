// @ts-nocheck
// Shared code for VozIt's chat-bot intake channels (Telegram now, WhatsApp
// later) — reporters in areas where the website/app is impractical (conflict
// zones, low bandwidth, confiscation risk) submit a report entirely through
// a chat conversation instead.
//
// This mirrors the real submission pipeline already used by /api/reports —
// same status values ('processing'/'published'/'flagged'/'removed', per the
// live reports_status_check constraint — there is no 'pending_review' status
// in this schema), same text-moderation call, same NOT-NULL fallbacks. It
// does NOT invent a human review queue: hive-moderation.ts is explicit that
// VozIt deliberately has no such queue (a one-person operation can't keep one
// cleared), so a bot-submitted report is auto-published/flagged/removed by
// the same automated rules as a website upload, and rides the exact same
// Mux-webhook pipeline (AI 5W analysis, video moderation, watermarking,
// auto-distribution) once its video finishes processing — none of that is
// reimplemented here.

import { createAdminClient } from './supabase-server'
import { sanitizeInput } from './security'
import { moderateContent, logModerationResult } from './hive-moderation'
import { createMuxUpload } from './mux'
import { captureError } from './monitoring'

export type BotLanguage = 'en' | 'es' | 'ar' | 'fr' | 'uk' | 'pt' | 'sw' | 'ru' | 'id' | 'fa'

export const LANGUAGE_NAMES: Record<BotLanguage, string> = {
  en: 'English', es: 'Español', ar: 'العربية', fr: 'Français',
  uk: 'Українська', pt: 'Português', sw: 'Kiswahili',
  ru: 'Русский', id: 'Bahasa Indonesia', fa: 'فارسی',
}

// ── MESSAGE TEMPLATES ────────────────────────────────────────────
// Every template is a function of nothing but the language, so the webhook
// just picks the right language bucket once per chat and calls these the
// same way regardless of which language that turns out to be.

export const T: Record<BotLanguage, Record<string, string>> = {
  en: {
    chooseLanguage: '🌐 Language? Reply with a number:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Welcome to VozIt! — "I was there..."

📎 IMPORTANT: Send your video as a FILE, not as a video message.
Tap the paperclip icon → File → select your video.
This preserves the original quality and location data for verification.
💡 Tip: if your camera lets you choose, record at 720p (HD) instead of 1080p or 4K — a 61–90 second clip at full resolution is usually too big to send as a File; 720p stays under the limit.

📋 SUBMISSION GUIDELINES:
• Video must be 61–90 seconds
• Follow the 5Ws format:
  WHO — Who is involved?
  WHAT — What is happening?
  WHERE — Where are you?
  WHEN — When did this start?
  WHY — Why is this happening?
• End with: "I was there" — your name, your city

To publish and earn revenue, I need to set up your account.
What is your name?`,
    askUsername: 'Got it. What username would you like on VozIt? (letters, numbers, underscores — this is public)',
    askEmail: 'And an email address, for your account and payouts?',
    accountCreated: (username: string, link: string) => `✅ Account created! Username: @${username}.\n\n💰 Set up payouts here (your personal link): ${link}\n\nYou can always get a fresh payouts link by typing /payouts, or your settings link by typing /profile.`,
    accountCreateFailed: "I couldn't create your account just now — please try again in a moment, or sign up at vozit.net instead.",
    returningGreeting: (username: string) => `Got it, @${username}! 🎥 Processing your report.`,
    askDescription: "What's happening? (brief description)",
    tooShort: (secs: number) => `Your video is ${secs} seconds. VozIt reports must be 61–90 seconds. Please resubmit.`,
    tooLong: (secs: number) => `Your video is ${secs} seconds. Please trim to 61–90 seconds and resubmit.`,
    sentAsVideoWarning: '⚠️ You sent this as a video message, which removes location data. Next time tap paperclip → File for better verification.',
    fileTooLarge: "That file is too large for me to download directly (Telegram limits bots to 20MB files). A few fixes: record at a lower resolution next time (720p instead of 1080p/4K), compress this video using your phone's built-in share/compress option, or send it as a video message instead (smaller, but loses location data) — or submit at vozit.net instead.",
    askLocation: '📍 Share your location: tap the paperclip → Location → Send My Current Location.\nThis proves you were at the scene and strengthens your credibility score.',
    askWhen: '🕐 When did you record this video? (example: today 2pm, yesterday morning)',
    credibilityTip: '💡 Tip: sharing your location adds credibility and increases your earnings potential.',
    processing: 'Thanks — your report is being processed. You\'ll see it on your VozIt profile once it\'s live.',
    reportFlagged: 'Your report was submitted but flagged for review by our automated moderation — it won\'t be public yet. You can check its status at vozit.net.',
    reportRemoved: "Your report couldn't be published — it was flagged by our content moderation. If you think this is wrong, visit vozit.net for help.",
    genericError: "Something went wrong on my end — please try again, or submit at vozit.net instead.",
    noVideoYet: "Send me your video whenever you're ready — as a FILE (paperclip → File), not a video message.",
    payoutsLinkMsg: (link: string) => `💰 Here's your private payouts link: ${link}\n\nThis link is just for you and works for a little while — if it stops working, just type /payouts again for a new one.`,
    settingsLinkMsg: (link: string) => `⚙️ Here's your private settings link: ${link}\n\nThis link is just for you and works for a little while — if it stops working, just type /profile again for a new one.`,
    linkGenFailed: "I couldn't generate your link just now — please try again in a moment.",
  },
  es: {
    chooseLanguage: '🌐 ¿Idioma? Responde con un número:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Bienvenido a VozIt! — "Yo estuve allí..."

📎 IMPORTANTE: Envía tu video como ARCHIVO, no como mensaje de video.
Toca el clip → Archivo → selecciona tu video.
Esto conserva la calidad original y los datos de ubicación para la verificación.
💡 Consejo: si tu cámara te lo permite, graba en 720p (HD) en vez de 1080p o 4K — un clip de 61–90 segundos a resolución completa suele ser demasiado grande para enviarlo como Archivo; 720p se mantiene dentro del límite.

📋 REQUISITOS DE ENVÍO:
• El video debe durar entre 61 y 90 segundos
• Sigue el formato de las 5W:
  QUIÉN — ¿Quién está involucrado?
  QUÉ — ¿Qué está pasando?
  DÓNDE — ¿Dónde estás?
  CUÁNDO — ¿Cuándo comenzó?
  POR QUÉ — ¿Por qué está pasando esto?
• Termina con: "Yo estuve allí" — tu nombre, tu ciudad

Para publicar y ganar dinero, necesito crear tu cuenta.
¿Cuál es tu nombre?`,
    askUsername: 'Gracias. ¿Qué nombre de usuario quieres en VozIt? (letras, números, guiones bajos — esto es público)',
    askEmail: '¿Y un correo electrónico, para tu cuenta y tus pagos?',
    accountCreated: (username: string, link: string) => `✅ ¡Cuenta creada! Usuario: @${username}.\n\n💰 Configura tus pagos aquí (tu enlace personal): ${link}\n\nSiempre puedes obtener un nuevo enlace de pagos escribiendo /payouts, o tu enlace de ajustes escribiendo /profile.`,
    accountCreateFailed: 'No pude crear tu cuenta en este momento — intenta de nuevo en un momento, o regístrate en vozit.net.',
    returningGreeting: (username: string) => `¡Entendido, @${username}! 🎥 Procesando tu reporte.`,
    askDescription: '¿Qué está pasando? (descripción breve)',
    tooShort: (secs: number) => `Tu video dura ${secs} segundos. Los reportes de VozIt deben durar entre 61 y 90 segundos. Por favor, vuelve a enviarlo.`,
    tooLong: (secs: number) => `Tu video dura ${secs} segundos. Recórtalo a 61–90 segundos y vuelve a enviarlo.`,
    sentAsVideoWarning: '⚠️ Enviaste esto como mensaje de video, lo que elimina los datos de ubicación. La próxima vez toca el clip → Archivo para una mejor verificación.',
    fileTooLarge: 'Ese archivo es demasiado grande para descargarlo directamente (Telegram limita a los bots a 20MB). Algunas soluciones: graba en una resolución más baja la próxima vez (720p en vez de 1080p/4K), comprime este video con la opción de compartir/comprimir de tu teléfono, o envíalo como mensaje de video (más pequeño, pero pierde los datos de ubicación) — o envíalo en vozit.net.',
    askLocation: '📍 Comparte tu ubicación: toca el clip → Ubicación → Enviar mi ubicación actual.\nEsto demuestra que estuviste en el lugar y mejora tu puntaje de credibilidad.',
    askWhen: '🕐 ¿Cuándo grabaste este video? (ejemplo: hoy a las 2pm, ayer por la mañana)',
    credibilityTip: '💡 Consejo: compartir tu ubicación aumenta tu credibilidad y tu potencial de ganancias.',
    processing: 'Gracias — tu reporte se está procesando. Lo verás en tu perfil de VozIt una vez publicado.',
    reportFlagged: 'Tu reporte fue enviado pero marcado para revisión por nuestra moderación automática — aún no será público. Puedes consultar su estado en vozit.net.',
    reportRemoved: 'Tu reporte no pudo publicarse — fue marcado por nuestra moderación de contenido. Si crees que esto es un error, visita vozit.net para obtener ayuda.',
    genericError: 'Algo salió mal de mi lado — intenta de nuevo, o envíalo en vozit.net.',
    noVideoYet: 'Envíame tu video cuando estés listo — como ARCHIVO (clip → Archivo), no como mensaje de video.',
    payoutsLinkMsg: (link: string) => `💰 Aquí tienes tu enlace privado de pagos: ${link}\n\nEste enlace es solo para ti y funciona por un tiempo limitado — si deja de funcionar, escribe /payouts de nuevo para obtener uno nuevo.`,
    settingsLinkMsg: (link: string) => `⚙️ Aquí tienes tu enlace privado de ajustes: ${link}\n\nEste enlace es solo para ti y funciona por un tiempo limitado — si deja de funcionar, escribe /profile de nuevo para obtener uno nuevo.`,
    linkGenFailed: 'No pude generar tu enlace en este momento — intenta de nuevo en un momento.',
  },
  ar: {
    chooseLanguage: '🌐 اللغة؟ الرجاء الرد برقم:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`مرحبًا بك في VozIt! — "كنت هناك..."

📎 مهم: أرسل الفيديو كملف، وليس كرسالة فيديو.
اضغط على أيقونة المشبك ← ملف ← اختر الفيديو.
هذا يحافظ على الجودة الأصلية وبيانات الموقع اللازمة للتحقق.
💡 نصيحة: إذا كانت كاميرتك تتيح لك الاختيار، سجّل بدقة 720p (HD) بدلاً من 1080p أو 4K — فالمقطع الذي يستمر 61–90 ثانية بدقة كاملة يكون عادةً كبيرًا جدًا لإرساله كملف؛ دقة 720p تبقى ضمن الحد المسموح.

📋 شروط الإرسال:
• يجب أن يكون الفيديو بين 61 و90 ثانية
• اتبع صيغة الأسئلة الخمسة:
  من — من المعني بالأمر؟
  ماذا — ماذا يحدث؟
  أين — أين أنت؟
  متى — متى بدأ هذا؟
  لماذا — لماذا يحدث هذا؟
• اختم بـ: "كنت هناك" — اسمك، مدينتك

لنشر تقريرك وكسب عائد منه، أحتاج لإنشاء حسابك.
ما اسمك؟`,
    askUsername: 'تمام. ما اسم المستخدم الذي تريده في VozIt؟ (أحرف وأرقام وشرطات سفلية — هذا عام)',
    askEmail: 'وبريد إلكتروني، لحسابك ومدفوعاتك؟',
    accountCreated: (username: string, link: string) => `✅ تم إنشاء الحساب! اسم المستخدم: @${username}.\n\n💰 أعدّ مدفوعاتك من هنا (رابطك الخاص): ${link}\n\nيمكنك دائمًا الحصول على رابط مدفوعات جديد بكتابة /payouts، أو رابط الإعدادات بكتابة /profile.`,
    accountCreateFailed: 'تعذر إنشاء حسابك الآن — حاول مرة أخرى بعد قليل، أو سجّل عبر vozit.net.',
    returningGreeting: (username: string) => `تمام يا @${username}! 🎥 جارٍ معالجة تقريرك.`,
    askDescription: 'ماذا يحدث؟ (وصف موجز)',
    tooShort: (secs: number) => `مدة الفيديو ${secs} ثانية. يجب أن تكون تقارير VozIt بين 61 و90 ثانية. الرجاء إعادة الإرسال.`,
    tooLong: (secs: number) => `مدة الفيديو ${secs} ثانية. يرجى تقليصه إلى 61–90 ثانية وإعادة الإرسال.`,
    sentAsVideoWarning: '⚠️ أرسلت هذا كرسالة فيديو، مما يزيل بيانات الموقع. في المرة القادمة اضغط المشبك ← ملف للتحقق بشكل أفضل.',
    fileTooLarge: 'هذا الملف كبير جدًا بحيث لا يمكنني تنزيله مباشرة (تيليجرام يحد البوتات بـ 20 ميغابايت). بعض الحلول: سجّل بدقة أقل في المرة القادمة (720p بدلاً من 1080p/4K)، أو اضغط هذا الفيديو باستخدام خيار المشاركة/الضغط المدمج في هاتفك، أو أرسله كرسالة فيديو بدلاً من ذلك (أصغر حجمًا لكنه يفقد بيانات الموقع) — أو أرسله عبر vozit.net.',
    askLocation: '📍 شارك موقعك: اضغط المشبك ← الموقع ← إرسال موقعي الحالي.\nهذا يثبت أنك كنت في مكان الحدث ويعزز درجة مصداقيتك.',
    askWhen: '🕐 متى سجّلت هذا الفيديو؟ (مثال: اليوم الساعة 2 ظهرًا، أمس صباحًا)',
    credibilityTip: '💡 نصيحة: مشاركة موقعك تزيد من مصداقيتك وإمكانية أرباحك.',
    processing: 'شكرًا — جارٍ معالجة تقريرك. ستراه في ملفك الشخصي على VozIt فور نشره.',
    reportFlagged: 'تم إرسال تقريرك لكن تم وضع علامة عليه للمراجعة من قبل نظام الإشراف الآلي لدينا — لن يكون عامًا بعد. يمكنك التحقق من حالته على vozit.net.',
    reportRemoved: 'تعذر نشر تقريرك — تم وضع علامة عليه من قبل نظام الإشراف على المحتوى لدينا. إذا كنت تعتقد أن هذا خطأ، تفضل بزيارة vozit.net للمساعدة.',
    genericError: 'حدث خطأ ما من جانبي — حاول مرة أخرى، أو أرسل عبر vozit.net.',
    noVideoYet: 'أرسل لي الفيديو عندما تكون جاهزًا — كملف (مشبك ← ملف)، وليس كرسالة فيديو.',
    payoutsLinkMsg: (link: string) => `💰 إليك رابط المدفوعات الخاص بك: ${link}\n\nهذا الرابط لك فقط ويعمل لفترة محدودة — إذا توقف عن العمل، اكتب /payouts مرة أخرى للحصول على رابط جديد.`,
    settingsLinkMsg: (link: string) => `⚙️ إليك رابط الإعدادات الخاص بك: ${link}\n\nهذا الرابط لك فقط ويعمل لفترة محدودة — إذا توقف عن العمل، اكتب /profile مرة أخرى للحصول على رابط جديد.`,
    linkGenFailed: 'تعذر إنشاء رابطك الآن — حاول مرة أخرى بعد قليل.',
  },
  fr: {
    chooseLanguage: '🌐 Langue ? Répondez avec un numéro :\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Bienvenue sur VozIt! — « J'y étais... »

📎 IMPORTANT : Envoyez votre vidéo en tant que FICHIER, pas en tant que message vidéo.
Appuyez sur le trombone → Fichier → sélectionnez votre vidéo.
Cela préserve la qualité d'origine et les données de localisation nécessaires à la vérification.
💡 Astuce : si votre caméra le permet, filmez en 720p (HD) plutôt qu'en 1080p ou 4K — un clip de 61 à 90 secondes en pleine résolution est souvent trop volumineux pour être envoyé en tant que Fichier ; le 720p reste sous la limite.

📋 CONSIGNES DE SOUMISSION :
• La vidéo doit durer entre 61 et 90 secondes
• Suivez le format des 5W :
  QUI — Qui est impliqué ?
  QUOI — Que se passe-t-il ?
  OÙ — Où êtes-vous ?
  QUAND — Quand cela a-t-il commencé ?
  POURQUOI — Pourquoi cela se produit-il ?
• Terminez par : « J'y étais » — votre nom, votre ville

Pour publier et gagner de l'argent, je dois créer votre compte.
Quel est votre nom ?`,
    askUsername: "Merci. Quel nom d'utilisateur voulez-vous sur VozIt ? (lettres, chiffres, tirets bas — c'est public)",
    askEmail: 'Et une adresse e-mail, pour votre compte et vos paiements ?',
    accountCreated: (username: string, link: string) => `✅ Compte créé ! Nom d'utilisateur : @${username}.\n\n💰 Configurez vos paiements ici (votre lien personnel) : ${link}\n\nVous pouvez toujours obtenir un nouveau lien de paiements en tapant /payouts, ou votre lien de paramètres en tapant /profile.`,
    accountCreateFailed: "Je n'ai pas pu créer votre compte pour le moment — réessayez dans un instant, ou inscrivez-vous sur vozit.net.",
    returningGreeting: (username: string) => `Bien reçu, @${username} ! 🎥 Traitement de votre rapport en cours.`,
    askDescription: 'Que se passe-t-il ? (brève description)',
    tooShort: (secs: number) => `Votre vidéo dure ${secs} secondes. Les rapports VozIt doivent durer entre 61 et 90 secondes. Veuillez la renvoyer.`,
    tooLong: (secs: number) => `Votre vidéo dure ${secs} secondes. Veuillez la raccourcir à 61–90 secondes et la renvoyer.`,
    sentAsVideoWarning: '⚠️ Vous avez envoyé ceci comme message vidéo, ce qui supprime les données de localisation. La prochaine fois, utilisez trombone → Fichier pour une meilleure vérification.',
    fileTooLarge: "Ce fichier est trop volumineux pour être téléchargé directement (Telegram limite les bots à 20 Mo). Quelques solutions : filmez en résolution plus basse la prochaine fois (720p au lieu de 1080p/4K), compressez cette vidéo avec l'option partager/compresser de votre téléphone, ou envoyez-la comme message vidéo à la place (plus petit, mais perd les données de localisation) — ou envoyez-la sur vozit.net.",
    askLocation: '📍 Partagez votre position : trombone → Position → Envoyer ma position actuelle.\nCela prouve que vous étiez sur place et renforce votre score de crédibilité.',
    askWhen: '🕐 Quand avez-vous enregistré cette vidéo ? (exemple : aujourd\'hui 14h, hier matin)',
    credibilityTip: '💡 Astuce : partager votre position augmente votre crédibilité et votre potentiel de revenus.',
    processing: 'Merci — votre rapport est en cours de traitement. Vous le verrez sur votre profil VozIt une fois publié.',
    reportFlagged: "Votre rapport a été envoyé mais signalé pour examen par notre modération automatisée — il ne sera pas encore public. Vous pouvez vérifier son statut sur vozit.net.",
    reportRemoved: "Votre rapport n'a pas pu être publié — il a été signalé par notre modération de contenu. Si vous pensez que c'est une erreur, consultez vozit.net.",
    genericError: "Une erreur s'est produite de mon côté — réessayez, ou envoyez sur vozit.net.",
    noVideoYet: "Envoyez-moi votre vidéo quand vous serez prêt — en tant que FICHIER (trombone → Fichier), pas en message vidéo.",
    payoutsLinkMsg: (link: string) => `💰 Voici votre lien privé de paiements : ${link}\n\nCe lien est juste pour vous et fonctionne pendant un temps limité — s'il ne fonctionne plus, tapez à nouveau /payouts pour en obtenir un nouveau.`,
    settingsLinkMsg: (link: string) => `⚙️ Voici votre lien privé de paramètres : ${link}\n\nCe lien est juste pour vous et fonctionne pendant un temps limité — s'il ne fonctionne plus, tapez à nouveau /profile pour en obtenir un nouveau.`,
    linkGenFailed: "Je n'ai pas pu générer votre lien pour le moment — réessayez dans un instant.",
  },
  uk: {
    chooseLanguage: '🌐 Мова? Дайте відповідь номером:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Ласкаво просимо до VozIt! — «Я був там...»

📎 ВАЖЛИВО: Надішліть відео як ФАЙЛ, а не як відеоповідомлення.
Натисніть скріпку → Файл → виберіть відео.
Це зберігає оригінальну якість і дані про місцезнаходження, потрібні для перевірки.
💡 Порада: якщо камера дозволяє обрати, знімайте у 720p (HD) замість 1080p чи 4K — кліп на 61–90 секунд у повній роздільній здатності зазвичай завеликий, щоб надіслати як Файл; 720p залишається в межах ліміту.

📋 ВИМОГИ ДО ПОДАННЯ:
• Відео має тривати 61–90 секунд
• Дотримуйтесь формату 5W:
  ХТО — Хто причетний?
  ЩО — Що відбувається?
  ДЕ — Де ви перебуваєте?
  КОЛИ — Коли це почалося?
  ЧОМУ — Чому це відбувається?
• Завершіть фразою: «Я був там» — ваше ім'я, ваше місто

Щоб опублікувати та отримувати дохід, потрібно створити ваш акаунт.
Як вас звати?`,
    askUsername: "Дякую. Яке ім'я користувача ви хочете на VozIt? (літери, цифри, підкреслення — це публічно)",
    askEmail: 'І електронну адресу, для акаунта та виплат?',
    accountCreated: (username: string, link: string) => `✅ Акаунт створено! Ім'я користувача: @${username}.\n\n💰 Налаштуйте виплати тут (ваше особисте посилання): ${link}\n\nВи завжди можете отримати нове посилання на виплати, написавши /payouts, або посилання на налаштування, написавши /profile.`,
    accountCreateFailed: 'Не вдалося створити акаунт зараз — спробуйте ще раз за хвилину, або зареєструйтеся на vozit.net.',
    returningGreeting: (username: string) => `Зрозуміло, @${username}! 🎥 Обробляю ваш звіт.`,
    askDescription: 'Що відбувається? (короткий опис)',
    tooShort: (secs: number) => `Ваше відео триває ${secs} секунд. Звіти VozIt мають тривати 61–90 секунд. Будь ласка, надішліть ще раз.`,
    tooLong: (secs: number) => `Ваше відео триває ${secs} секунд. Обріжте до 61–90 секунд і надішліть ще раз.`,
    sentAsVideoWarning: '⚠️ Ви надіслали це як відеоповідомлення, що видаляє дані про місцезнаходження. Наступного разу натисніть скріпку → Файл для кращої перевірки.',
    fileTooLarge: 'Цей файл занадто великий, щоб завантажити його напряму (Telegram обмежує ботів до 20 МБ). Кілька варіантів: знімайте наступного разу в нижчій роздільній здатності (720p замість 1080p/4K), стисніть це відео за допомогою вбудованої опції «поділитися/стиснути» на телефоні, або надішліть його як відеоповідомлення (менший розмір, але без даних про місцезнаходження) — або надішліть через vozit.net.',
    askLocation: '📍 Поділіться місцезнаходженням: скріпка → Місцезнаходження → Надіслати поточне місцезнаходження.\nЦе підтверджує, що ви були на місці, і підвищує ваш рейтинг довіри.',
    askWhen: '🕐 Коли ви записали це відео? (наприклад: сьогодні о 14:00, вчора вранці)',
    credibilityTip: '💡 Порада: поширення місцезнаходження підвищує довіру та потенційний дохід.',
    processing: 'Дякую — ваш звіт обробляється. Ви побачите його у своєму профілі VozIt, щойно він буде опублікований.',
    reportFlagged: 'Ваш звіт надіслано, але позначено для перевірки нашою автоматичною модерацією — він ще не буде публічним. Перевірити статус можна на vozit.net.',
    reportRemoved: 'Ваш звіт не вдалося опублікувати — його позначила наша модерація контенту. Якщо вважаєте це помилкою, зверніться на vozit.net.',
    genericError: 'Щось пішло не так з мого боку — спробуйте ще раз, або надішліть через vozit.net.',
    noVideoYet: 'Надішліть відео, коли будете готові — як ФАЙЛ (скріпка → Файл), а не відеоповідомлення.',
    payoutsLinkMsg: (link: string) => `💰 Ось ваше приватне посилання для виплат: ${link}\n\nЦе посилання лише для вас і діє протягом обмеженого часу — якщо воно перестане працювати, просто напишіть /payouts ще раз, щоб отримати нове.`,
    settingsLinkMsg: (link: string) => `⚙️ Ось ваше приватне посилання на налаштування: ${link}\n\nЦе посилання лише для вас і діє протягом обмеженого часу — якщо воно перестане працювати, просто напишіть /profile ще раз, щоб отримати нове.`,
    linkGenFailed: 'Не вдалося створити ваше посилання зараз — спробуйте ще раз за хвилину.',
  },
  pt: {
    chooseLanguage: '🌐 Idioma? Responda com um número:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Bem-vindo ao VozIt! — "Eu estava lá..."

📎 IMPORTANTE: Envie seu vídeo como ARQUIVO, não como mensagem de vídeo.
Toque no clipe → Arquivo → selecione seu vídeo.
Isso preserva a qualidade original e os dados de localização para verificação.
💡 Dica: se sua câmera permitir escolher, grave em 720p (HD) em vez de 1080p ou 4K — um vídeo de 61 a 90 segundos em resolução total costuma ser grande demais para enviar como Arquivo; o 720p fica dentro do limite.

📋 DIRETRIZES DE ENVIO:
• O vídeo deve ter entre 61 e 90 segundos
• Siga o formato dos 5Ws:
  QUEM — Quem está envolvido?
  O QUÊ — O que está acontecendo?
  ONDE — Onde você está?
  QUANDO — Quando isso começou?
  POR QUÊ — Por que isso está acontecendo?
• Termine com: "Eu estava lá" — seu nome, sua cidade

Para publicar e ganhar receita, preciso configurar sua conta.
Qual é o seu nome?`,
    askUsername: 'Certo. Qual nome de usuário você quer no VozIt? (letras, números, sublinhados — isso é público)',
    askEmail: 'E um e-mail, para sua conta e pagamentos?',
    accountCreated: (username: string, link: string) => `✅ Conta criada! Usuário: @${username}.\n\n💰 Configure seus pagamentos aqui (seu link pessoal): ${link}\n\nVocê sempre pode obter um novo link de pagamentos digitando /payouts, ou seu link de configurações digitando /profile.`,
    accountCreateFailed: 'Não consegui criar sua conta agora — tente novamente em instantes, ou cadastre-se em vozit.net.',
    returningGreeting: (username: string) => `Certo, @${username}! 🎥 Processando seu relato.`,
    askDescription: 'O que está acontecendo? (descrição breve)',
    tooShort: (secs: number) => `Seu vídeo tem ${secs} segundos. Os relatos do VozIt devem ter entre 61 e 90 segundos. Por favor, reenvie.`,
    tooLong: (secs: number) => `Seu vídeo tem ${secs} segundos. Corte para 61–90 segundos e reenvie.`,
    sentAsVideoWarning: '⚠️ Você enviou isso como mensagem de vídeo, o que remove os dados de localização. Da próxima vez toque no clipe → Arquivo para melhor verificação.',
    fileTooLarge: 'Esse arquivo é grande demais para eu baixar diretamente (o Telegram limita bots a 20MB). Algumas soluções: grave em uma resolução menor da próxima vez (720p em vez de 1080p/4K), comprima este vídeo usando a opção de compartilhar/comprimir do seu celular, ou envie-o como mensagem de vídeo (menor, mas perde os dados de localização) — ou envie pelo vozit.net.',
    askLocation: '📍 Compartilhe sua localização: clipe → Localização → Enviar minha localização atual.\nIsso comprova que você estava no local e fortalece sua pontuação de credibilidade.',
    askWhen: '🕐 Quando você gravou esse vídeo? (exemplo: hoje às 14h, ontem de manhã)',
    credibilityTip: '💡 Dica: compartilhar sua localização aumenta sua credibilidade e seu potencial de ganhos.',
    processing: 'Obrigado — seu relato está sendo processado. Você o verá no seu perfil do VozIt assim que for publicado.',
    reportFlagged: 'Seu relato foi enviado, mas sinalizado para revisão pela nossa moderação automática — ainda não ficará público. Você pode verificar o status em vozit.net.',
    reportRemoved: 'Seu relato não pôde ser publicado — foi sinalizado pela nossa moderação de conteúdo. Se achar que isso é um erro, acesse vozit.net para ajuda.',
    genericError: 'Algo deu errado do meu lado — tente novamente, ou envie pelo vozit.net.',
    noVideoYet: 'Me envie seu vídeo quando estiver pronto — como ARQUIVO (clipe → Arquivo), não como mensagem de vídeo.',
    payoutsLinkMsg: (link: string) => `💰 Aqui está seu link privado de pagamentos: ${link}\n\nEsse link é só seu e funciona por um tempo limitado — se parar de funcionar, digite /payouts novamente para obter um novo.`,
    settingsLinkMsg: (link: string) => `⚙️ Aqui está seu link privado de configurações: ${link}\n\nEsse link é só seu e funciona por um tempo limitado — se parar de funcionar, digite /profile novamente para obter um novo.`,
    linkGenFailed: 'Não consegui gerar seu link agora — tente novamente em instantes.',
  },
  sw: {
    chooseLanguage: '🌐 Lugha? Jibu kwa nambari:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Karibu VozIt! — "Nilikuwepo..."

📎 MUHIMU: Tuma video yako kama FAILI, si kama ujumbe wa video.
Gusa klipu → Faili → chagua video yako.
Hii inahifadhi ubora wa asili na data ya eneo kwa ajili ya uthibitisho.
💡 Kidokezo: ikiwa kamera yako inakuruhusu kuchagua, rekodi kwa 720p (HD) badala ya 1080p au 4K — video ya sekunde 61–90 kwa ubora kamili mara nyingi ni kubwa mno kutuma kama Faili; 720p inabaki chini ya kikomo.

📋 MASHARTI YA KUTUMA:
• Video lazima iwe sekunde 61–90
• Fuata muundo wa 5W:
  NANI — Nani anahusika?
  NINI — Nini kinaendelea?
  WAPI — Uko wapi?
  LINI — Hili lilianza lini?
  KWANINI — Kwa nini hili linatokea?
• Malizia kwa: "Nilikuwepo" — jina lako, mji wako

Ili kuchapisha na kupata mapato, ninahitaji kusanidi akaunti yako.
Jina lako ni nani?`,
    askUsername: 'Sawa. Unataka jina gani la mtumiaji kwenye VozIt? (herufi, nambari, mistari ya chini — hii ni ya umma)',
    askEmail: 'Na barua pepe, kwa ajili ya akaunti yako na malipo?',
    accountCreated: (username: string, link: string) => `✅ Akaunti imeundwa! Mtumiaji: @${username}.\n\n💰 Sanidi malipo yako hapa (kiungo chako binafsi): ${link}\n\nUnaweza kupata kiungo kipya cha malipo wakati wowote kwa kuandika /payouts, au kiungo cha mipangilio kwa kuandika /profile.`,
    accountCreateFailed: 'Sikuweza kuunda akaunti yako sasa hivi — jaribu tena baada ya muda, au jisajili kwenye vozit.net.',
    returningGreeting: (username: string) => `Sawa, @${username}! 🎥 Ninachakata ripoti yako.`,
    askDescription: 'Nini kinaendelea? (maelezo mafupi)',
    tooShort: (secs: number) => `Video yako ina sekunde ${secs}. Ripoti za VozIt lazima ziwe sekunde 61–90. Tafadhali tuma tena.`,
    tooLong: (secs: number) => `Video yako ina sekunde ${secs}. Tafadhali ipunguze hadi sekunde 61–90 na utume tena.`,
    sentAsVideoWarning: '⚠️ Umetuma hii kama ujumbe wa video, jambo linaloondoa data ya eneo. Mara ijayo gusa klipu → Faili kwa uthibitisho bora.',
    fileTooLarge: 'Faili hiyo ni kubwa mno kwa mimi kuipakua moja kwa moja (Telegram inawekea roboti kikomo cha MB 20). Suluhisho chache: rekodi kwa ubora wa chini mara nyingine (720p badala ya 1080p/4K), punguza ukubwa wa video hii kwa kutumia chaguo la kushiriki/kupunguza la simu yako, au itume kama ujumbe wa video badala yake (ndogo zaidi, lakini inapoteza data ya eneo) — au itume kupitia vozit.net.',
    askLocation: '📍 Shiriki eneo lako: gusa klipu → Eneo → Tuma eneo langu la sasa.\nHii inathibitisha ulikuwepo eneo la tukio na kuongeza alama yako ya uaminifu.',
    askWhen: '🕐 Ulirekodi video hii lini? (mfano: leo saa 8 mchana, jana asubuhi)',
    credibilityTip: '💡 Kidokezo: kushiriki eneo lako huongeza uaminifu wako na uwezekano wa mapato.',
    processing: 'Asante — ripoti yako inachakatwa. Utaiona kwenye wasifu wako wa VozIt mara itakapochapishwa.',
    reportFlagged: 'Ripoti yako imetumwa lakini imetiwa alama kwa ukaguzi na mfumo wetu wa kiotomatiki — haitakuwa ya umma bado. Unaweza kuangalia hali yake kwenye vozit.net.',
    reportRemoved: 'Ripoti yako haikuweza kuchapishwa — ilitiwa alama na mfumo wetu wa ukaguzi wa maudhui. Ukidhani hii ni kosa, tembelea vozit.net kwa msaada.',
    genericError: 'Kuna hitilafu upande wangu — jaribu tena, au tuma kupitia vozit.net.',
    noVideoYet: 'Nitumie video yako ukiwa tayari — kama FAILI (klipu → Faili), si ujumbe wa video.',
    payoutsLinkMsg: (link: string) => `💰 Hiki ndicho kiungo chako binafsi cha malipo: ${link}\n\nKiungo hiki ni chako pekee na kinafanya kazi kwa muda mfupi — kikiacha kufanya kazi, andika /payouts tena kupata kipya.`,
    settingsLinkMsg: (link: string) => `⚙️ Hiki ndicho kiungo chako binafsi cha mipangilio: ${link}\n\nKiungo hiki ni chako pekee na kinafanya kazi kwa muda mfupi — kikiacha kufanya kazi, andika /profile tena kupata kipya.`,
    linkGenFailed: 'Sikuweza kutengeneza kiungo chako sasa hivi — jaribu tena baada ya muda.',
  },
  ru: {
    chooseLanguage: '🌐 Язык? Ответьте цифрой:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Добро пожаловать в VozIt! — «Я был там...»

📎 ВАЖНО: Отправьте видео как ФАЙЛ, а не как видеосообщение.
Нажмите на скрепку → Файл → выберите видео.
Это сохраняет исходное качество и данные о местоположении, необходимые для проверки.
💡 Совет: если камера позволяет выбрать, снимайте в 720p (HD) вместо 1080p или 4K — ролик длиной 61–90 секунд в полном разрешении обычно слишком большой, чтобы отправить как Файл; 720p остаётся в пределах лимита.

📋 ТРЕБОВАНИЯ К ОТПРАВКЕ:
• Видео должно длиться от 61 до 90 секунд
• Следуйте формату 5W:
  КТО — Кто участвует?
  ЧТО — Что происходит?
  ГДЕ — Где вы находитесь?
  КОГДА — Когда это началось?
  ПОЧЕМУ — Почему это происходит?
• Завершите фразой: «Я был там» — ваше имя, ваш город

Чтобы опубликовать материал и получать доход, мне нужно создать ваш аккаунт.
Как вас зовут?`,
    askUsername: 'Принято. Какое имя пользователя вы хотите на VozIt? (буквы, цифры, нижние подчёркивания — это публично)',
    askEmail: 'И адрес электронной почты, для аккаунта и выплат?',
    accountCreated: (username: string, link: string) => `✅ Аккаунт создан! Имя пользователя: @${username}.\n\n💰 Настройте выплаты здесь (ваша личная ссылка): ${link}\n\nВы всегда можете получить новую ссылку на выплаты, написав /payouts, или ссылку на настройки, написав /profile.`,
    accountCreateFailed: 'Не удалось создать ваш аккаунт сейчас — попробуйте ещё раз через момент, или зарегистрируйтесь на vozit.net.',
    returningGreeting: (username: string) => `Принято, @${username}! 🎥 Обрабатываю ваш репортаж.`,
    askDescription: 'Что происходит? (краткое описание)',
    tooShort: (secs: number) => `Ваше видео длится ${secs} секунд. Репортажи VozIt должны длиться от 61 до 90 секунд. Пожалуйста, отправьте заново.`,
    tooLong: (secs: number) => `Ваше видео длится ${secs} секунд. Пожалуйста, обрежьте до 61–90 секунд и отправьте заново.`,
    sentAsVideoWarning: '⚠️ Вы отправили это как видеосообщение, что удаляет данные о местоположении. В следующий раз нажмите скрепку → Файл для лучшей проверки.',
    fileTooLarge: 'Этот файл слишком большой, чтобы я мог скачать его напрямую (Telegram ограничивает ботов 20 МБ). Несколько решений: снимайте в более низком разрешении в следующий раз (720p вместо 1080p/4K), сожмите это видео через встроенную функцию «поделиться/сжать» на телефоне, или отправьте его как видеосообщение (меньше размер, но теряются данные о местоположении) — или отправьте через vozit.net.',
    askLocation: '📍 Поделитесь своим местоположением: нажмите скрепку → Местоположение → Отправить текущее местоположение.\nЭто подтверждает, что вы были на месте, и повышает ваш рейтинг доверия.',
    askWhen: '🕐 Когда вы записали это видео? (например: сегодня в 14:00, вчера утром)',
    credibilityTip: '💡 Совет: указание местоположения повышает доверие и ваш потенциальный доход.',
    processing: 'Спасибо — ваш репортаж обрабатывается. Вы увидите его в своём профиле VozIt, как только он будет опубликован.',
    reportFlagged: 'Ваш репортаж отправлен, но отмечен для проверки нашей автоматической модерацией — пока он не будет публичным. Вы можете проверить его статус на vozit.net.',
    reportRemoved: 'Ваш репортаж не удалось опубликовать — он был отмечен нашей модерацией контента. Если вы считаете это ошибкой, посетите vozit.net за помощью.',
    genericError: 'Что-то пошло не так с моей стороны — попробуйте ещё раз, или отправьте через vozit.net.',
    noVideoYet: 'Отправьте мне видео, когда будете готовы — как ФАЙЛ (скрепка → Файл), а не видеосообщение.',
    payoutsLinkMsg: (link: string) => `💰 Вот ваша личная ссылка на выплаты: ${link}\n\nЭта ссылка только для вас и работает некоторое время — если она перестанет работать, просто напишите /payouts снова, чтобы получить новую.`,
    settingsLinkMsg: (link: string) => `⚙️ Вот ваша личная ссылка на настройки: ${link}\n\nЭта ссылка только для вас и работает некоторое время — если она перестанет работать, просто напишите /profile снова, чтобы получить новую.`,
    linkGenFailed: 'Не удалось создать вашу ссылку сейчас — попробуйте ещё раз через момент.',
  },
  id: {
    chooseLanguage: '🌐 Bahasa? Balas dengan angka:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`Selamat datang di VozIt! — "Saya ada di sana..."

📎 PENTING: Kirim video Anda sebagai FILE, bukan sebagai pesan video.
Ketuk ikon klip kertas → File → pilih video Anda.
Ini menjaga kualitas asli dan data lokasi yang diperlukan untuk verifikasi.
💡 Tips: jika kamera Anda memungkinkan memilih, rekam dalam 720p (HD), bukan 1080p atau 4K — video berdurasi 61–90 detik dalam resolusi penuh biasanya terlalu besar untuk dikirim sebagai File; 720p tetap berada di bawah batas.

📋 PANDUAN PENGIRIMAN:
• Video harus berdurasi 61–90 detik
• Ikuti format 5W:
  SIAPA — Siapa yang terlibat?
  APA — Apa yang terjadi?
  DI MANA — Di mana Anda berada?
  KAPAN — Kapan ini dimulai?
  MENGAPA — Mengapa ini terjadi?
• Akhiri dengan: "Saya ada di sana" — nama Anda, kota Anda

Untuk mempublikasikan dan mendapatkan penghasilan, saya perlu membuat akun Anda.
Siapa nama Anda?`,
    askUsername: 'Baik. Nama pengguna apa yang Anda inginkan di VozIt? (huruf, angka, garis bawah — ini bersifat publik)',
    askEmail: 'Dan alamat email, untuk akun dan pembayaran Anda?',
    accountCreated: (username: string, link: string) => `✅ Akun berhasil dibuat! Nama pengguna: @${username}.\n\n💰 Atur pembayaran Anda di sini (tautan pribadi Anda): ${link}\n\nAnda selalu bisa mendapatkan tautan pembayaran baru dengan mengetik /payouts, atau tautan pengaturan dengan mengetik /profile.`,
    accountCreateFailed: 'Saya tidak bisa membuat akun Anda saat ini — coba lagi sebentar, atau daftar di vozit.net.',
    returningGreeting: (username: string) => `Baik, @${username}! 🎥 Memproses laporan Anda.`,
    askDescription: 'Apa yang sedang terjadi? (deskripsi singkat)',
    tooShort: (secs: number) => `Video Anda berdurasi ${secs} detik. Laporan VozIt harus berdurasi 61–90 detik. Silakan kirim ulang.`,
    tooLong: (secs: number) => `Video Anda berdurasi ${secs} detik. Silakan potong menjadi 61–90 detik dan kirim ulang.`,
    sentAsVideoWarning: '⚠️ Anda mengirim ini sebagai pesan video, yang menghapus data lokasi. Lain kali ketuk klip kertas → File untuk verifikasi yang lebih baik.',
    fileTooLarge: 'File itu terlalu besar untuk saya unduh secara langsung (Telegram membatasi bot hingga 20MB). Beberapa solusi: rekam dengan resolusi lebih rendah lain kali (720p alih-alih 1080p/4K), kompres video ini menggunakan opsi bagikan/kompres bawaan ponsel Anda, atau kirim sebagai pesan video (lebih kecil, tetapi kehilangan data lokasi) — atau kirim melalui vozit.net.',
    askLocation: '📍 Bagikan lokasi Anda: ketuk klip kertas → Lokasi → Kirim Lokasi Saya Saat Ini.\nIni membuktikan Anda berada di lokasi kejadian dan meningkatkan skor kredibilitas Anda.',
    askWhen: '🕐 Kapan Anda merekam video ini? (contoh: hari ini jam 2 siang, kemarin pagi)',
    credibilityTip: '💡 Tips: membagikan lokasi Anda menambah kredibilitas dan potensi penghasilan Anda.',
    processing: 'Terima kasih — laporan Anda sedang diproses. Anda akan melihatnya di profil VozIt Anda setelah dipublikasikan.',
    reportFlagged: 'Laporan Anda telah dikirim tetapi ditandai untuk ditinjau oleh moderasi otomatis kami — belum akan tampil publik. Anda bisa memeriksa statusnya di vozit.net.',
    reportRemoved: 'Laporan Anda tidak dapat dipublikasikan — ditandai oleh moderasi konten kami. Jika menurut Anda ini salah, kunjungi vozit.net untuk bantuan.',
    genericError: 'Terjadi kesalahan di pihak saya — coba lagi, atau kirim melalui vozit.net.',
    noVideoYet: 'Kirim video Anda kapan pun Anda siap — sebagai FILE (klip kertas → File), bukan pesan video.',
    payoutsLinkMsg: (link: string) => `💰 Ini tautan pembayaran pribadi Anda: ${link}\n\nTautan ini hanya untuk Anda dan berfungsi untuk sementara waktu — jika berhenti berfungsi, cukup ketik /payouts lagi untuk mendapatkan yang baru.`,
    settingsLinkMsg: (link: string) => `⚙️ Ini tautan pengaturan pribadi Anda: ${link}\n\nTautan ini hanya untuk Anda dan berfungsi untuk sementara waktu — jika berhenti berfungsi, cukup ketik /profile lagi untuk mendapatkan yang baru.`,
    linkGenFailed: 'Saya tidak bisa membuat tautan Anda saat ini — coba lagi sebentar.',
  },
  fa: {
    chooseLanguage: '🌐 زبان؟ لطفاً با یک عدد پاسخ دهید:\n1. English\n2. Español\n3. العربية\n4. Français\n5. Українська\n6. Português\n7. Kiswahili\n8. Русский\n9. Bahasa Indonesia\n10. فارسی',
    welcome:
`به VozIt خوش آمدید! — «من آنجا بودم...»

📎 مهم: ویدیوی خود را به‌صورت فایل ارسال کنید، نه به‌صورت پیام ویدیویی.
روی آیکون گیره کاغذ ← فایل ← انتخاب ویدیو ضربه بزنید.
این کار کیفیت اصلی و داده‌های مکانی لازم برای تأیید را حفظ می‌کند.
💡 نکته: اگر دوربین شما اجازه انتخاب می‌دهد، با کیفیت ۷۲۰p (HD) ضبط کنید نه ۱۰۸۰p یا ۴K — یک کلیپ ۶۱ تا ۹۰ ثانیه‌ای با کیفیت کامل معمولاً برای ارسال به‌صورت فایل خیلی بزرگ است؛ ۷۲۰p در محدوده مجاز باقی می‌ماند.

📋 راهنمای ارسال:
• ویدیو باید بین ۶۱ تا ۹۰ ثانیه باشد
• از قالب ۵W پیروی کنید:
  چه کسی — چه کسی درگیر است؟
  چه چیزی — چه اتفاقی در حال رخ دادن است؟
  کجا — شما کجا هستید؟
  چه زمانی — این کی شروع شد؟
  چرا — چرا این اتفاق می‌افتد؟
• با این جمله پایان دهید: «من آنجا بودم» — نام شما، شهر شما

برای انتشار و کسب درآمد، باید حساب شما را بسازم.
نام شما چیست؟`,
    askUsername: 'بسیار خب. چه نام کاربری‌ای می‌خواهید در VozIt داشته باشید؟ (حروف، اعداد، زیرخط — این عمومی است)',
    askEmail: 'و یک آدرس ایمیل، برای حساب و پرداخت‌های شما؟',
    accountCreated: (username: string, link: string) => `✅ حساب ساخته شد! نام کاربری: @${username}.\n\n💰 پرداخت‌های خود را از اینجا تنظیم کنید (لینک شخصی شما): ${link}\n\nهمیشه می‌توانید با نوشتن /payouts لینک جدیدی برای پرداخت‌ها، یا با نوشتن /profile لینک تنظیمات دریافت کنید.`,
    accountCreateFailed: 'در حال حاضر نتوانستم حساب شما را بسازم — کمی بعد دوباره امتحان کنید، یا در vozit.net ثبت‌نام کنید.',
    returningGreeting: (username: string) => `متوجه شدم، @${username}! 🎥 در حال پردازش گزارش شما هستم.`,
    askDescription: 'چه اتفاقی در حال رخ دادن است؟ (توضیح مختصر)',
    tooShort: (secs: number) => `ویدیوی شما ${secs} ثانیه است. گزارش‌های VozIt باید بین ۶۱ تا ۹۰ ثانیه باشند. لطفاً دوباره ارسال کنید.`,
    tooLong: (secs: number) => `ویدیوی شما ${secs} ثانیه است. لطفاً آن را به ۶۱ تا ۹۰ ثانیه کوتاه کنید و دوباره ارسال کنید.`,
    sentAsVideoWarning: '⚠️ شما این را به‌صورت پیام ویدیویی ارسال کردید که داده‌های مکانی را حذف می‌کند. دفعه بعد روی گیره کاغذ ← فایل بزنید تا تأیید بهتری انجام شود.',
    fileTooLarge: 'این فایل برای دانلود مستقیم توسط من بیش از حد بزرگ است (تلگرام ربات‌ها را به ۲۰ مگابایت محدود می‌کند). چند راه‌حل: دفعه بعد با کیفیت پایین‌تر ضبط کنید (۷۲۰p به‌جای ۱۰۸۰p یا ۴K)، این ویدیو را با گزینه اشتراک‌گذاری/فشرده‌سازی داخلی گوشی خود فشرده کنید، یا آن را به‌صورت پیام ویدیویی ارسال کنید (حجم کمتر، اما بدون داده‌های مکانی) — یا از طریق vozit.net ارسال کنید.',
    askLocation: '📍 موقعیت مکانی خود را به اشتراک بگذارید: روی گیره کاغذ ← موقعیت مکانی ← ارسال موقعیت مکانی فعلی من بزنید.\nاین ثابت می‌کند که شما در محل حادثه بوده‌اید و امتیاز اعتبار شما را افزایش می‌دهد.',
    askWhen: '🕐 چه زمانی این ویدیو را ضبط کردید؟ (مثال: امروز ساعت ۲ بعدازظهر، دیروز صبح)',
    credibilityTip: '💡 نکته: به اشتراک گذاشتن موقعیت مکانی اعتبار و پتانسیل درآمد شما را افزایش می‌دهد.',
    processing: 'متشکرم — گزارش شما در حال پردازش است. به‌محض انتشار، آن را در پروفایل VozIt خود خواهید دید.',
    reportFlagged: 'گزارش شما ارسال شد اما توسط سیستم نظارت خودکار ما برای بررسی علامت‌گذاری شد — هنوز عمومی نخواهد بود. می‌توانید وضعیت آن را در vozit.net بررسی کنید.',
    reportRemoved: 'گزارش شما منتشر نشد — توسط سیستم نظارت بر محتوای ما علامت‌گذاری شد. اگر فکر می‌کنید این اشتباه است، برای کمک به vozit.net مراجعه کنید.',
    genericError: 'مشکلی از طرف من پیش آمد — دوباره امتحان کنید، یا از طریق vozit.net ارسال کنید.',
    noVideoYet: 'هر زمان آماده بودید ویدیوی خود را برایم بفرستید — به‌صورت فایل (گیره کاغذ ← فایل)، نه پیام ویدیویی.',
    payoutsLinkMsg: (link: string) => `💰 این لینک خصوصی پرداخت‌های شماست: ${link}\n\nاین لینک فقط برای شماست و برای مدت کوتاهی کار می‌کند — اگر کار نکرد، کافی است دوباره /payouts را بنویسید تا لینک جدیدی دریافت کنید.`,
    settingsLinkMsg: (link: string) => `⚙️ این لینک خصوصی تنظیمات شماست: ${link}\n\nاین لینک فقط برای شماست و برای مدت کوتاهی کار می‌کند — اگر کار نکرد، کافی است دوباره /profile را بنویسید تا لینک جدیدی دریافت کنید.`,
    linkGenFailed: 'در حال حاضر نتوانستم لینک شما را بسازم — کمی بعد دوباره امتحان کنید.',
  },
}

export function languageFromChoice(choice: string): BotLanguage | null {
  const map: Record<string, BotLanguage> = {
    '1': 'en', '2': 'es', '3': 'ar', '4': 'fr', '5': 'uk', '6': 'pt', '7': 'sw',
    '8': 'ru', '9': 'id', '10': 'fa',
  }
  return map[choice.trim()] || null
}

// ── LANGUAGE DETECTION / TRANSLATION (Claude API) ────────────────
// Matches the same model + call shape already used elsewhere in this
// codebase (src/lib/security.ts's checkAudioCopyright, src/lib/translate.ts)
// rather than introducing a different Claude-calling convention.

async function callClaude(system: string, user: string, maxTokens = 200): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || null
  } catch (e) {
    captureError(e, { fn: 'callClaude (bot-common)' })
    return null
  }
}

// Returns an ISO 639-1 code. Falls back to 'en' if detection fails or the
// text is too short/ambiguous to tell (e.g. just a caption of one emoji) —
// a wrong guess here only affects which language the bot replies in, not
// whether the report itself gets created.
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length < 2) return 'en'
  const result = await callClaude(
    'Identify the language of the user message. Reply with ONLY its ISO 639-1 two-letter code (e.g. en, es, ar, fr, uk, pt, sw), nothing else.',
    text.slice(0, 500),
    5,
  )
  const code = result?.toLowerCase().match(/[a-z]{2}/)?.[0]
  return code || 'en'
}

// Translates arbitrary reporter-written text INTO English for internal
// storage/analysis (the 5W fields, AI analysis, and moderation all assume
// English input) — the opposite direction from src/lib/translate.ts, which
// translates a published report OUT of English for a viewer.
export async function translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
  if (!text || !text.trim()) return text
  if (sourceLanguage === 'en') return text
  const result = await callClaude(
    'Translate the user message into English. Reply with ONLY the translation, no notes or quotation marks.',
    text.slice(0, 2000),
    500,
  )
  return result || text // untranslated original is still usable input, never block on a failed translation
}

// ── VIDEO VALIDATION ──────────────────────────────────────────────
// Matches the website's own 61-90s window (src/app/upload/page.tsx's
// <CameraRecorder maxDuration={90} minDuration={61}/>) so a bot submission
// can never bypass a rule the website enforces.
export function validateVideoDuration(seconds: number): 'too_short' | 'too_long' | 'valid' {
  if (seconds < 61) return 'too_short'
  if (seconds > 90) return 'too_long'
  return 'valid'
}

// ── CREDIBILITY MODIFIERS BY SUBMISSION CHANNEL ───────────────────
export type SubmissionChannel = 'website' | 'app' | 'telegram' | 'whatsapp'
export type MetadataQuality = 'full' | 'partial' | 'minimal'

export function credibilityModifier(channel: SubmissionChannel, metadataQuality: MetadataQuality, hasLocationPin: boolean): number {
  if (!hasLocationPin) return -3
  if ((channel === 'website' || channel === 'app') && metadataQuality === 'full') return 5
  if (channel === 'telegram' && metadataQuality === 'full') return 5
  if (channel === 'telegram') return 2
  if (channel === 'whatsapp') return 1
  return 0
}

// ── REPORT CREATION ────────────────────────────────────────────────
// Deliberately duplicates (rather than imports/refactors) the insert logic
// in src/app/api/reports/route.ts's POST handler, instead of extracting a
// shared helper the live website route would also need to switch to — that
// route is the most heavily-used, already-correct path in the app, and
// changing it to share code with a brand-new bot entry point is a
// regression risk this change doesn't need to take on. Keep the two in sync
// by hand if the real insert shape changes.
export async function createReportFromBot(params: {
  userId: string
  title: string
  who?: string
  what?: string
  whereText?: string
  why?: string
  whenHappened?: string
  locationName?: string
  locationLat?: number | null
  locationLng?: number | null
  muxUploadId: string
  submissionChannel: SubmissionChannel
  metadataQuality: MetadataQuality
  reportedTimestamp?: string
  deviceInfo?: string
  originalFilename?: string
  reportMetadata?: Record<string, any>
}): Promise<{ report: any; status: 'published' | 'flagged' | 'removed' } | { error: string }> {
  const admin = createAdminClient()

  const titleClean = sanitizeInput(params.title, 200)
  const whoClean = params.who ? sanitizeInput(params.who, 2000) : ''
  const whatClean = params.what ? sanitizeInput(params.what, 2000) : ''
  const whereTextClean = params.whereText ? sanitizeInput(params.whereText, 500) : ''
  const whyClean = params.why ? sanitizeInput(params.why, 2000) : ''
  const locationNameClean = params.locationName
    ? sanitizeInput(params.locationName, 200)
    : whereTextClean || (params.locationLat != null && params.locationLng != null ? `${params.locationLat}, ${params.locationLng}` : 'Unknown location')

  const textModeration = await moderateContent({
    title: titleClean, who: whoClean, what: whatClean, why: whyClean,
    whenHappened: params.whenHappened || null, locationName: locationNameClean,
    locationLat: params.locationLat ?? null, locationLng: params.locationLng ?? null,
  })
  let status: 'published' | 'flagged' | 'removed' = 'published'
  if (textModeration.autoAction === 'auto_remove' || textModeration.autoAction === 'auto_ban') status = 'removed'
  else if (textModeration.autoAction === 'flag_review') status = 'flagged'

  const hasLocationPin = params.locationLat != null && params.locationLng != null
  const modifier = credibilityModifier(params.submissionChannel, params.metadataQuality, hasLocationPin)

  const { data: report, error } = await admin.from('reports').insert({
    user_id: params.userId,
    title: titleClean,
    who: whoClean,
    what: whatClean,
    where_text: whereTextClean,
    when_happened: params.whenHappened || new Date().toISOString(),
    why: whyClean,
    location_name: locationNameClean,
    location_lat: params.locationLat ?? null,
    location_lng: params.locationLng ?? null,
    category: 'other',
    mux_upload_id: params.muxUploadId,
    status,
    show_crisis_resources: textModeration.showCrisisResources,
    upvotes: 0,
    downvotes: 0,
    credibility_pct: Math.max(0, Math.min(100, 80 + modifier)),
    trending_score: status === 'published' ? 100 : 0,
    submission_channel: params.submissionChannel,
    metadata_quality: params.metadataQuality,
    reported_timestamp: params.reportedTimestamp || null,
    device_info: params.deviceInfo || null,
    original_filename: params.originalFilename || null,
    report_metadata: params.reportMetadata || null,
    metadata_credibility_modifier: modifier,
  }).select().single()

  if (error) {
    captureError(error, { fn: 'createReportFromBot' })
    return { error: error.message }
  }

  await logModerationResult(admin, report.id, textModeration)
  return { report, status }
}

// Creates a real Supabase Auth identity (reports.user_id / users.id is a
// hard foreign key to auth.users.id — a plain insert into public.users
// without this first would fail outright) and lets the existing
// handle_new_user DB trigger create the public.users row, then fills in the
// bot-collected profile fields. Mirrors /api/auth/register's own fix for
// the exact same trigger (update, never insert, the row it already made).
export async function createAccountFromBot(params: {
  email: string
  username: string
  displayName: string
  telegramId: string
  language?: string
}): Promise<{ userId: string } | { error: string }> {
  const admin = createAdminClient()
  const usernameClean = sanitizeInput(params.username, 30).toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!usernameClean) return { error: 'invalid username' }

  const { data: existingUsername } = await admin.from('users').select('id').eq('username', usernameClean).single()
  if (existingUsername) return { error: 'username taken' }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: params.email,
    email_confirm: true, // no email-click verification loop exists for a chat-originated account
    password: crypto.randomUUID() + crypto.randomUUID(), // reporter never needs this password directly; website login can use "forgot password" later if they ever want it
    user_metadata: { username: usernameClean, display_name: sanitizeInput(params.displayName, 50) },
  })
  if (authError || !authData.user) return { error: authError?.message || 'account creation failed' }

  const { error: profileError } = await admin.from('users')
    .update({
      email: params.email,
      username: usernameClean,
      display_name: sanitizeInput(params.displayName, 50),
      tier: 'starter', credibility_score: 80, total_earned: 0, is_admin: false, is_banned: false,
      telegram_id: params.telegramId,
      telegram_language: params.language || null,
      email_verified: true,
    })
    .eq('id', authData.user.id)
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id).catch(() => {})
    captureError(profileError, { fn: 'createAccountFromBot (profile update)' })
    return { error: profileError.message }
  }

  return { userId: authData.user.id }
}

// Generates a one-time Supabase sign-in link for an already-created bot
// account, landing the reporter straight on a given website page — used so
// "set up payouts" never means "create a password and log in," since
// bot-created accounts don't have a password the reporter actually knows
// (see createAccountFromBot above; its only password was randomly
// generated and thrown away). Supabase owns this link's expiry and
// single-use behavior, not a custom token this app would have to secure
// itself — if one expires, the reporter just asks the bot again
// (/payouts or /profile) for a fresh one.
export async function generateBotLoginLink(params: {
  email: string
  redirectPath: string
}): Promise<{ url: string } | { error: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: params.email,
    options: { redirectTo: `https://www.vozit.net/auth/callback?next=${encodeURIComponent(params.redirectPath)}` },
  })
  if (error || !data?.properties?.action_link) {
    captureError(error, { fn: 'generateBotLoginLink' })
    return { error: error?.message || 'link generation failed' }
  }
  return { url: data.properties.action_link }
}

// Pushes already-downloaded video bytes straight to Mux, the same
// direct-upload pattern already used for TikTok/X (download bytes once,
// re-upload directly) rather than handing Mux a Telegram file URL — that
// URL embeds the bot token in its path, which there's no reason to expose
// to a third party when the bytes are already in hand.
export async function uploadVideoToMux(videoBuffer: Buffer, mimeType: string): Promise<{ uploadId: string } | { error: string }> {
  try {
    const { uploadId, uploadUrl } = await createMuxUpload()
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType || 'video/mp4' },
      body: videoBuffer,
    })
    if (!putRes.ok) return { error: `Mux upload failed: ${putRes.status}` }
    return { uploadId }
  } catch (e: any) {
    captureError(e, { fn: 'uploadVideoToMux' })
    return { error: e.message || 'upload failed' }
  }
}
