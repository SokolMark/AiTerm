chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install" || details.reason === "update") {

        chrome.contextMenus.create({
            id: "aiterm-translate",
            title: "Translate with AiTerm",
            contexts: ["selection"]
        }, () => {
            if (chrome.runtime.lastError) {
                console.warn("Context menu issue:", chrome.runtime.lastError.message);
            }
        });

        const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

        for (const tab of tabs) {
            if (tab.url.startsWith("chrome://") ||
                tab.url.startsWith("chrome-extension://") ||
                tab.url.startsWith("https://chrome.google.com/webstore") ||
                tab.url.includes("monobank.ua") ||
                tab.url.includes("privat24.ua")) {
                continue;
            }

            try {
                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ["content.css"]
                });

                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["content.js"]
                });
            } catch (err) {
                console.warn(`Не удалось встроить скрипт во вкладку ${tab.id}`, err);
            }
        }
    }
});

// Слушаем клик по нашему пункту в контекстном меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "aiterm-translate") {
        // Отправляем сообщение
        chrome.tabs.sendMessage(tab.id, { action: "showContextMenuPopup" }, (response) => {
            // Если скрипт на странице не ответил (потерял контекст)
            if (chrome.runtime.lastError) {
                // Внедряем резервное окно с кнопкой обновления (старый белый дизайн)
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        let existing = document.getElementById('aiterm-floating-window');
                        if (existing) existing.remove();

                        const floatingWindow = document.createElement('div');
                        floatingWindow.id = 'aiterm-floating-window';

                        // Простые белые стили
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
                        const title = (browserLang === 'ru' || browserLang === 'uk') ? 'Плагин не активен' : 'Plugin is inactive';
                        const desc = (browserLang === 'ru' || browserLang === 'uk') ? 'Обновите страницу, чтобы продолжить использование AiTerm.' : 'Please refresh the page to continue using AiTerm.';
                        const btnText = (browserLang === 'ru' || browserLang === 'uk') ? 'Обновить страницу' : 'Refresh page';

                        floatingWindow.innerHTML = `
                            <div style="display: flex; justify-content: center; padding: 12px 10px 5px 10px;">
                                <span style="color: #007bff; font-weight: bold; font-size: 16px;">Ai</span><span style="color: #888888; font-weight: bold; font-size: 16px;">Term</span>
                            </div>
                            <div style="text-align: center; padding: 10px 15px 15px 15px;">
                                <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #dc3545;">
                                    ${title}
                                </div>
                                <div style="font-size: 12px; margin-bottom: 16px; color: #666666; line-height: 1.4;">
                                    ${desc}
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
                                ">${btnText}</button>
                            </div>
                        `;

                        document.body.appendChild(floatingWindow);

                        const btn = document.getElementById('aiterm-reload-btn');
                        if (btn) {
                            btn.addEventListener('mouseover', () => btn.style.opacity = '0.8');
                            btn.addEventListener('mouseout', () => btn.style.opacity = '1');
                            btn.addEventListener('click', () => window.location.reload());
                        }

                        let topY = window.scrollY + 100;
                        let leftX = window.innerWidth / 2;

                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            const domRect = selection.getRangeAt(0).getBoundingClientRect();
                            if (domRect.width > 0) {
                                leftX = domRect.left + (domRect.width / 2) + window.scrollX;
                                topY = domRect.bottom + 8 + window.scrollY;
                            }
                        }

                        const windowWidth = 260;
                        let finalLeft = leftX - (windowWidth / 2);
                        finalLeft = Math.max(10, Math.min(finalLeft, document.documentElement.clientWidth - windowWidth - 10));

                        floatingWindow.style.left = `${finalLeft}px`;
                        floatingWindow.style.top = `${topY}px`;
                        floatingWindow.style.width = `${windowWidth}px`;

                        document.addEventListener('mousedown', function closeOverlay(e) {
                            if (floatingWindow && !floatingWindow.contains(e.target)) {
                                floatingWindow.remove();
                                document.removeEventListener('mousedown', closeOverlay);
                            }
                        });
                    }
                }).catch(err => console.warn("Execute script error:", err));
            }
        });
    }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.aitermContextMenu) {
        if (changes.aitermContextMenu.newValue === false) {
            chrome.contextMenus.remove("aiterm-translate", () => {
                if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError.message);
            });
        } else {
            chrome.contextMenus.create({
                id: "aiterm-translate",
                title: "Translate with AiTerm",
                contexts: ["selection"]
            }, () => {
                if (chrome.runtime.lastError) console.warn(chrome.runtime.lastError.message);
            });
        }
    }
});