const ruNamesContent = {
    'en': 'Английский', 'ru': 'Русский', 'es': 'Испанский', 'fr': 'Французский',
    'de': 'Немецкий', 'zh': 'Китайский', 'uk': 'Украинский', 'pl': 'Польский',
    'ar': 'Арабский', 'ja': 'Японский', 'ko': 'Корейский', 'pt': 'Португальский',
    'it': 'Итальянский', 'tr': 'Турецкий', 'hi': 'Хинди', 'he': 'Иврит',
    'nl': 'Голландский', 'sv': 'Шведский', 'fi': 'Финский', 'no': 'Норвежский',
    'da': 'Датский', 'cs': 'Чешский', 'el': 'Греческий', 'hu': 'Венгерский',
    'ro': 'Румынский', 'id': 'Индонезийский', 'th': 'Тайский', 'vi': 'Вьетнамский',
    'bn': 'Бенгальский', 'fa': 'Персидский'
};

const reloadTranslations = {
    en: { title: "Plugin is inactive", desc: "Please refresh the page to continue using AiTerm.", btnText: "Refresh page" },
    uk: { title: "Плагін неактивний", desc: "Оновіть сторінку, щоб продовжити використання AiTerm.", btnText: "Оновити сторінку" },
    ru: { title: "Плагин не активен", desc: "Обновите страницу, чтобы продолжить использование AiTerm.", btnText: "Обновить страницу" },
    es: { title: "El plugin está inactivo", desc: "Por favor, actualiza la página para continuar usando AiTerm.", btnText: "Actualizar página" },
    pl: { title: "Wtyczka jest nieaktywna", desc: "Odśwież stronę, aby kontynuować korzystanie z AiTerm.", btnText: "Odśwież stronę" },
    zh: { title: "插件未激活", desc: "请刷新页面以继续使用 AiTerm。", btnText: "刷新页面" },
    ar: { title: "الإضافة غير نشطة", desc: "يرجى تحديث الصفحة لمواصلة استخدام AiTerm.", btnText: "تحديث الصفحة" },
    fr: { title: "Le plugin est inactif", desc: "Veuillez actualiser la page pour continuer à utiliser AiTerm.", btnText: "Actualiser la page" },
    pt: { title: "O plugin está inativo", desc: "Por favor, atualize a página para continuar usando o AiTerm.", btnText: "Atualizar página" },
    hi: { title: "प्लगइन निष्क्रिय है", desc: "AiTerm का उपयोग जारी रखने के लिए कृपया पृष्ठ को रीफ्रेश करें।", btnText: "पृष्ठ रीफ्रेश करें" }
};

const uiTranslations = {
    en: {
        translateBtn: "Translate",
        loading: "Loading...",
        error: "Error...",
        auto: "AUTO",
        saveHint: "To save this word, translate it in the main extension menu.",
        disableHint: "To configure popups, go to Settings in the main menu.",
        authTitle: "Not logged in",
        authSub: "Please click the AiTerm extension icon in your browser toolbar to log in.",
        limitReached: "Limit reached. Reset soon."
    },
    uk: {
        translateBtn: "Перекласти",
        loading: "Завантаження...",
        error: "Помилка...",
        auto: "АВТО",
        saveHint: "Щоб зберегти слово у словник, перекладіть його в головному меню.",
        disableHint: "Щоб налаштувати вікна, зайдіть у Налаштування (Settings).",
        authTitle: "Ви не авторизовані",
        authSub: "Будь ласка, клікніть по іконці розширення AiTerm у панелі браузера, щоб увійти в акаунт.",
        limitReached: "Ліміт вичерпано."
    },
    ru: {
        translateBtn: "Перевести",
        loading: "Загрузка...",
        error: "Ошибка...",
        auto: "АВТО",
        saveHint: "Что б сохранить это слово в словник, вам нужно перевести это слово в основном плагине и сохранить его там.",
        disableHint: "Настроить появление окна можно в настройках (Settings).",
        authTitle: "Вы не авторизованы",
        authSub: "Пожалуйста, кликните по иконке расширения AiTerm в панели браузера, чтобы войти в аккаунт.",
        limitReached: "Лимит исчерпан."
    },
    es: {
        translateBtn: "Traducir",
        loading: "Cargando...",
        error: "Error...",
        auto: "AUTO",
        saveHint: "Para guardar esta palabra, tradúcela en el menú principal de la extensión.",
        disableHint: "Para desactivar esto, ve a Configuración en el menú principal.",
        authTitle: "No has iniciado sesión",
        authSub: "Haz clic en el icono de la extensión AiTerm para iniciar sesión.",
        limitReached: "Límite alcanzado."
    },
    pl: {
        translateBtn: "Tłumacz",
        loading: "Ładowanie...",
        error: "Błąd...",
        auto: "AUTO",
        saveHint: "Aby zapisać to słowo, przetłumacz je w głównym menu rozszerzenia.",
        disableHint: "Aby wyłączyć tę funkcję, przejdź do Ustawień w menu głównym.",
        authTitle: "Nie zalogowano",
        authSub: "Kliknij ikonę rozszerzenia AiTerm, aby się zalogować.",
        limitReached: "Limit wyczerpany."
    },
    zh: {
        translateBtn: "翻译",
        loading: "加载中...",
        error: "错误...",
        auto: "自动",
        saveHint: "要将此词保存到词典中，请在主扩展菜单中翻译它。",
        disableHint: "要禁用此功能，请转到主菜单中的设置。",
        authTitle: "未登录",
        authSub: "请单击浏览器中的 AiTerm 扩展图标以登录。",
        limitReached: "达到限制。"
    },
    ar: {
        translateBtn: "ترجمة",
        loading: "جار التحميل...",
        error: "خطأ...",
        auto: "تلقائي",
        saveHint: "لحفظ هذه الكلمة، يرجى ترجمتها في القائمة الرئيسية للإضافة.",
        disableHint: "لتعطيل هذه الميزة، انتقل إلى الإعدادات في القائمة الرئيسية.",
        authTitle: "لم يتم تسجيل الدخول",
        authSub: "الرجاء النقر فوق أيقونة إضافة AiTerm لتسجيل الدخول.",
        limitReached: "تم الوصول إلى الحد."
    },
    fr: {
        translateBtn: "Traduire",
        loading: "Chargement...",
        error: "Erreur...",
        auto: "AUTO",
        saveHint: "Pour enregistrer ce mot, traduisez-le dans le menu principal de l'extension.",
        disableHint: "Pour désactiver cette fenêtre, allez dans les Paramètres du menu principal.",
        authTitle: "Non connecté",
        authSub: "Veuillez cliquer sur l'icône de l'extension AiTerm dans la barre de votre navigateur pour vous connecter.",
        limitReached: "Limite atteinte."
    },
    pt: {
        translateBtn: "Traduzir",
        loading: "Carregando...",
        error: "Erro...",
        auto: "AUTO",
        saveHint: "Para salvar esta palavra, traduza-a no menu principal da extensão.",
        disableHint: "Para desativar este popup, vá para Configurações no menu principal.",
        authTitle: "Não conectado",
        authSub: "Por favor, clique no ícone da extensão AiTerm na barra do navegador para fazer login.",
        limitReached: "Limite atingido."
    },
    hi: {
        translateBtn: "अनुवाद",
        loading: "लोड हो रहा है...",
        error: "त्रुटि...",
        auto: "स्वत:",
        saveHint: "इस शब्द को सहेजने के लिए, इसे मुख्य एक्सटेंशन मेनू में अनुवाद करें।",
        disableHint: "इस पॉपअप को अक्षम करने के लिए, मुख्य मेनू में सेटिंग्स पर जाएं।",
        authTitle: "लॉग इन नहीं है",
        authSub: "लॉग इन करने के लिए कृपया अपने ब्राउज़र टूलबार में AiTerm एक्सटेंशन आइकन पर क्लिक करें。",
        limitReached: "सीमा पूरी हो गई।"
    }
};