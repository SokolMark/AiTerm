let triggerBtn = null;
let floatingWindow = null;
let currentSelectedText = "";

let popupCenterX = 0;
let popupTopY = 0;

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

// Функція для точних координат у полях вводу (input/textarea)
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
    if ((floatingWindow && floatingWindow.contains(event.target)) ||
        (triggerBtn && triggerBtn.contains(event.target))) {
        return;
    }

    setTimeout(() => {
        let text = "";
        let rect = null;

        const activeEl = document.activeElement;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (isInput) {
            text = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd).trim();
            if (text.length > 0 && text.length <= 50) {
                rect = getInputSelectionRect(activeEl);
            }
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
    }, 10);
});

// ⬇️ ВИПРАВТЕ ЦЕЙ БЛОК у вашому коді
document.addEventListener('mousedown', (event) => {
    if (triggerBtn && !triggerBtn.contains(event.target)) {
        triggerBtn.remove();
        triggerBtn = null;  // ← ДОДАЙТЕ ЦЕ
    }
    if (floatingWindow && !floatingWindow.contains(event.target)) {
        floatingWindow.remove();
        floatingWindow = null;  // ← ДОДАЙТЕ ЦЕ
    }
});

const uiTranslations = {
    en: {translateBtn: "Translate", loading: "Loading...", error: "Error...", auto: "AUTO"},
    uk: {translateBtn: "Перекласти", loading: "Завантаження...", error: "Помилка...", auto: "АВТО"},
    ru: {translateBtn: "Перевести", loading: "Загрузка...", error: "Ошибка...", auto: "АВТО"},
    es: {translateBtn: "Traducir", loading: "Cargando...", error: "Error...", auto: "AUTO"},
    pl: {translateBtn: "Tłumacz", loading: "Ładowanie...", error: "Błąd...", auto: "AUTO"},
    zh: {translateBtn: "翻译", loading: "加载中...", error: "错误...", auto: "自动"},
    ar: {translateBtn: "ترجمة", loading: "جار التحميل...", error: "خطأ...", auto: "تلقائي"}
};

function openFloatingWindow() {
    if (triggerBtn) {
        triggerBtn.remove();
        triggerBtn = null;
    }

    chrome.storage.local.get(['fluentoTargetLangName', 'fluentoUILanguage', 'fluentoTheme'], (result) => {
        const targetLangName = result.fluentoTargetLangName || 'English';
        const shortLang = targetLangName.substring(0, 3).toUpperCase();

        const uiLangCode = result.fluentoUILanguage || 'en';
        const t = uiTranslations[uiLangCode] || uiTranslations['en'];

        const theme = result.fluentoTheme || 'light';

        // Видаляємо попереднє вікно якщо є
        if (floatingWindow) {
            floatingWindow.remove();
            floatingWindow = null;
        }

        floatingWindow = document.createElement('div');
        floatingWindow.id = 'aiterm-floating-window';

        if (theme === 'dark') {
            floatingWindow.classList.add('aiterm-dark');
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
        `;

        document.body.appendChild(floatingWindow);

        // ⬇️ ВИПРАВЛЕНО: використовуємо 370 як в CSS
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
            if (abortController) {
                abortController.abort();
            }
        });

        document.getElementById('aiterm-translate-btn').addEventListener('click', async () => {
            const targetTextEl = document.getElementById('aiterm-target-text');
            const sourceLangTagEl = document.getElementById('aiterm-source-lang');
            const arrowEl = document.getElementById('aiterm-arrow');

            targetTextEl.textContent = t.loading;
            arrowEl.classList.add('aiterm-tremble');
            // ⬇️ ВИПРАВЛЕНО: використовуємо block щоб відповідало CSS display:none
            cancelBtn.style.display = 'block';

            abortController = new AbortController();
            const signal = abortController.signal;

            const prompt = `Translate "${currentSelectedText}" into ${targetLangName}. 
            Auto-detect the source language.
            
            Return STRICTLY a JSON object with EXACTLY this structure:
            {
              "translation": "string",
              "detectedSourceLangCode": "string"
            }
            
            Rules:
            - "translation": The direct translation. If ambiguous, separate by slash (e.g., "Castle / Lock").
            - "detectedSourceLangCode": 2-letter ISO code.
            - NO markdown, NO formatting, JUST valid JSON.`;

            try {
                const WORKER_URL = "https://aiterm-proxy.sarkkofag.workers.dev/";

                const response = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({prompt}),
                    signal: signal
                });

                if (!response.ok) throw new Error("Worker error");

                const result = await response.json();
                const rawText = result.candidates[0].content.parts[0].text;

                let cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
                cleanedText = cleanedText.replace(/[\r\n]+/g, ' ');
                const start = cleanedText.indexOf('{');
                const end = cleanedText.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    cleanedText = cleanedText.substring(start, end + 1);
                }

                const data = JSON.parse(cleanedText);

                targetTextEl.textContent = data.translation;
                sourceLangTagEl.textContent = data.detectedSourceLangCode.toUpperCase();

            } catch (error) {
                if (error.name === 'AbortError') {
                    targetTextEl.textContent = "...";
                } else {
                    console.error("Translation error:", error);
                    targetTextEl.textContent = t.error;
                }
            } finally {
                arrowEl.classList.remove('aiterm-tremble');
                cancelBtn.style.display = 'none';
                abortController = null;
            }
        });
    });
}