export interface WordData {
    translation: string;
    level: string;
    frequency: number;
    explanation: string;
    examples: string[];
    synonyms: string[];
    detectedSourceLangCode?: string;
    sourceContent?: { examples: string[]; synonyms: string[]; explanation: string; };
    targetContent?: { examples: string[]; synonyms: string[]; explanation: string; };
    isCached?: boolean; // Добавлен флаг кэширования
}

const BASE_URL = "https://aiterm-proxy.sarkkofag.workers.dev";
const API_SECRET = "aiterm_secret_key_2026_mvp";

const HEADERS_JSON = {
    "Content-Type": "application/json",
    "x-extension-secret": API_SECRET
};

const HEADERS_GET = {
    "x-extension-secret": API_SECRET
};

const CACHE_KEY = 'aiterm-translation-cache';
const MAX_CACHE_SIZE = 100;

interface CacheEntry {
    wordData: WordData;
    timestamp: number;
}

const getCacheKey = (word: string, sourceLang: string | null, targetLang: string) => {
    return `${word.trim().toLowerCase()}_${sourceLang || 'auto'}_${targetLang}`;
};

const getFromCache = (key: string): WordData | null => {
    try {
        const cacheStr = localStorage.getItem(CACHE_KEY);
        if (!cacheStr) return null;
        const cache = JSON.parse(cacheStr);
        if (cache[key]) {
            console.log("⚡ Loaded from local cache!");
            // Возвращаем данные с флагом isCached: true
            return { ...cache[key].wordData, isCached: true };
        }
    } catch (e) {
        console.error("Cache read error", e);
    }
    return null;
};

const saveToCache = (key: string, wordData: WordData) => {
    try {
        let cache: Record<string, CacheEntry> = {};
        const cacheStr = localStorage.getItem(CACHE_KEY);
        if (cacheStr) {
            cache = JSON.parse(cacheStr);
        }

        // Убираем флаг isCached перед сохранением, чтобы он не хранился жестко
        const { isCached, ...dataToSave } = wordData;
        cache[key] = {wordData: dataToSave, timestamp: Date.now()};

        if (Object.keys(cache).length > MAX_CACHE_SIZE) {
            const keys = Object.keys(cache);
            keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
            delete cache[keys[0]];
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error("Cache write error", e);
    }
};

export const fetchWordData = async (word: string, sourceLang: string | null, targetLang: string, email: string, source: 'main' | 'mini'): Promise<WordData> => {
    const cacheKey = getCacheKey(word, sourceLang, targetLang);
    const cachedData = getFromCache(cacheKey);
    if (cachedData) return cachedData; // Если есть кэш, возвращаем его сразу (в нем уже isCached = true)

    const unifiedPrompt = `
Task: Translate "${word}" to ${targetLang}. Source: ${sourceLang || 'auto'}.

Return strict JSON.

Rules:
- translation: main translation
- level: CEFR A1-C2 or "?"
- frequency: 1-10 using scale:
  10 = extremely common (time, go)
  8-9 = very common
  6-7 = common
  4-5 = medium frequency
  2-3 = rare
  1 = very rare
- detectedSourceLangCode: EXACT 2-letter ISO code. Even if the text is random gibberish/nonsense, strictly detect the language based on the alphabet/characters used.
- DICTIONARY FOCUS ONLY: Translate purely as a linguistic phrase. Do NOT explain pop culture, songs, albums, artists, or encyclopedic facts. Ignore proper noun context.

CRITICAL LANGUAGE ISOLATION:
1. "sourceContent" fields MUST be written entirely in the source language (${sourceLang || 'the detected source language'}). Give 2-5 sentences for examples, 1-5 synonyms, and 1-3 sentences for explanation.
2. "targetContent" fields MUST be written entirely in ${targetLang}. Give 2-5 sentences for examples, 1-5 synonyms, and 1-3 sentences for explanation.
Do not mix languages. Explanations in targetContent MUST be strictly in ${targetLang}.

JSON:
{"translation":"","level":"","frequency":1,"detectedSourceLangCode":"","sourceContent":{"examples":[],"synonyms":[],"explanation":""},"targetContent":{"examples":[],"synonyms":[],"explanation":""}}
`;

    try {
        const response = await fetch(`${BASE_URL}/translate`, {
            method: "POST",
            headers: HEADERS_JSON,
            body: JSON.stringify({prompt: unifiedPrompt, email, source})
        });

        if (!response.ok) {
            let serverError = `HTTP error ${response.status}`;
            let errorCode = null;
            try {
                const errData = await response.json();
                serverError = errData.error || serverError;
                errorCode = errData.code || null;
            } catch (e) {
            }
            const error: any = new Error(serverError);
            error.code = errorCode;
            throw error;
        }

        const data = await response.json();
        let cleanJson = data.candidates[0].content.parts[0].text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);

        let safeLevel = parsedData.level ? String(parsedData.level) : "?";
        const levelMatch = safeLevel.match(/(A1|A2|B1|B2|C1|C2)/i);
        safeLevel = levelMatch ? levelMatch[0].toUpperCase() : "?";

        let safeSourceLang = parsedData.detectedSourceLangCode ? String(parsedData.detectedSourceLangCode).toLowerCase().trim() : "en";
        if (safeSourceLang.length > 2) {
            const langMap: Record<string, string> = {
                english: 'en',
                russian: 'ru',
                spanish: 'es',
                french: 'fr',
                german: 'de',
                chinese: 'zh',
                ukrainian: 'uk',
                polish: 'pl',
                arabic: 'ar'
            };
            safeSourceLang = langMap[safeSourceLang] || safeSourceLang.substring(0, 2);
        }

        const finalData = {...parsedData, level: safeLevel, detectedSourceLangCode: safeSourceLang};
        saveToCache(cacheKey, finalData);

        return finalData;
    } catch (error) {
        console.error("Ошибка при запросе к бэкенду:", error);
        throw error;
    }
};

export const authenticateUser = async (email: string) => {
    try {
        const response = await fetch(`${BASE_URL}/auth`, {
            method: "POST",
            headers: HEADERS_JSON,
            body: JSON.stringify({email})
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const deleteUserProfile = async (email: string) => {
    try {
        const response = await fetch(`${BASE_URL}/user`, {
            method: "DELETE",
            headers: HEADERS_JSON,
            body: JSON.stringify({email})
        });
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const getDictionaries = async (email: string) => {
    try {
        const response = await fetch(`${BASE_URL}/dictionaries?email=${encodeURIComponent(email)}`, {
            headers: HEADERS_GET
        });
        const data = await response.json();
        return data.dictionaries || [];
    } catch (error) {
        return [];
    }
};

export const createDictionary = async (email: string, name: string) => {
    try {
        const response = await fetch(`${BASE_URL}/dictionaries`, {
            method: "POST",
            headers: HEADERS_JSON,
            body: JSON.stringify({email, name})
        });
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const renameDictionary = async (dictId: string, newName: string) => {
    try {
        const response = await fetch(`${BASE_URL}/dictionaries`, {
            method: "PUT",
            headers: HEADERS_JSON,
            body: JSON.stringify({dictId, newName})
        });
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const deleteDictionary = async (dictId: string) => {
    try {
        const response = await fetch(`${BASE_URL}/dictionaries`, {
            method: "DELETE",
            headers: HEADERS_JSON,
            body: JSON.stringify({dictId})
        });
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const getDictionaryWords = async (dictId: string) => {
    try {
        const response = await fetch(`${BASE_URL}/words?dictId=${encodeURIComponent(dictId)}`, {
            headers: HEADERS_GET
        });
        const data = await response.json();
        return data.words || [];
    } catch (error) {
        return [];
    }
};

export const saveWordToDictionary = async (dictId: string, word: string, translation: string, wordData: any) => {
    try {
        const response = await fetch(`${BASE_URL}/words`, {
            method: "POST",
            headers: HEADERS_JSON,
            body: JSON.stringify({dictId, word, translation, wordData})
        });
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const deleteWord = async (wordId: string) => {
    try {
        const response = await fetch(`${BASE_URL}/words`, {
            method: "DELETE",
            headers: HEADERS_JSON,
            body: JSON.stringify({wordId})
        });
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const loginWithGoogle = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({interactive: true}, async function (token) {
            if (chrome.runtime.lastError || !token) {
                reject(chrome.runtime.lastError);
                return;
            }
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {headers: {Authorization: `Bearer ${token}`}});
                if (!response.ok) throw new Error("Не удалось получить данные профиля");
                const userInfo = await response.json();
                const dbResult = await authenticateUser(userInfo.email);
                resolve(dbResult);
            } catch (error) {
                reject(error);
            }
        });
    });
};

export const logoutFromGoogle = (): Promise<void> => {
    return new Promise((resolve) => {
        chrome.identity.getAuthToken({interactive: false}, (token) => {
            if (chrome.runtime.lastError || !token) {
                chrome.identity.clearAllCachedAuthTokens(() => resolve());
                return;
            }

            fetch('https://oauth2.googleapis.com/revoke', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: `token=${token}`
            }).finally(() => {
                chrome.identity.removeCachedAuthToken({token}, () => {
                    chrome.identity.clearAllCachedAuthTokens(() => resolve());
                });
            });
        });
    });
};