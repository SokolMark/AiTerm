let floatingButton: HTMLDivElement | null = null;
// Создаем независимый локальный кэш только для мини-окна на текущей странице
const translationCache = new Map<string, string>();

document.addEventListener('mouseup', () => {
    try {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || '';

        if (selectedText.length > 0 && selectedText.length <= 50) {
            const range = selection!.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            if (!floatingButton) {
                floatingButton = document.createElement('div');
                floatingButton.id = 'aiterm-floating-button';
                document.body.appendChild(floatingButton);
            }

            floatingButton.style.top = `${window.scrollY + rect.bottom + 5}px`;
            floatingButton.style.left = `${window.scrollX + rect.left}px`;

            // Если текст уже переводился в мини-окне на этой странице — берем из кэша
            if (translationCache.has(selectedText)) {
                floatingButton.textContent = translationCache.get(selectedText)!;
            } else {
                floatingButton.textContent = 'AiTerm'; // Текст по умолчанию, пока нет перевода

                // --- МЕСТО ДЛЯ ТВОЕГО ВЫЗОВА API ---
                // Пример логики (псевдокод), как сюда потом встроить запрос:
                // fetchTranslation(selectedText).then(result => {
                //     translationCache.set(selectedText, result); // Сохраняем в кэш
                //     if (floatingButton) floatingButton.textContent = result;
                // });
            }

        } else {
            if (floatingButton) {
                floatingButton.remove();
                floatingButton = null;
            }
        }
    } catch (error) {
        console.warn("AiTerm: Ошибка обработки выделения", error);
    }
});

document.addEventListener('mousedown', (event) => {
    try {
        // Закрываем окно, только если кликнули мимо него
        if (floatingButton && event.target !== floatingButton) {
            floatingButton.remove();
            floatingButton = null;
        }
    } catch (error) {
        console.warn("AiTerm: Ошибка закрытия окна", error);
    }
});