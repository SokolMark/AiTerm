chrome.runtime.onInstalled.addListener(async (details) => {
    // Срабатывает при установке, обновлении плагина или перезагрузке браузера
    if (details.reason === "install" || details.reason === "update") {

        // Получаем все открытые вкладки
        const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

        for (const tab of tabs) {
            // Пропускаем системные страницы Chrome, магазины расширений и страницы исключений (monobank, privat24)
            if (tab.url.startsWith("chrome://") ||
                tab.url.startsWith("chrome-extension://") ||
                tab.url.startsWith("https://chrome.google.com/webstore") ||
                tab.url.includes("monobank.ua") ||
                tab.url.includes("privat24.ua")) {
                continue;
            }

            try {
                // Принудительно вставляем скрипты и стили без перезагрузки страницы
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