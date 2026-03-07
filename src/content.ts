let floatingButton: HTMLDivElement | null = null;

document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    if (selectedText.length > 0 && selectedText.length <= 50) {
        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (!floatingButton) {
            floatingButton = document.createElement('div');
            floatingButton.id = 'aiterm-floating-button';
            floatingButton.textContent = 'AiTerm';
            document.body.appendChild(floatingButton);
        }

        floatingButton.style.top = `${window.scrollY + rect.bottom + 5}px`;
        floatingButton.style.left = `${window.scrollX + rect.left}px`;

    } else {
        if (floatingButton) {
            floatingButton.remove();
            floatingButton = null;
        }
    }
});

document.addEventListener('mousedown', (event) => {
    if (floatingButton && event.target !== floatingButton) {
        floatingButton.remove();
        floatingButton = null;
    }
});
