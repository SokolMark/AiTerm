let floatingWindow = null;
let currentSelectedText = "";

let popupCenterX = 0;
let popupTopY = 0;

// Кешируем только настройки автопопапа
let cachedAutoPopup = false;

// Безопасная проверка, жив ли контекст плагина
function isExtensionValid() {
    try {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
        return false;
    }
}

if (isExtensionValid() && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['aitermAutoPopup'], (res) => {
        if (!chrome.runtime.lastError) {
            if (res.aitermAutoPopup !== undefined) cachedAutoPopup = res.aitermAutoPopup;
        }
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.aitermAutoPopup) cachedAutoPopup = changes.aitermAutoPopup.newValue;
        }
    });
}

const translationCache = new Map();
const BASE_URL = "https://aiterm-proxy.sarkkofag.workers.dev";

function getLocalizedLangShort(langCode, uiLangCode) {
    if (!langCode) return "???";
    const cleanCode = langCode.trim().toLowerCase().split('-')[0];

    // ruNamesContent теперь берется из translations.js
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

function removeUI() {
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

// Окно-заглушка со старым белым дизайном
function showReloadPopup() {
    removeUI();

    floatingWindow = document.createElement('div');
    floatingWindow.id = 'aiterm-floating-window';

    floatingWindow.style.position = 'absolute';
    floatingWindow.style.zIndex = '2147483647';
    floatingWindow.style.background = '#ffffff';
    floatingWindow.style.color = '#333333';
    floatingWindow.style.border = '1px solid #e5e7eb';
    floatingWindow.style.borderRadius = '12px';
    floatingWindow.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    floatingWindow.style.padding = '0';
    floatingWindow.style.overflow = 'hidden';
    floatingWindow.style.fontFamily = 'Arial, sans-serif';

    const browserLang = navigator.language.split('-')[0];
    // reloadTranslations теперь берется из translations.js
    const t = reloadTranslations[browserLang] || reloadTranslations['en'];

    floatingWindow.innerHTML = `
        <div style="display: flex; justify-content: center; padding: 12px 10px 5px 10px;">
            <span style="color: #007bff; font-weight: bold; font-size: 16px;">Ai</span><span style="color: #888888; font-weight: bold; font-size: 16px;">Term</span>
        </div>
        <div style="text-align: center; padding: 10px 15px 15px 15px;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #dc3545;">
                ${t.title}
            </div>
            <div style="font-size: 12px; margin-bottom: 16px; color: #666666; line-height: 1.4;">
                ${t.desc}
            </div>
            <button id="aiterm-reload-btn" style="
                background: #007bff; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 6px; 
                cursor: pointer; 
                font-weight: bold;
                width: 100%;
                transition: opacity 0.2s;
            ">${t.btnText}</button>
        </div>
    `;

    document.body.appendChild(floatingWindow);

    const btn = document.getElementById('aiterm-reload-btn');
    if (btn) {
        btn.addEventListener('mouseover', () => btn.style.opacity = '0.8');
        btn.addEventListener('mouseout', () => btn.style.opacity = '1');
        btn.addEventListener('click', () => window.location.reload());
    }

    const windowWidth = 260;
    const viewportWidth = document.documentElement.clientWidth;
    let leftPosition = popupCenterX - (windowWidth / 2);
    leftPosition = Math.max(10, Math.min(leftPosition, viewportWidth - windowWidth - 10));

    floatingWindow.style.left = `${leftPosition}px`;
    floatingWindow.style.top = `${popupTopY}px`;
    floatingWindow.style.width = `${windowWidth}px`;

    floatingWindow.addEventListener('mousedown', (e) => e.stopPropagation());
}

// Слушатель вызова из контекстного меню (ПКМ)
if (isExtensionValid() && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "showContextMenuPopup") {
            let text = "";
            let rect = null;
            const activeEl = document.activeElement;
            const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

            if (isInput) {
                text = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd).trim();
                if (text.length > 0) rect = getInputSelectionRect(activeEl);
            } else {
                const selection = window.getSelection();
                text = selection ? selection.toString().trim() : '';
                if (text.length > 0 && selection.rangeCount > 0) {
                    const domRect = selection.getRangeAt(0).getBoundingClientRect();
                    if (domRect.width > 0 && domRect.height > 0) {
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
            }

            if (text.length > 0 && rect) {
                currentSelectedText = text;
                popupCenterX = rect.left + (rect.width / 2);
                popupTopY = rect.bottom + 8;
                openFloatingWindow();
            }
            sendResponse({success: true});
        }
    });
}

// Слушатель для автоматического всплывания
document.addEventListener('mouseup', (event) => {
    if (floatingWindow && floatingWindow.contains(event.target)) return;

    setTimeout(() => {
        if (!cachedAutoPopup) return;

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
                if (domRect.width > 0 && domRect.height > 0) {
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
        }

        if (text.length > 0 && text.length <= 50 && rect) {
            currentSelectedText = text;
            popupCenterX = rect.left + (rect.width / 2);
            popupTopY = rect.bottom + 8;

            if (!isExtensionValid()) {
                showReloadPopup();
                return;
            }

            try {
                chrome.storage.local.get(['aitermAutoPopup'], (res) => {
                    if (chrome.runtime.lastError) {
                        showReloadPopup();
                        return;
                    }

                    if (res.aitermAutoPopup !== true) return;

                    removeUI();
                    openFloatingWindow();
                });
            } catch (e) {
                showReloadPopup();
            }
        } else {
            removeUI();
        }
    }, 10);
});

// Закрываем окно при клике вне его
document.addEventListener('mousedown', (event) => {
    if (floatingWindow && !floatingWindow.contains(event.target)) {
        floatingWindow.remove();
        floatingWindow = null;
    }
});

function openFloatingWindow() {
    if (!isExtensionValid()) {
        showReloadPopup();
        return;
    }

    try {
        chrome.storage.local.get(['aitermTargetLangName', 'aitermUILanguage', 'aitermTheme', 'aitermUserEmail'], (result) => {
            if (chrome.runtime.lastError) {
                showReloadPopup();
                return;
            }

            const targetLangName = result.aitermTargetLangName || 'English';
            const uiLangCode = result.aitermUILanguage || 'en';
            // uiTranslations теперь берется из translations.js
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
            const shortLang = getLocalizedLangShort(targetCode, uiLangCode);

            removeUI();

            floatingWindow = document.createElement('div');
            floatingWindow.id = 'aiterm-floating-window';
            floatingWindow.style.position = 'absolute';
            floatingWindow.style.zIndex = '2147483647';

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
                positionWindow();
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
            positionWindow();
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

                const cacheKey = `${currentSelectedText.trim().toLowerCase()}_${targetLangName}`;

                if (translationCache.has(cacheKey)) {
                    const cachedData = translationCache.get(cacheKey);
                    targetTextEl.textContent = cachedData.translation;
                    const sourceShort = getLocalizedLangShort(cachedData.detectedSourceLangCode, uiLangCode);
                    sourceLangTagEl.textContent = sourceShort;
                    sourceLangTagEl.title = cachedData.detectedSourceLangCode.toUpperCase();
                    return;
                }

                if (!isExtensionValid()) {
                    showReloadPopup();
                    return;
                }

                try {
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

                            if (!response.ok) throw new Error("HTTP " + response.status);

                            const resultData = await response.json();
                            const rawText = resultData.candidates[0].content.parts[0].text;

                            let cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                            const match = cleanedText.match(/\{[\s\S]*\}/);
                            if (match) cleanedText = match[0];

                            const data = JSON.parse(cleanedText);
                            targetTextEl.textContent = data.translation;

                            const sourceShort = getLocalizedLangShort(data.detectedSourceLangCode, uiLangCode);
                            sourceLangTagEl.textContent = sourceShort;
                            sourceLangTagEl.title = data.detectedSourceLangCode.toUpperCase();

                            translationCache.set(cacheKey, data);
                            chrome.storage.local.set({aitermQuickLimits: currentLimits - 1});
                        } catch (error) {
                            if (error.name === 'AbortError') targetTextEl.textContent = "...";
                            else targetTextEl.textContent = t.error;
                        } finally {
                            arrowEl.classList.remove('aiterm-tremble');
                            cancelBtn.style.display = 'none';
                            abortController = null;
                        }
                    });
                } catch (e) {
                    showReloadPopup();
                }
            });

            function positionWindow() {
                const windowWidth = 370;
                const viewportWidth = document.documentElement.clientWidth;
                let leftPosition = popupCenterX - (windowWidth / 2);
                leftPosition = Math.max(10, Math.min(leftPosition, viewportWidth - windowWidth - 10));
                floatingWindow.style.left = `${leftPosition}px`;
                floatingWindow.style.top = `${popupTopY}px`;
            }

        });
    } catch (e) {
        showReloadPopup();
    }
}