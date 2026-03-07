export interface WordData {
    translation: string;
    level: string;
    frequency: number;
    explanation: string;
    examples: string[];
    synonyms: string[];
    detectedSourceLangCode?: string;
    sourceContent?: {
        examples: string[];
        synonyms: string[];
        explanation: string;
    };
    targetContent?: {
        examples: string[];
        synonyms: string[];
        explanation: string;
    };
}

// --- ФУНКЦИЯ ПЕРЕВОДА (ОБЩЕНИЕ С ИИ) ---
export const fetchWordData = async (word: string, sourceLang: string | null, targetLang: string): Promise<WordData> => {
    // Получаем статус пользователя: премиум он или нет
    const isPremium = localStorage.getItem('aiterm-premium') === 'true';

    // Формируем системный промпт для ИИ, чтобы он всегда возвращал строгий JSON
    const prompt = `
Translate the following word/phrase: "${word}".
Target language: ${targetLang}.
Source language: ${sourceLang ? sourceLang : 'Auto-detect'}.

Provide a response strictly in the following JSON format:
{
  "translation": "Translated word/phrase",
  "level": "CEFR level (A1, A2, B1, B2, C1, C2) or '?' if unknown",
  "frequency": 1 to 10 (1 = rare, 10 = extremely common),
  "detectedSourceLangCode": "2-letter language code (e.g., 'en', 'ru', 'uk')",
  "sourceContent": {
    "examples": ["example 1 in source language", "example 2 in source language"],
    "synonyms": ["synonym 1", "synonym 2"],
    "explanation": "Short explanation in source language"
  },
  "targetContent": {
    "examples": ["example 1 in target language", "example 2 in target language"],
    "synonyms": ["synonym 1", "synonym 2"],
    "explanation": "Short explanation in target language"
  }
}
Return ONLY valid JSON without markdown formatting like \`\`\`json.
`;

    try {
        // Запрос к твоему Воркеру (замени ссылку на глобальную, когда задеплоишь)
        // Если у тебя один роут на воркере обрабатывает и авторизацию, и перевод,
        // убедись, что ссылки /auth и /translate настроены правильно.
        // Сейчас я ставлю базовый локальный адрес, как было в твоем Воркере.
        const response = await fetch("http://127.0.0.1:8787/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt,
                isPremium: isPremium // Передаем статус премиума в Воркер!
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Gemini иногда всё равно оборачивает JSON в markdown, поэтому очищаем строку
        let cleanJson = data.candidates[0].content.parts[0].text;
        cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(cleanJson);

        return {
            translation: parsedData.translation,
            level: parsedData.level,
            frequency: parsedData.frequency,
            explanation: parsedData.targetContent?.explanation || '',
            examples: parsedData.targetContent?.examples || [],
            synonyms: parsedData.targetContent?.synonyms || [],
            detectedSourceLangCode: parsedData.detectedSourceLangCode,
            sourceContent: parsedData.sourceContent,
            targetContent: parsedData.targetContent
        };

    } catch (error) {
        console.error("Ошибка при запросе к ИИ:", error);
        throw error; // Пробрасываем ошибку дальше, чтобы UI показал Toast
    }
};

// --- ФУНКЦИИ АВТОРИЗАЦИИ И РАБОТЫ С БД ---

export const authenticateUser = async (email: string) => {
    try {
        // Стучимся на сервер Cloudflare Worker (ендпоинт авторизации)
        const response = await fetch("http://127.0.0.1:8787/auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Успешный ответ от бэкенда:", data);
        return data;
    } catch (error) {
        console.error("Ошибка авторизации:", error);
        return null;
    }
};

export const loginWithGoogle = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
        // Вызываем встроенное окно авторизации Chrome
        chrome.identity.getAuthToken({ interactive: true }, async function(token) {
            if (chrome.runtime.lastError || !token) {
                console.error("Ошибка получения токена:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }

            try {
                // Идем в Google API, чтобы по токену узнать email пользователя
                const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!response.ok) throw new Error("Не удалось получить данные профиля");

                const userInfo = await response.json();
                console.log("Реальный email пользователя:", userInfo.email);

                // Отправляем этот реальный email на наш сервер Cloudflare
                const dbResult = await authenticateUser(userInfo.email);
                resolve(dbResult);

            } catch (error) {
                console.error("Ошибка в процессе логина:", error);
                reject(error);
            }
        });
    });
};