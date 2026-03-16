let triggerBtn = null;
let floatingWindow = null;
let currentSelectedText = "";

let popupCenterX = 0;
let popupTopY = 0;

const BASE_URL = "https://aiterm-proxy.sarkkofag.workers.dev";

// --- Добавляем наш словарь и хелпер для перевода кодов языков ---
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

function getLocalizedLangShort(langCode, uiLangCode) {
    if (!langCode) return "???";
    const cleanCode = langCode.trim().toLowerCase().split('-')[0];

    if (uiLangCode === 'ru' && ruNamesContent[cleanCode]) {
        return ruNamesContent[cleanCode].substring(0, 3).toUpperCase();
    }

    try {
        const displayNames = new Intl.DisplayNames([uiLangCode], { type: 'language' });
        const translated = displayNames.of(cleanCode);
        if (translated) {
            return translated.substring(0, 3).toUpperCase();
        }
    } catch (e) {
        console.error("Language translation error", e);
    }
    return cleanCode.substring(0, 3).toUpperCase();
}
// ------------------------------------------------------------------

function removeUI() {
    if (triggerBtn) {
        triggerBtn.remove();
        triggerBtn = null;
    }
    if (floatingWindow) {
        floatingWindow.remove();
        floatingWindow = null;
    }
}

function getInputSelectionRect(input) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const computedStyle = window.getComputedStyle(input);
    const div = document.createElement('div');
    const stylesToCopy = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'boxSizing'];
    stylesToCopy.forEach(style => div.style[style] = computedStyle[style]);
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.width = input.tagName === 'INPUT' ? 'auto' : computedStyle.width;
    div.style.top = '0';
    div.style.left = '0';
    const text = input.value;
    div.textContent = text.substring(0, start);
    const span = document.createElement('span');
    span.textContent = text.substring(start, end);
    div.appendChild(span);
    document.body.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const absoluteLeft = inputRect.left + spanRect.left - input.scrollLeft + window.scrollX;
    const absoluteTop = inputRect.top + spanRect.top - input.scrollTop + window.scrollY;
    const width = spanRect.width;
    const height = spanRect.height;
    document.body.removeChild(div);
    return {
        left: absoluteLeft,
        top: absoluteTop,
        right: absoluteLeft + width,
        bottom: absoluteTop + height,
        width: width,
        height: height
    };
}

document.addEventListener('mouseup', (event) => {
    if ((floatingWindow && floatingWindow.contains(event.target)) || (triggerBtn && triggerBtn.contains(event.target))) return;

    setTimeout(() => {
        chrome.storage.local.get(['aitermQuickTranslate'], (res) => {
            if (res.aitermQuickTranslate === false) {
                removeUI();
                return;
            }

            let text = "";
            let rect = null;
            const activeEl = document.activeElement;
            const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

            if (isInput) {
                text = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd).trim();
                if (text.length > 0 && text.length <= 50) rect = getInputSelectionRect(activeEl);
            } else {
                const selection = window.getSelection();
                text = selection ? selection.toString().trim() : '';
                if (text.length > 0 && text.length <= 50 && selection.rangeCount > 0) {
                    const domRect = selection.getRangeAt(0).getBoundingClientRect();
                    rect = {
                        left: domRect.left + window.scrollX,
                        top: domRect.top + window.scrollY,
                        right: domRect.right + window.scrollX,
                        bottom: domRect.bottom + window.scrollY,
                        width: domRect.width,
                        height: domRect.height
                    };
                }
            }

            if (text.length > 0 && text.length <= 50 && rect) {
                currentSelectedText = text;
                removeUI();
                triggerBtn = document.createElement('div');
                triggerBtn.id = 'aiterm-trigger-btn';
                triggerBtn.textContent = 'AiTerm';
                document.body.appendChild(triggerBtn);
                popupCenterX = rect.left + (rect.width / 2);
                popupTopY = rect.bottom + 8;
                const btnWidth = triggerBtn.offsetWidth;
                triggerBtn.style.left = `${popupCenterX - (btnWidth / 2)}px`;
                triggerBtn.style.top = `${popupTopY}px`;
                triggerBtn.addEventListener('mousedown', (e) => e.stopPropagation());
                triggerBtn.addEventListener('click', openFloatingWindow);
            } else {
                removeUI();
            }
        });
    }, 10);
});

document.addEventListener('mousedown', (event) => {
    if (triggerBtn && !triggerBtn.contains(event.target)) {
        triggerBtn.remove();
        triggerBtn = null;
    }
    if (floatingWindow && !floatingWindow.contains(event.target)) {
        floatingWindow.remove();
        floatingWindow = null;
    }
});

const uiTranslations = {
    en: {
        translateBtn: "Translate",
        loading: "Loading...",
        error: "Error...",
        auto: "AUTO",
        saveHint: "To save this word, translate it in the main extension menu.",
        disableHint: "To disable this popup, go to Settings in the main menu.",
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
        disableHint: "Щоб вимкнути це вікно, зайдіть у Налаштування (Settings) в головному меню.",
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
        disableHint: "Чтобы отключить эту функцию - зайдите в настройки (Settings) в главном плагине.",
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

function openFloatingWindow() {
    if (triggerBtn) {
        triggerBtn.remove();
        triggerBtn = null;
    }

    chrome.storage.local.get(['aitermTargetLangName', 'aitermUILanguage', 'aitermTheme', 'aitermUserEmail'], (result) => {
        const targetLangName = result.aitermTargetLangName || 'English';
        const uiLangCode = result.aitermUILanguage || 'en';
        const t = uiTranslations[uiLangCode] || uiTranslations['en'];
        const theme = result.aitermTheme || 'light';
        const isLoggedIn = !!result.aitermUserEmail;

        const langMap = {
            'Arabic': 'ar', 'Bengali': 'bn', 'Chinese': 'zh', 'Czech': 'cs', 'Danish': 'da',
            'Dutch': 'nl', 'English': 'en', 'Finnish': 'fi', 'French': 'fr', 'German': 'de',
            'Greek': 'el', 'Hebrew': 'he', 'Hindi': 'hi', 'Hungarian': 'hu', 'Indonesian': 'id',
            'Italian': 'it', 'Japanese': 'ja', 'Korean': 'ko', 'Norwegian': 'no', 'Persian': 'fa',
            'Polish': 'pl', 'Portuguese': 'pt', 'Romanian': 'ro', 'Russian': 'ru', 'Spanish': 'es',
            'Swedish': 'sv', 'Thai': 'th', 'Turkish': 'tr', 'Ukrainian': 'uk', 'Vietnamese': 'vi'
        };

        const targetCode = langMap[targetLangName] || 'en';
        // Используем хелпер для языка назначения
        const shortLang = getLocalizedLangShort(targetCode, uiLangCode);

        if (floatingWindow) {
            floatingWindow.remove();
            floatingWindow = null;
        }

        floatingWindow = document.createElement('div');
        floatingWindow.id = 'aiterm-floating-window';
        if (theme === 'dark') floatingWindow.classList.add('aiterm-dark');

        if (!isLoggedIn) {
            floatingWindow.innerHTML = `
                <button class="aiterm-cancel-btn" id="aiterm-auth-close" title="Close" style="display:block; top:8px; right:8px; position:absolute;">✖</button>
                <div class="aiterm-header"><span class="aiterm-title-ai">Ai</span><span class="aiterm-title-term">Term</span></div>
                <div style="text-align: center; padding: 10px 10px;">
                    <div style="font-size: 15px; font-weight: bold; margin-bottom: 8px;">${t.authTitle}</div>
                    <div style="font-size: 12px; opacity: 0.7; margin-bottom: 10px; line-height: 1.4;">${t.authSub}</div>
                </div>
                <div class="aiterm-disable-hint">${t.disableHint}</div>
            `;
            document.body.appendChild(floatingWindow);

            const windowWidth = 370;
            const viewportWidth = document.documentElement.clientWidth;
            let leftPosition = popupCenterX - (windowWidth / 2);
            leftPosition = Math.max(10, Math.min(leftPosition, viewportWidth - windowWidth - 10));
            floatingWindow.style.left = `${leftPosition}px`;
            floatingWindow.style.top = `${popupTopY}px`;

            floatingWindow.addEventListener('mousedown', (e) => e.stopPropagation());
            document.getElementById('aiterm-auth-close').addEventListener('click', removeUI);
            return;
        }

        floatingWindow.innerHTML = `
            <div class="aiterm-header"><span class="aiterm-title-ai">Ai</span><span class="aiterm-title-term">Term</span></div>
            <div class="aiterm-texts-row">
                <div class="aiterm-text-box" id="aiterm-source-text">${currentSelectedText}</div>
                <div class="aiterm-middle-col">
                    <div class="aiterm-arrow" id="aiterm-arrow">&rarr;</div>
                    <button class="aiterm-cancel-btn" id="aiterm-cancel-btn" title="Cancel">✖</button>
                </div>
                <div class="aiterm-text-box" id="aiterm-target-text">...</div>
            </div>
            <div class="aiterm-controls-row">
                <div class="aiterm-lang-tag" id="aiterm-source-lang">${t.auto}</div>
                <button class="aiterm-translate-btn" id="aiterm-translate-btn">${t.translateBtn}</button>
                <div class="aiterm-lang-tag" title="${targetLangName}">${shortLang}</div>
            </div>
            <div class="aiterm-save-hint">${t.saveHint}</div>
            <div class="aiterm-disable-hint">${t.disableHint}</div>
        `;

        document.body.appendChild(floatingWindow);

        const windowWidth = 370;
        const viewportWidth = document.documentElement.clientWidth;
        let leftPosition = popupCenterX - (windowWidth / 2);
        leftPosition = Math.max(10, Math.min(leftPosition, viewportWidth - windowWidth - 10));

        floatingWindow.style.left = `${leftPosition}px`;
        floatingWindow.style.top = `${popupTopY}px`;
        floatingWindow.addEventListener('mousedown', (e) => e.stopPropagation());

        let abortController = null;
        const cancelBtn = document.getElementById('aiterm-cancel-btn');
        cancelBtn.addEventListener('click', () => {
            if (abortController) abortController.abort();
        });

        document.getElementById('aiterm-translate-btn').addEventListener('click', async () => {
            const targetTextEl = document.getElementById('aiterm-target-text');
            const sourceLangTagEl = document.getElementById('aiterm-source-lang');
            const arrowEl = document.getElementById('aiterm-arrow');

            chrome.storage.local.get(['aitermQuickLimits', 'aitermPlan'], async (limRes) => {
                let currentLimits = limRes.aitermQuickLimits !== undefined ? limRes.aitermQuickLimits : 30;

                if (currentLimits <= 0) {
                    targetTextEl.textContent = t.limitReached;
                    targetTextEl.style.color = "#dc3545";
                    return;
                }

                targetTextEl.textContent = t.loading;
                targetTextEl.style.color = "";
                arrowEl.classList.add('aiterm-tremble');
                cancelBtn.style.display = 'block';

                abortController = new AbortController();
                const signal = abortController.signal;

                const prompt = `Translate "${currentSelectedText}" into ${targetLangName}. 
                Auto-detect the source language.
                Return STRICTLY a JSON object with EXACTLY this structure:
                { "translation": "string", "detectedSourceLangCode": "string" }
                Rules: NO markdown, NO formatting, JUST valid JSON.`;

                try {
                    const response = await fetch(`${BASE_URL}/translate`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            prompt: prompt,
                            email: result.aitermUserEmail,
                            source: 'mini'
                        }),
                        signal: signal
                    });

                    if (!response.ok) {
                        console.error("HTTP Error from backend:", response.status);
                        throw new Error("HTTP " + response.status);
                    }

                    const resultData = await response.json();
                    const rawText = resultData.candidates[0].content.parts[0].text;

                    let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const match = cleanedText.match(/\{[\s\S]*\}/);
                    if (match) cleanedText = match[0];

                    const data = JSON.parse(cleanedText);

                    targetTextEl.textContent = data.translation;

                    // Используем хелпер для языка исходника
                    const sourceShort = getLocalizedLangShort(data.detectedSourceLangCode, uiLangCode);
                    sourceLangTagEl.textContent = sourceShort;
                    sourceLangTagEl.title = data.detectedSourceLangCode.toUpperCase();

                    chrome.storage.local.set({aitermQuickLimits: currentLimits - 1});

                } catch (error) {
                    if (error.name === 'AbortError') targetTextEl.textContent = "...";
                    else {
                        console.error("AiTerm Translation Error:", error);
                        targetTextEl.textContent = t.error;
                    }
                } finally {
                    arrowEl.classList.remove('aiterm-tremble');
                    cancelBtn.style.display = 'none';
                    abortController = null;
                }
            });
        });
    });
}