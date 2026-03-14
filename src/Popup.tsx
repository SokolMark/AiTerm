import {useState, useEffect, useLayoutEffect, useRef} from 'react';
import {fetchWordData, WordData, loginWithGoogle, logoutFromGoogle, getDictionaries, createDictionary, getDictionaryWords, saveWordToDictionary, deleteDictionary, deleteWord, deleteUserProfile, renameDictionary} from './aiService';
import {translations, availableLanguages, getLanguageName} from './languages';

import { CloseIcon, SwapIcon, MenuIcon, SaveIcon, SunIcon, MoonIcon, BookIcon, GlobeIcon, LogOutIcon, TrashIcon, BackIcon, InfoIcon, ProductHuntIcon, LinkedInIcon, MailIcon, CopyIcon, GithubIcon, SettingsIcon, EditIcon } from './components/Icons';
import { AuthScreen } from './components/AuthScreen';

import './styles/variables.css';
import './styles/header.css';
import './styles/translation.css';
import './styles/modals.css';
import './styles/menu.css';

const getAutoTheme = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const getAutoLanguage = (): keyof typeof translations => {
    const browserLang = (chrome.i18n ? chrome.i18n.getUILanguage() : navigator.language).split('-')[0];
    const supportedUILangs = availableLanguages.filter(l => l.supportsUI).map(l => l.code);
    return supportedUILangs.includes(browserLang) ? (browserLang as keyof typeof translations) : 'en';
};

const MAX_DICTS = 50;
const MAX_WORDS = 5000;

function Popup() {
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        const saved = localStorage.getItem('aiterm-theme');
        return saved ? saved === 'dark' : getAutoTheme();
    });
    const [language, setLanguage] = useState<keyof typeof translations>(() => {
        const saved = localStorage.getItem('aiterm-language');
        return saved ? (saved as keyof typeof translations) : getAutoLanguage();
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeMenuView, setActiveMenuView] = useState<'main' | 'dictionaries' | 'dict_view' | 'about' | 'features' | 'support'>('main');
    const [modalMode, setModalMode] = useState<'ui' | 'source' | 'target' | null>(null);
    const [sourceLang, setSourceLang] = useState<string | null>(null);
    const [targetLang, setTargetLang] = useState<string | null>(() => localStorage.getItem('aiterm-target-language') || null);
    const [inputText, setInputText] = useState(() => localStorage.getItem('aiterm-input-text') || '');

    const [toastState, setToastState] = useState<{ visible: boolean, message: string, type: 'error' | 'success' }>({visible: false, message: '', type: 'error'});
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    const [limitModalType, setLimitModalType] = useState<'requests' | 'dicts' | 'words' | null>(null);
    const [duplicateWarning, setDuplicateWarning] = useState<{dictId: string, dictName: string} | null>(null);

    const [translationResult, setTranslationResult] = useState(() => localStorage.getItem('aiterm-translation-result') || '');
    const [wordData, setWordData] = useState<WordData | null>(() => {
        const saved = localStorage.getItem('aiterm-word-data');
        return saved ? JSON.parse(saved) : null;
    });

    const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('aiterm-user-email'));

    const [totalRequestsLeft, setTotalRequestsLeft] = useState<number>(() => {
        const saved = localStorage.getItem('aiterm-total-requests');
        return saved !== null ? parseInt(saved) : 30;
    });
    const [mainRequestsLeft, setMainRequestsLeft] = useState<number>(() => {
        const saved = localStorage.getItem('aiterm-main-requests');
        return saved !== null ? parseInt(saved) : 30;
    });

    useEffect(() => {
        if (totalRequestsLeft > 30) {
            setTotalRequestsLeft(30);
            localStorage.setItem('aiterm-total-requests', '30');
            chrome.storage.local.set({ aitermTotalRequests: 30 });
        }
        if (mainRequestsLeft > 30) {
            setMainRequestsLeft(30);
            localStorage.setItem('aiterm-main-requests', '30');
            chrome.storage.local.set({ aitermMainRequests: 30 });
        }
    }, [totalRequestsLeft, mainRequestsLeft]);

    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'logout' | 'remove' | 'delete_dict' | 'delete_word' | 'duplicate_dict' | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [returnToSaveModal, setReturnToSaveModal] = useState(false);

    const [dictionaries, setDictionaries] = useState<{ id: string, name: string, word_count?: number }[]>([]);
    const [isCreateDictModalOpen, setIsCreateDictModalOpen] = useState(false);
    const [newDictName, setNewDictName] = useState('');
    const [isCreatingDict, setIsCreatingDict] = useState(false);

    const [isRenameDictModalOpen, setIsRenameDictModalOpen] = useState(false);
    const [dictRenameValue, setDictRenameValue] = useState('');
    const [isRenamingDict, setIsRenamingDict] = useState(false);

    const [activeDictionary, setActiveDictionary] = useState<{ id: string, name: string } | null>(null);
    const [dictWords, setDictWords] = useState<any[]>([]);
    const [selectedWordDetails, setSelectedWordDetails] = useState<any | null>(null);
    const [detailLang, setDetailLang] = useState<'source' | 'target'>('target');

    const [dictSearchQuery, setDictSearchQuery] = useState('');
    const [wordSearchQuery, setWordSearchQuery] = useState('');

    const [isTranslating, setIsTranslating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [shakeArrow, setShakeArrow] = useState<'left' | 'right' | null>(null);
    const [contentLang, setContentLang] = useState<'source' | 'target'>('target');

    const [displayedLevel, setDisplayedLevel] = useState(() => wordData?.level || '?');
    const [isLevelFlashing, setIsLevelFlashing] = useState(false);
    const [displayedFrequency, setDisplayedFrequency] = useState(() => wordData?.frequency || 1);
    const [donutProgress, setDonutProgress] = useState(() => wordData ? (wordData.frequency / 10) * 100 : 0);
    const [isDonutFlashing, setIsDonutFlashing] = useState(false);
    const [isContentReady, setIsContentReady] = useState(() => !!wordData);

    const [isQuickTranslateEnabled, setIsQuickTranslateEnabled] = useState(true);
    const [timeUntilReset, setTimeUntilReset] = useState('');

    const lastSearchedText = useRef(inputText);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isInitialRender = useRef(true);

    const t = translations[language] as any;

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToastState({visible: true, message: message, type});
        setTimeout(() => setToastState(prev => ({...prev, visible: false})), 3500);
    };

    const requireAuth = (action: () => void) => {
        if (!userEmail) setShowAuthModal(true);
        else action();
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText('sarkkofag@gmail.com').then(() => {
            showToast(t.emailCopied, "success");
        });
    };

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            const nextReset = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                now.getUTCHours() < 12 ? 12 : 24, 0, 0, 0
            ));

            const diff = nextReset.getTime() - now.getTime();

            if (diff <= 10000 && diff >= 0) {
                if (userEmail) {
                    loginWithGoogle().then(dbResult => {
                        if (dbResult && dbResult.success) {
                            const newTotal = dbResult.user.total_requests_left ?? 30;
                            const newMain = dbResult.user.main_requests_left ?? 30;
                            setTotalRequestsLeft(newTotal);
                            setMainRequestsLeft(newMain);
                            localStorage.setItem('aiterm-total-requests', newTotal.toString());
                            localStorage.setItem('aiterm-main-requests', newMain.toString());
                            chrome.storage.local.set({ aitermTotalRequests: newTotal, aitermMainRequests: newMain });
                        }
                    });
                }
            }

            // Передаем текущий язык интерфейса (language) в toLocaleTimeString, чтобы получить правильный формат (АМ/ПМ или 24ч)
            const formattedTime = nextReset.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
            setTimeUntilReset(formattedTime);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 10000);

        return () => clearInterval(interval);
    }, [userEmail, language]);

    useEffect(() => {
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.aitermTotalRequests) {
                setTotalRequestsLeft(changes.aitermTotalRequests.newValue);
                localStorage.setItem('aiterm-total-requests', changes.aitermTotalRequests.newValue.toString());
            }
            if (changes.aitermMainRequests) {
                setMainRequestsLeft(changes.aitermMainRequests.newValue);
                localStorage.setItem('aiterm-main-requests', changes.aitermMainRequests.newValue.toString());
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    useEffect(() => {
        chrome.storage.local.get(['aitermQuickTranslate', 'aitermTotalRequests', 'aitermMainRequests'], (res) => {
            if (res.aitermQuickTranslate !== undefined) setIsQuickTranslateEnabled(res.aitermQuickTranslate);
            if (res.aitermTotalRequests !== undefined) setTotalRequestsLeft(Math.min(res.aitermTotalRequests, 30));
            if (res.aitermMainRequests !== undefined) setMainRequestsLeft(Math.min(res.aitermMainRequests, 30));
        });
    }, []);

    const toggleQuickTranslate = () => {
        const newVal = !isQuickTranslateEnabled;
        setIsQuickTranslateEnabled(newVal);
        chrome.storage.local.set({ aitermQuickTranslate: newVal });
    };

    useEffect(() => {
        if (userEmail) {
            chrome.storage.local.set({ aitermUserEmail: userEmail });
            getDictionaries(userEmail).then(data => setDictionaries(data));

            const hasSeenWelcome = localStorage.getItem(`hasSeenWelcome_${userEmail}`);
            if (!hasSeenWelcome) {
                setShowWelcomeModal(true);
            }
        } else {
            chrome.storage.local.remove(['aitermUserEmail']);
        }
    }, [userEmail]);

    const getTotalWordsCount = () => {
        return dictionaries.reduce((acc, dict) => acc + (dict.word_count || 0), 0);
    };

    const filteredDictionaries = dictionaries.filter(d => d.name.toLowerCase().includes(dictSearchQuery.toLowerCase()));
    const filteredWords = dictWords.filter(w =>
        w.word.toLowerCase().includes(wordSearchQuery.toLowerCase()) ||
        w.translation.toLowerCase().includes(wordSearchQuery.toLowerCase())
    );

    const handleCreateDictionary = async (forceCreate: boolean = false) => {
        const trimmedName = newDictName.trim();
        if (!trimmedName || !userEmail) return;

        if (dictionaries.length >= MAX_DICTS) {
            setIsCreateDictModalOpen(false);
            setLimitModalType('dicts');
            return;
        }

        if (!forceCreate) {
            const isDuplicate = dictionaries.some(d => d.name.toLowerCase() === trimmedName.toLowerCase());
            if (isDuplicate) {
                setIsCreateDictModalOpen(false);
                setConfirmAction('duplicate_dict');
                return;
            }
        }

        setIsCreatingDict(true);
        const result = await createDictionary(userEmail, trimmedName);
        if (result && result.success) {
            setDictionaries([result.dictionary, ...dictionaries]);
            showToast(t.dictCreated, 'success');
            setIsCreateDictModalOpen(false);
            setNewDictName('');
            setDictSearchQuery('');
            setConfirmAction(null);

            if (returnToSaveModal) {
                setIsSaveModalOpen(true);
                setReturnToSaveModal(false);
            }
        } else { showToast(t.failedToCreate, 'error'); }
        setIsCreatingDict(false);
    };

    const handleCloseCreateModal = () => {
        setIsCreateDictModalOpen(false);
        if (returnToSaveModal) {
            setIsSaveModalOpen(true);
            setReturnToSaveModal(false);
        }
    };

    const handleRenameDictionary = async () => {
        const trimmedName = dictRenameValue.trim();
        if (!trimmedName || !activeDictionary) return;

        if (trimmedName.toLowerCase() === activeDictionary.name.toLowerCase()) {
            setIsRenameDictModalOpen(false);
            return;
        }

        setIsRenamingDict(true);
        const result = await renameDictionary(activeDictionary.id, trimmedName);
        if (result && result.success) {
            showToast(t.dictRenamed, 'success');
            setIsRenameDictModalOpen(false);
            setActiveDictionary({ ...activeDictionary, name: trimmedName });
            setDictionaries(dictionaries.map(d => d.id === activeDictionary.id ? { ...d, name: trimmedName } : d));
        } else {
            showToast(t.failedToRename, 'error');
        }
        setIsRenamingDict(false);
    };

    const handleSaveWord = async (dict: {id: string, name: string}) => {
        if (!inputText.trim() || !translationResult.trim() || !wordData) {
            showToast(t.nothingToSave, 'error');
            return;
        }

        if (getTotalWordsCount() >= MAX_WORDS) {
            setIsSaveModalOpen(false);
            setLimitModalType('words');
            return;
        }

        const words = await getDictionaryWords(dict.id);
        const inputLower = inputText.trim().toLowerCase();
        const exists = words.some((w: any) => w.word.toLowerCase() === inputLower);

        if (exists) {
            setIsSaveModalOpen(false);
            setDuplicateWarning({ dictId: dict.id, dictName: dict.name });
            return;
        }

        await executeSaveWord(dict.id);
    };

    const executeSaveWord = async (dictId: string) => {
        const dataToSave = {
            ...wordData,
            sourceLangCode: sourceLang || wordData?.detectedSourceLangCode || 'en',
            targetLangCode: targetLang || 'en'
        };
        const result = await saveWordToDictionary(dictId, inputText.trim(), translationResult.trim(), dataToSave);
        if (result && result.success) {
            showToast(t.savedSuccessfully, 'success');
            setIsSaveModalOpen(false);
            setDuplicateWarning(null);
            setDictionaries(dictionaries.map(d => d.id === dictId ? { ...d, word_count: (d.word_count || 0) + 1 } : d));
        } else {
            showToast(t.failedToSave, 'error');
        }
    };

    const handleOpenDictionary = async (dict: { id: string, name: string }) => {
        setActiveDictionary(dict);
        setActiveMenuView('dict_view');
        setWordSearchQuery('');
        const words = await getDictionaryWords(dict.id);
        setDictWords(words);
    };

    const handleConfirmAction = async () => {
        if (confirmAction === 'logout') {
            await handleLogout();
            setConfirmAction(null);
        } else if (confirmAction === 'remove' && userEmail) {
            const res = await deleteUserProfile(userEmail);
            if (res && res.success) {
                showToast(t.profileDeleted, "success");

                await logoutFromGoogle();
                localStorage.clear();
                chrome.storage.local.clear();

                setUserEmail(null);
                setTotalRequestsLeft(30);
                setMainRequestsLeft(30);
                setDictionaries([]);
                setDictWords([]);
                setIsMenuOpen(false);
                setActiveMenuView('main');

                setIsDarkTheme(getAutoTheme());
                setLanguage(getAutoLanguage());
                setInputText('');
                setTranslationResult('');
                setWordData(null);
                setSourceLang(null);
                setTargetLang(null);
                setDictSearchQuery('');
                setWordSearchQuery('');
            } else {
                showToast(t.failedToDeleteProfile, "error");
            }
            setConfirmAction(null);
        } else if (confirmAction === 'duplicate_dict') {
            await handleCreateDictionary(true);
        } else if (confirmAction === 'delete_dict' && activeDictionary) {
            const res = await deleteDictionary(activeDictionary.id);
            if (res && res.success) {
                setDictionaries(dictionaries.filter(d => d.id !== activeDictionary.id));
                setActiveMenuView('dictionaries');
                setActiveDictionary(null);
                showToast(t.dictDeleted, "success");
            } else {
                showToast(t.failedToDelete, "error");
            }
            setConfirmAction(null);
        } else if (confirmAction === 'delete_word' && selectedWordDetails) {
            const res = await deleteWord(selectedWordDetails.id);
            if (res && res.success) {
                setDictWords(dictWords.filter(w => w.id !== selectedWordDetails.id));
                setDictionaries(dictionaries.map(d => d.id === selectedWordDetails.dictionary_id ? { ...d, word_count: Math.max(0, (d.word_count || 1) - 1) } : d));
                setSelectedWordDetails(null);
                showToast(t.wordDeleted, "success");
            } else {
                showToast(t.failedToDelete, "error");
            }
            setConfirmAction(null);
        }
    };

    const handleLogout = async () => {
        await logoutFromGoogle();

        localStorage.removeItem('aiterm-user-email');
        chrome.storage.local.remove(['aitermUserEmail']);

        setUserEmail(null);
        setDictionaries([]);
        setDictWords([]);

        setIsMenuOpen(false);
        setActiveMenuView('main');
    };

    const handleGoogleAuth = async () => {
        setIsLoggingIn(true);
        try {
            const dbResult = await loginWithGoogle();
            if (dbResult && dbResult.success) {
                const user = dbResult.user;
                setUserEmail(user.email);

                let totalToSet = user.total_requests_left ?? 30;
                let mainToSet = user.main_requests_left ?? 30;

                setTotalRequestsLeft(totalToSet);
                setMainRequestsLeft(mainToSet);

                localStorage.setItem('aiterm-user-email', user.email);
                localStorage.setItem('aiterm-total-requests', totalToSet.toString());
                localStorage.setItem('aiterm-main-requests', mainToSet.toString());
                chrome.storage.local.set({
                    aitermTotalRequests: totalToSet,
                    aitermMainRequests: mainToSet
                });

                const hasSeenWelcome = localStorage.getItem(`hasSeenWelcome_${user.email}`);
                if (!hasSeenWelcome) {
                    setShowWelcomeModal(true);
                }

                setShowAuthModal(false);
                showToast(t.loginSuccessful, 'success');
            } else { showToast(t.serverError, 'error'); }
        } catch (error) { showToast(t.loginCancelled, 'error'); }
        finally { setIsLoggingIn(false); }
    };

    const handleCloseWelcomeModal = () => {
        setShowWelcomeModal(false);
        if (userEmail) {
            localStorage.setItem(`hasSeenWelcome_${userEmail}`, 'true');
        }
    };

    useLayoutEffect(() => {
        localStorage.setItem('aiterm-theme', isDarkTheme ? 'dark' : 'light');
        document.body.className = isDarkTheme ? 'dark-theme' : 'light-theme';
        chrome.storage.local.set({aitermTheme: isDarkTheme ? 'dark' : 'light'});
    }, [isDarkTheme]);

    useEffect(() => {
        localStorage.setItem('aiterm-language', language);
        chrome.storage.local.set({aitermUILanguage: language});
    }, [language]);

    useEffect(() => {
        if (targetLang) {
            localStorage.setItem('aiterm-target-language', targetLang);
            chrome.storage.local.set({aitermTargetLangName: availableLanguages.find(l => l.code === targetLang)?.name || 'English'});
        } else localStorage.removeItem('aiterm-target-language');
    }, [targetLang]);

    useEffect(() => localStorage.setItem('aiterm-input-text', inputText), [inputText]);
    useEffect(() => localStorage.setItem('aiterm-translation-result', translationResult), [translationResult]);
    useEffect(() => {
        if (wordData) localStorage.setItem('aiterm-word-data', JSON.stringify(wordData));
        else localStorage.removeItem('aiterm-word-data');
    }, [wordData]);

    const clearUISequentially = async () => {
        if (!wordData && displayedLevel === '?' && donutProgress === 0) return;
        setIsContentReady(false);
        await new Promise(r => setTimeout(r, 300));
        setDonutProgress(0);
        setDisplayedFrequency(1);
        await new Promise(r => setTimeout(r, 450));
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        let currentLvlIdx = levels.indexOf(displayedLevel);
        if (currentLvlIdx !== -1) {
            await new Promise<void>(resolve => {
                const reverseInterval = setInterval(() => {
                    currentLvlIdx--;
                    if (currentLvlIdx >= 0) setDisplayedLevel(levels[currentLvlIdx]);
                    else { setDisplayedLevel('?'); clearInterval(reverseInterval); resolve(); }
                }, 120);
            });
        } else setDisplayedLevel('?');
    };

    const handleCancelRequest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsTranslating(false);
            setTranslationResult(wordData ? wordData.translation : '');
        }
    };

    const translateText = async (text: string, force: boolean = false) => {
        const currentText = text.trim();
        if (!currentText) {
            setIsClearing(true);
            await clearUISequentially();
            setTranslationResult('');
            setWordData(null);
            lastSearchedText.current = '';
            setIsClearing(false);
            return;
        }

        if (targetLang && userEmail && (force || currentText !== lastSearchedText.current)) {
            if (mainRequestsLeft <= 0) {
                setLimitModalType('requests');
                return;
            }

            if (abortControllerRef.current) abortControllerRef.current.abort();
            lastSearchedText.current = currentText;

            setIsClearing(true);
            if (wordData) {
                await clearUISequentially();
                setWordData(null);
            } else {
                setDisplayedLevel('?');
                setDisplayedFrequency(1);
                setDonutProgress(0);
                setIsContentReady(false);
            }
            setIsClearing(false);

            setIsTranslating(true);
            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                const data = await fetchWordData(currentText, sourceLang, availableLanguages.find(l => l.code === targetLang)?.name || targetLang, userEmail, 'main');
                if (controller.signal.aborted) return;

                if (data.translation && data.translation.toLowerCase().includes('gibberish')) {
                    showToast(t.gibberishError, 'error');
                    setTranslationResult("");
                    setWordData(null);
                    setDisplayedLevel('?');
                    setDisplayedFrequency(1);
                    setDonutProgress(0);
                    setIsContentReady(false);
                } else {
                    setTranslationResult(data.translation);
                    setWordData(data);
                    setContentLang('target');

                    const newMain = Math.max(0, mainRequestsLeft - 1);
                    setMainRequestsLeft(newMain);
                    localStorage.setItem('aiterm-main-requests', newMain.toString());
                    chrome.storage.local.set({
                        aitermMainRequests: newMain
                    });
                }

            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    const msg = String(error.message || error).toLowerCase();

                    if (error.code === 'USER_NOT_FOUND' || msg.includes('user not found')) {
                        showToast(t.sessionExpired, 'error');
                        setUserEmail(null);
                        localStorage.removeItem('aiterm-user-email');
                        chrome.storage.local.remove(['aitermUserEmail']);
                        setShowAuthModal(true);
                    }
                    else if (msg.includes('503') || msg.includes('high demand') || msg.includes('overload') || msg.includes('unavailable')) {
                        showToast(t.serverBusy, 'error');
                    } else if (msg.includes('failed to fetch')) {
                        showToast(t.networkError, 'error');
                    } else {
                        showToast(t.genericError, 'error');
                    }

                    console.error("Backend Error:", error);
                    setTranslationResult("");
                }
            } finally {
                if (!controller.signal.aborted) { setIsTranslating(false); abortControllerRef.current = null; }
            }
        }
    };

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            if (wordData) {
                setDisplayedLevel(wordData.level);
                setDisplayedFrequency(wordData.frequency);
                setDonutProgress((wordData.frequency / 10) * 100);
                setIsContentReady(true);
            }
            return;
        }
        if (!wordData) return;
        let isCancelled = false;
        setDisplayedFrequency(1);
        setDonutProgress(0);
        setIsContentReady(false);

        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const targetLevelIdx = levels.indexOf(wordData.level.toUpperCase());
        if (targetLevelIdx === -1) {
            setDisplayedLevel(wordData.level);
            runFrequencyAnim();
            return;
        }

        let currentLvlIdx = 0;
        setDisplayedLevel(levels[0]);
        const levelInterval = setInterval(() => {
            if (isCancelled) { clearInterval(levelInterval); return; }
            if (currentLvlIdx < targetLevelIdx) {
                currentLvlIdx++;
                setDisplayedLevel(levels[currentLvlIdx]);
            } else {
                clearInterval(levelInterval);
                setIsLevelFlashing(true);
                setTimeout(() => { if (!isCancelled) runFrequencyAnim(); }, 450);
            }
        }, 300);

        function runFrequencyAnim() {
            if (isCancelled) return;
            const targetFreq = wordData?.frequency || 1;
            setDonutProgress((targetFreq / 10) * 100);
            const animationDuration = 800;
            const timePerStep = animationDuration / (targetFreq || 1);
            let currentFreq = 1;
            setDisplayedFrequency(currentFreq);
            const freqInterval = setInterval(() => {
                if (isCancelled) { clearInterval(freqInterval); return; }
                if (currentFreq < targetFreq) {
                    currentFreq++;
                    setDisplayedFrequency(currentFreq);
                } else {
                    clearInterval(freqInterval);
                    setIsDonutFlashing(true);
                }
            }, timePerStep);
            setTimeout(() => { if (!isCancelled) setIsContentReady(true); }, animationDuration + 100);
        }

        return () => { isCancelled = true; clearInterval(levelInterval); };
    }, [wordData]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        let val = e.target.value;

        if (val.length > 100) {
            showToast(t.textTooLong, 'error');
            return;
        }

        setInputText(val);

        if (!val.trim()) { translateText(''); return; }
        if (!targetLang) { showToast(t.selectTargetWarning, 'error'); return; }
    };

    const handleLangSelect = (langCode: string | null, targetMode: 'ui' | 'source' | 'target') => {
        if (targetMode === 'ui' && langCode) setLanguage(langCode as keyof typeof translations);
        else if (targetMode === 'source') {
            setSourceLang(langCode);
            if (inputText.trim()) setInputText(inputText + ' ');
        } else if (targetMode === 'target') {
            setTargetLang(langCode);
            if (langCode === null) {
                setIsClearing(true);
                clearUISequentially().then(() => {
                    setTranslationResult('');
                    setWordData(null);
                    setIsClearing(false);
                });
            } else {
                setToastState(prev => ({...prev, visible: false}));
                if (inputText.trim()) setInputText(inputText + ' ');
            }
        }
        setModalMode(null);
    };

    const handleSwapLanguages = async () => {
        if (isTranslating || isClearing || !targetLang) return;
        const currentEffectiveSource = sourceLang || wordData?.detectedSourceLangCode || null;
        if (translationResult.trim()) {
            const res = translationResult;
            setIsClearing(true);
            await clearUISequentially();
            setSourceLang(targetLang);
            setTargetLang(currentEffectiveSource);
            setInputText(res);
            setTranslationResult('');
            setWordData(null);
            lastSearchedText.current = '';
            setIsClearing(false);
        } else {
            setSourceLang(targetLang);
            setTargetLang(currentEffectiveSource);
        }
    };

    const renderLangModal = (mode: 'ui' | 'source' | 'target', dir: 'left' | 'right' | 'bottom', langList: typeof availableLanguages) => {
        const isOpen = modalMode === mode;
        const currentLang = mode === 'ui' ? language : (mode === 'source' ? sourceLang : targetLang);
        return (
            <div className={`lang-modal ${dir} ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="close-button modal-close-btn" onClick={() => setModalMode(null)}><CloseIcon/></div>
                <div className="lang-list">
                    {(mode === 'source' || mode === 'target') && (
                        <div className={`lang-item ${currentLang === null ? 'selected' : ''}`} onClick={() => handleLangSelect(null, mode)}><span>{t.resetLanguage}</span></div>
                    )}
                    {langList.map(lang => (
                        <div key={lang.code} className={`lang-item ${currentLang === lang.code ? 'selected' : ''}`} onClick={() => handleLangSelect(lang.code, mode)}>
                            <img src={`https://flagcdn.com/w80/${lang.flag}.png`} width="30" alt="flag" className="lang-flag"/>
                            <span>{getLanguageName(lang.code, language)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const currentUILangObj = availableLanguages.find(l => l.code === language);
    let targetLangObj = availableLanguages.find(l => l.code === targetLang);

    let displaySourceLangCode = sourceLang || wordData?.detectedSourceLangCode;
    let displaySourceLangObj = availableLanguages.find(l => l.code === displaySourceLangCode);

    if (wordData && !displaySourceLangObj) {
        displaySourceLangObj = availableLanguages.find(l => l.code === 'en');
    }

    const toggleSourceLangObj = displaySourceLangObj;
    const currentCarouselData = contentLang === 'source' ? wordData?.sourceContent : (wordData?.targetContent || wordData);

    return (
        <div className={`popup-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
            <div className={`toast ${toastState.type} ${toastState.visible ? 'visible' : ''}`}>{toastState.message}</div>

            <div className="content-wrapper">
                <header className="header">
                    <div className="header-left">
                        <div className="info-trigger" onClick={() => { setIsMenuOpen(true); setActiveMenuView('main'); }}><MenuIcon/></div>
                        <div className="theme-switch" onClick={() => setIsDarkTheme(!isDarkTheme)}>
                            <div className="theme-track"></div>
                            <div className={`theme-ball ${isDarkTheme ? 'dark' : 'light'}`}>{isDarkTheme ? <MoonIcon/> : <SunIcon/>}</div>
                        </div>
                    </div>
                    <div className="header-title"><span className="title-ai">Ai</span><span className="title-term">Term</span></div>
                    <div className="header-right">
                        <div className="save-btn" onClick={() => requireAuth(() => { if(wordData) setIsSaveModalOpen(true); else showToast(t.translateWordFirst, 'error'); })}>
                            <SaveIcon/><span className="save-text">{t.save}</span>
                        </div>
                    </div>
                </header>

                <section className="translation-block">
                    <div className="text-box-wrapper">
                        <textarea className="text-box" placeholder={t.enterWord} value={inputText} onChange={handleTextChange} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); requireAuth(() => translateText(inputText, true)); } }} disabled={isTranslating}></textarea>
                    </div>
                    <div className="translation-arrow">
                        <div className={`swap-btn ${isTranslating ? 'cancel-mode' : ''}`} onClick={isTranslating ? handleCancelRequest : handleSwapLanguages}>{isTranslating ? <CloseIcon/> : <SwapIcon/>}</div>
                    </div>
                    <div className="text-box-wrapper"><textarea className="text-box" placeholder={t.translation} readOnly value={isTranslating ? t.loading : translationResult}></textarea></div>
                </section>

                <div className="controls-row">
                    <button className="lang-select-btn" onClick={() => setModalMode('source')} disabled={isTranslating || isClearing}>
                        {displaySourceLangObj ? (
                            <>
                                <img src={`https://flagcdn.com/w40/${displaySourceLangObj.flag}.png`} width="20" alt="flag" className="inline-flag"/>
                                {getLanguageName(displaySourceLangObj.code, language)}
                            </>
                        ) : t.sourceOptional}
                    </button>
                    <button className="translate-action-btn" onClick={() => requireAuth(() => translateText(inputText, true))} disabled={isTranslating || isClearing}>{t.translateBtn}</button>
                    <button className="lang-select-btn" onClick={() => setModalMode('target')} disabled={isTranslating || isClearing}>
                        {targetLangObj ? (
                            <>
                                <img src={`https://flagcdn.com/w40/${targetLangObj.flag}.png`} width="20" alt="flag" className="inline-flag"/>
                                {getLanguageName(targetLangObj.code, language)}
                            </>
                        ) : t.chooseLang}
                    </button>
                </div>

                <div className="separator-line"></div>

                <section className="level-section">
                    <div className={`level-indicator ${isLevelFlashing ? 'flash-level' : ''}`} onAnimationEnd={(e) => { if (e.animationName === 'levelLockIn') setIsLevelFlashing(false); }}>
                        <span key={displayedLevel} className="level-text-anim">{displayedLevel}</span>
                    </div>
                    <div className="level-hint">{t.cefrHint}</div>
                </section>

                <section className="usage-section">
                    <div className="usage-hint">{t.usageHint}</div>
                    <div className={`usage-donut ${isDonutFlashing ? 'flash-donut' : ''}`} onAnimationEnd={(e) => { if (e.animationName === 'donutLockIn') setIsDonutFlashing(false); }}>
                        <svg viewBox="0 0 80 80" className="donut-svg">
                            <circle cx="40" cy="40" r="30" className="donut-track"/>
                            <circle cx="40" cy="40" r="30" className="donut-fill" style={{strokeDashoffset: 188.496 - (donutProgress / 100) * 188.496}}/>
                        </svg>
                        <div className="usage-donut-number">{displayedFrequency}</div>
                    </div>
                </section>

                <section className="examples-section">
                    <div className="examples-header">
                        <div className="examples-title-container">
                            <span className={`examples-title ${activeTabIndex === 0 ? 'active' : ''}`}>{t.examples}</span>
                            <span className={`examples-title ${activeTabIndex === 1 ? 'active' : ''}`}>{t.synonyms}</span>
                            <span className={`examples-title ${activeTabIndex === 2 ? 'active' : ''}`}>{t.explanation}</span>
                        </div>
                        <div className="examples-arrows-container">
                            <div className={`examples-arrow-button left-arrow ${shakeArrow === 'left' ? 'shake-left' : ''}`} onClick={() => { if (activeTabIndex > 0) setActiveTabIndex(activeTabIndex - 1); else { setShakeArrow('left'); setTimeout(() => setShakeArrow(null), 300); } }}>
                                <svg width="46" height="30" viewBox="0 0 32 24" fill="transparent" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                                    <path className="custom-arrow-path" d="M20 4l8 8-8 8v-5H4v-6h16V4z" />
                                </svg>
                            </div>
                            <div className={`examples-arrow-button right-arrow ${shakeArrow === 'right' ? 'shake-right' : ''}`} onClick={() => { if (activeTabIndex < 2) setActiveTabIndex(activeTabIndex + 1); else { setShakeArrow('right'); setTimeout(() => setShakeArrow(null), 300); } }}>
                                <svg width="46" height="30" viewBox="0 0 32 24" fill="transparent" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                                    <path className="custom-arrow-path" d="M20 4l8 8-8 8v-5H4v-6h16V4z" />
                                </svg>
                            </div>
                        </div>
                        {wordData && toggleSourceLangObj && targetLangObj && (
                            <div className="content-lang-toggle">
                                <img src={`https://flagcdn.com/w80/${toggleSourceLangObj.flag}.png`} width="40" className={`toggle-flag ${contentLang === 'source' ? 'active' : ''}`} onClick={() => setContentLang('source')} alt="Source"/>
                                <img src={`https://flagcdn.com/w80/${targetLangObj.flag}.png`} width="40" className={`toggle-flag ${contentLang === 'target' ? 'active' : ''}`} onClick={() => setContentLang('target')} alt="Target"/>
                            </div>
                        )}
                    </div>
                    <div className="carousel-container">
                        <div className={`carousel-track tab-${activeTabIndex}`}>
                            <div className={`carousel-slide ${activeTabIndex === 0 ? 'active-slide' : ''}`}>
                                <div className={`examples-content ${isContentReady ? 'ready' : ''}`}>
                                    <div key={contentLang} className="content-fade-wrapper">
                                        {currentCarouselData?.examples?.length ? currentCarouselData.examples.map((ex: string, i: number) => <div key={i} className="list-item">{ex}</div>) : null}
                                    </div>
                                </div>
                            </div>
                            <div className={`carousel-slide ${activeTabIndex === 1 ? 'active-slide' : ''}`}>
                                <div className={`examples-content ${isContentReady ? 'ready' : ''}`}>
                                    <div key={contentLang} className="content-fade-wrapper">
                                        {currentCarouselData?.synonyms?.length ? currentCarouselData.synonyms.map((syn: string, i: number) => <div key={i} className="list-item">{syn}</div>) : null}
                                    </div>
                                </div>
                            </div>
                            <div className={`carousel-slide ${activeTabIndex === 2 ? 'active-slide' : ''}`}>
                                <div className={`examples-content ${isContentReady ? 'ready' : ''}`}>
                                    <div key={contentLang} className="content-fade-wrapper">
                                        {currentCarouselData?.explanation || null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="carousel-pagination">
                            <div className={`dot ${activeTabIndex === 0 ? 'active' : ''}`} onClick={() => setActiveTabIndex(0)}></div>
                            <div className={`dot ${activeTabIndex === 1 ? 'active' : ''}`} onClick={() => setActiveTabIndex(1)}></div>
                            <div className={`dot ${activeTabIndex === 2 ? 'active' : ''}`} onClick={() => setActiveTabIndex(2)}></div>
                        </div>
                    </div>
                </section>
            </div>

            <div className={`confirm-overlay ${duplicateWarning ? 'visible' : ''}`} onClick={() => { setDuplicateWarning(null); setIsSaveModalOpen(true); }} style={{zIndex: 140}}>
                <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                    <h3 className="confirm-title">{t.confirmTitle}</h3>
                    <p className="confirm-text">
                        {duplicateWarning ? t.duplicateWarningText.replace('{dictName}', duplicateWarning.dictName) : ''}
                    </p>
                    <div className="confirm-actions">
                        <button className="confirm-btn cancel" onClick={() => { setDuplicateWarning(null); setIsSaveModalOpen(true); }}>
                            {t.btnCancel}
                        </button>
                        <button className="confirm-btn primary" onClick={() => { if(duplicateWarning) executeSaveWord(duplicateWarning.dictId); }}>
                            {t.btnYesAdd}
                        </button>
                    </div>
                </div>
            </div>

            <div className={`confirm-overlay ${limitModalType ? 'visible' : ''}`} onClick={() => setLimitModalType(null)} style={{zIndex: 130}}>
                <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                    <div className="close-button absolute-close" onClick={() => setLimitModalType(null)}><CloseIcon/></div>
                    <h3 className="confirm-title">{t.limitModalTitle}</h3>
                    <p className="confirm-text" style={{marginTop: '10px'}}>
                        {limitModalType === 'dicts' ? t.limitModalDicts :
                            limitModalType === 'words' ? t.limitModalWords : t.limitModalRequests}
                    </p>
                    <div className="confirm-actions" style={{marginTop: '20px', flexDirection: 'column', gap: '10px'}}>
                        <button className="confirm-btn cancel" style={{width: '100%'}} onClick={() => setLimitModalType(null)}>{t.btnCloseModal}</button>
                    </div>
                </div>
            </div>

            <div className={`confirm-overlay ${isSaveModalOpen ? 'visible' : ''}`} onClick={() => setIsSaveModalOpen(false)}>
                <div className="confirm-box save-box" onClick={(e) => e.stopPropagation()}>
                    <div className="close-button absolute-close" onClick={() => setIsSaveModalOpen(false)}><CloseIcon/></div>
                    <h3 className="confirm-title">{t.saveToDict}</h3>
                    {dictionaries.length === 0 ? (
                        <div className="empty-dict-container">
                            <p className="confirm-text" style={{marginTop: '10px'}}>{t.noDicts}</p>
                            <button className="confirm-btn primary" style={{width: '100%'}} onClick={() => { setIsSaveModalOpen(false); setReturnToSaveModal(true); setIsCreateDictModalOpen(true); }}>{t.btnCreateDict}</button>
                        </div>
                    ) : (
                        <div className="dict-list-container">
                            <p className="confirm-text" style={{marginBottom: '12px'}}>{t.selectDict}</p>
                            <div className="dict-list">
                                {dictionaries.map((d: { id: string, name: string, word_count?: number }) => (
                                    <button key={d.id} className="dict-item-btn" onClick={() => handleSaveWord(d)}>
                                        <div className="dict-item-left" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                            <div style={{flexShrink: 0, display: 'flex'}}><BookIcon/></div>
                                            <span title={d.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{d.name}</span>
                                        </div>
                                        <span className="dict-word-count" style={{flexShrink: 0}}>{d.word_count || 0}</span>
                                    </button>
                                ))}
                            </div>
                            <button className="confirm-btn cancel" style={{width: '100%'}} onClick={() => { setIsSaveModalOpen(false); setReturnToSaveModal(true); setIsCreateDictModalOpen(true); }}>{t.btnCreateDict}</button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`confirm-overlay ${isCreateDictModalOpen ? 'visible' : ''}`} onClick={handleCloseCreateModal}>
                <div className="confirm-box save-box" onClick={(e) => e.stopPropagation()}>
                    <div className="close-button absolute-close" onClick={handleCloseCreateModal}><CloseIcon/></div>
                    <h3 className="confirm-title">{t.btnCreateDict}</h3>
                    <input type="text" className="dict-input" placeholder={t.dictNamePlaceholder} value={newDictName} onChange={(e) => setNewDictName(e.target.value)} autoFocus maxLength={35} />
                    <div className="confirm-actions">
                        <button className="confirm-btn cancel" onClick={handleCloseCreateModal}>{t.btnCancel}</button>
                        <button className="confirm-btn primary" onClick={() => handleCreateDictionary(false)} disabled={isCreatingDict}>{isCreatingDict ? "..." : t.btnCreate}</button>
                    </div>
                </div>
            </div>

            <div className={`confirm-overlay ${isRenameDictModalOpen ? 'visible' : ''}`} onClick={() => setIsRenameDictModalOpen(false)}>
                <div className="confirm-box save-box" onClick={(e) => e.stopPropagation()}>
                    <div className="close-button absolute-close" onClick={() => setIsRenameDictModalOpen(false)}><CloseIcon/></div>
                    <h3 className="confirm-title">{t.btnRenameDict}</h3>
                    <input type="text" className="dict-input" placeholder={t.newNamePlaceholder} value={dictRenameValue} onChange={(e) => setDictRenameValue(e.target.value)} autoFocus maxLength={35} />
                    <div className="confirm-actions">
                        <button className="confirm-btn cancel" onClick={() => setIsRenameDictModalOpen(false)}>{t.btnCancel}</button>
                        <button className="confirm-btn primary" onClick={handleRenameDictionary} disabled={isRenamingDict}>{isRenamingDict ? "..." : t.btnRename}</button>
                    </div>
                </div>
            </div>

            <div className={`confirm-overlay ${selectedWordDetails ? 'visible' : ''}`} onClick={() => setSelectedWordDetails(null)}>
                {selectedWordDetails && (() => {
                    const data = JSON.parse(selectedWordDetails.word_data);
                    const currentData = detailLang === 'source' ? data.sourceContent : data.targetContent;

                    const explanation = currentData?.explanation || data.explanation || 'No explanation available.';
                    const syns = currentData?.synonyms || data.synonyms || [];
                    const exmpls = currentData?.examples || data.examples || [];

                    const sourceCode = data.sourceLangCode || data.detectedSourceLangCode || sourceLang || 'en';
                    const targetCode = data.targetLangCode || targetLang || 'en';

                    let sourceObj = availableLanguages.find(l => l.code === sourceCode);
                    if (!sourceObj) sourceObj = availableLanguages.find(l => l.code === 'en');

                    let targetObj = availableLanguages.find(l => l.code === targetCode);
                    if (!targetObj) targetObj = availableLanguages.find(l => l.code === 'en');

                    const isSameLang = sourceCode === targetCode || (sourceObj?.code === targetObj?.code);

                    return (
                        <div className="confirm-box word-detail-box" onClick={(e) => e.stopPropagation()} style={{position: 'relative'}}>
                            <div className="close-button danger-btn" style={{position: 'absolute', top: '10px', left: '10px'}} onClick={() => setConfirmAction('delete_word')}><TrashIcon/></div>
                            <div className="close-button absolute-close" style={{top: '10px', right: '10px'}} onClick={() => setSelectedWordDetails(null)}><CloseIcon/></div>

                            <div className="detail-row" style={{borderBottom: 'none', paddingBottom: 0, textAlign: 'center'}}>
                                <span className="detail-value" style={{fontWeight: 'bold', fontSize: '24px', color: 'var(--header-bg)', wordBreak: 'break-word', display: 'block', width: '100%'}}>
                                    {selectedWordDetails.word}
                                </span>
                                <span className="detail-value" style={{fontWeight: 'bold', fontSize: '16px', marginTop: '4px', wordBreak: 'break-word', display: 'block', width: '100%'}}>
                                    {selectedWordDetails.translation}
                                </span>
                            </div>

                            <div className="detail-row" style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '15px', paddingTop: '15px'}}>
                                <div style={{textAlign: 'center'}}>
                                    <span className="detail-label">Level</span>
                                    <span className="detail-value" style={{fontWeight: 'bold', display: 'block'}}>{data.level}</span>
                                </div>
                                <div style={{textAlign: 'center'}}>
                                    <span className="detail-label">Frequency</span>
                                    <span className="detail-value" style={{fontWeight: 'bold', display: 'block'}}>{data.frequency}/10</span>
                                </div>
                            </div>

                            {!isSameLang && (
                                <div className="modal-lang-toggle">
                                    {sourceObj && <img src={`https://flagcdn.com/w80/${sourceObj.flag}.png`} width="40" className={`toggle-flag ${detailLang === 'source' ? 'active' : ''}`} onClick={() => setDetailLang('source')} alt="Source"/>}
                                    {targetObj && <img src={`https://flagcdn.com/w80/${targetObj.flag}.png`} width="40" className={`toggle-flag ${detailLang === 'target' ? 'active' : ''}`} onClick={() => setDetailLang('target')} alt="Target"/>}
                                </div>
                            )}

                            <div className="detail-row">
                                <span className="detail-label">{t.explanation}</span>
                                <span className="detail-value">{explanation}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">{t.synonyms}</span>
                                <span className="detail-value">{syns.length > 0 ? syns.join(', ') : '-'}</span>
                            </div>
                            <div className="detail-row no-border">
                                <span className="detail-label">{t.examples}</span>
                                <div className="detail-value" style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                    {exmpls.length > 0 ? exmpls.map((ex: string, i: number) => <div key={i}>• {ex}</div>) : '-'}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            <div className={`confirm-overlay ${confirmAction ? 'visible' : ''}`} style={{zIndex: 120}}>
                <div className="confirm-box">
                    <h3 className="confirm-title">{t.confirmTitle}</h3>
                    <p className="confirm-text">
                        {confirmAction === 'remove' ? t.confirmRemoveText :
                            confirmAction === 'delete_dict' ? t.confirmDeleteDict :
                                confirmAction === 'delete_word' ? t.confirmDeleteWord :
                                    confirmAction === 'duplicate_dict' ? t.confirmDuplicateDict :
                                        t.confirmLogoutText}
                    </p>
                    <div className="confirm-actions">
                        <button className="confirm-btn cancel" onClick={() => {
                            if (confirmAction === 'duplicate_dict') setIsCreateDictModalOpen(true);
                            setConfirmAction(null);
                        }}>{t.btnCancel}</button>
                        <button className={`confirm-btn ${confirmAction === 'logout' || confirmAction === 'duplicate_dict' ? 'primary' : 'danger'}`} onClick={handleConfirmAction}>
                            {confirmAction === 'logout' ? t.btnConfirm :
                                confirmAction === 'duplicate_dict' ? t.btnYesAdd :
                                    t.btnConfirm}
                        </button>
                    </div>
                </div>
            </div>

            <div className={`menu-panel ${isMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                {activeMenuView === 'main' && (
                    <div className="menu-view-anim" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="menu-header" style={{ paddingRight: '4px', flexShrink: 0 }}>
                            <div className="header-title"><span className="title-ai">Ai</span><span className="title-term">Term</span></div>
                            <div className="close-button" onClick={() => setIsMenuOpen(false)} style={{ marginRight: '2px' }}><CloseIcon/></div>
                        </div>
                        <div className="menu-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            {userEmail ? (
                                <div style={{ padding: '5px 0 15px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 0, flexShrink: 0 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '15px', wordBreak: 'break-all', textAlign: 'center', color: 'var(--text-secondary)' }}>{userEmail}</div>

                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                        <div style={{ flex: 1, backgroundColor: 'rgba(128, 128, 128, 0.08)', padding: '12px 8px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.2' }}>{t.fullTranslations}</div>
                                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--header-bg)' }}>{mainRequestsLeft}</div>
                                        </div>
                                        <div style={{ flex: 1, backgroundColor: 'rgba(128, 128, 128, 0.08)', padding: '12px 8px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.2' }}>{t.quickTranslations}</div>
                                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--header-bg)' }}>{totalRequestsLeft}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'rgba(128, 128, 128, 0.08)', padding: '4px 12px', borderRadius: '20px' }}>
                                            {t.resetAt} <span style={{fontWeight: 'bold', color: 'var(--text-secondary)'}}>{timeUntilReset}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', marginBottom: 0, textAlign: 'center', flexShrink: 0 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>{t.notLoggedIn}</div>
                                    <button className="confirm-btn primary" style={{width: '100%', padding: '10px 0'}} onClick={() => setShowAuthModal(true)}>{t.logInBtn}</button>
                                </div>
                            )}

                            <div className="about-scroll-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
                                    <button className="menu-list-btn" style={{ margin: 0 }} onClick={() => requireAuth(() => { setActiveMenuView('dictionaries'); setDictSearchQuery(''); })}><BookIcon/><span>{t.menuDictionaries}</span></button>
                                    <button className="menu-list-btn" style={{ margin: 0 }} onClick={() => setModalMode('ui')}>
                                        <GlobeIcon/><div className="menu-lang-text"><span>{t.menuChangeLang}</span><span className="menu-lang-subtext">{currentUILangObj ? getLanguageName(currentUILangObj.code, language) : 'English'}</span></div>
                                    </button>
                                    <button className="menu-list-btn" style={{ margin: 0 }} onClick={() => setActiveMenuView('features')}><SettingsIcon/><span>{t.settingsFeatures}</span></button>
                                    <button className="menu-list-btn" style={{ margin: 0 }} onClick={() => setActiveMenuView('about')}><InfoIcon/><span>{t.about_menu}</span></button>
                                    <button className="menu-list-btn" style={{ margin: 0 }} onClick={() => setActiveMenuView('support')}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                        </svg>
                                        <span>{t.supportBtn}</span>
                                    </button>
                                </div>

                                {userEmail && (
                                    <div className="menu-footer" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
                                        <button className="menu-list-btn logout-btn" style={{ margin: 0 }} onClick={() => setConfirmAction('logout')}><LogOutIcon/><span>{t.menuLogout}</span></button>
                                        <button className="menu-list-btn danger-btn" style={{ margin: 0 }} onClick={() => setConfirmAction('remove')}><TrashIcon/><span>{t.menuRemoveProfile}</span></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeMenuView === 'support' && (
                    <div className="menu-view-anim about-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="menu-header" style={{ paddingRight: '4px' }}>
                            <div className="back-button" onClick={() => setActiveMenuView('main')}><BackIcon/></div>
                            <div className="header-title"><span className="title-ai">Ai</span><span className="title-term">Term</span></div>
                            <div className="close-button" onClick={() => setIsMenuOpen(false)} style={{ marginRight: '2px' }}><CloseIcon/></div>
                        </div>

                        <div className="about-scroll-area" style={{ padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', flex: 1, width: '100%', WebkitMaskImage: 'none', maskImage: 'none' }}>
                            <div style={{ padding: '15px 15px 0 15px', width: '100%', boxSizing: 'border-box', marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="about-text" style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '12px', textAlign: 'center', color: 'var(--text-color)' }}>
                                    {t.payCards}
                                </div>
                                <a href="https://send.monobank.ua/jar/9wyS9jdUi2" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px 0', backgroundColor: 'var(--header-bg)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'} onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                    Monobank
                                </a>
                            </div>

                            <div className="separator-line" style={{ width: 'calc(100% - 30px)', margin: '0 15px 15px 15px' }}></div>

                            <div style={{ padding: '0 15px', width: '100%', boxSizing: 'border-box', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="about-text" style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '12px', textAlign: 'center', color: 'var(--text-color)' }}>
                                    {t.payCrypto}
                                </div>
                                <a href="https://nowpayments.io/donation?api_key=7a13f050-cac5-4070-bed0-399343b52071" target="_blank" rel="noreferrer noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px 0', backgroundColor: 'var(--header-bg)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'} onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                                    Crypto
                                </a>
                            </div>

                            <div style={{ padding: '15px 25px', textAlign: 'center', width: '100%', boxSizing: 'border-box', marginTop: 'auto', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="about-text" style={{ fontSize: '18px', lineHeight: '1.6', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                    {t.donateText}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeMenuView === 'features' && (
                    <div className="menu-view-anim">
                        <div className="menu-header" style={{ paddingRight: '4px' }}>
                            <div className="back-button" onClick={() => setActiveMenuView('main')}><BackIcon/></div>
                            <div className="header-title"><span className="title-ai">Ai</span><span className="title-term">Term</span></div>
                            <div className="close-button" onClick={() => setIsMenuOpen(false)} style={{ marginRight: '2px' }}><CloseIcon/></div>
                        </div>
                        <div className="prices-body" style={{padding: '5px'}}>
                            <div className="feature-card">
                                <div className="feature-info">
                                    <span className="feature-title">{t.quickTransPopup}</span>
                                    <span className="feature-desc">{t.quickTransDesc}</span>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" checked={isQuickTranslateEnabled} onChange={toggleQuickTranslate} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <div className="soon-badge">
                                {t.soonBadge}
                            </div>
                        </div>
                    </div>
                )}

                {activeMenuView === 'about' && (
                    <div className="menu-view-anim about-body">
                        <div className="menu-header" style={{ paddingRight: '4px' }}>
                            <div className="back-button" onClick={() => setActiveMenuView('main')}><BackIcon/></div>
                            <div className="header-title"><span className="title-ai">Ai</span><span className="title-term">Term</span></div>
                            <div className="close-button" onClick={() => setIsMenuOpen(false)} style={{ marginRight: '2px' }}><CloseIcon/></div>
                        </div>

                        <div className="about-scroll-area">
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <span style={{ backgroundColor: 'rgba(128, 128, 128, 0.1)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{t.version}</span>
                            </div>

                            <div className="about-title">{t.aboutTitle1}</div>
                            <div className="about-text">
                                {t.aboutText1}
                            </div>

                            <div className="about-title">{t.aboutTitle2}</div>
                            <div className="about-text" style={{ whiteSpace: 'pre-line' }}>
                                {t.aboutText2}
                            </div>

                            <div className="about-title">{t.aboutTitle3}</div>
                            <div className="about-text" style={{ whiteSpace: 'pre-line' }}>
                                {t.aboutText3}
                            </div>
                        </div>

                        <div className="contacts-section">
                            <div className="contacts-title">{t.devContacts}</div>

                            <div className="contact-btn" onClick={handleCopyEmail}>
                                <MailIcon/>
                                <span>sarkkofag@gmail.com</span>
                                <div style={{marginLeft: 'auto', opacity: 0.5}}><CopyIcon/></div>
                            </div>

                            <a href="https://github.com/SokolMark" target="_blank" rel="noopener noreferrer" className="contact-btn">
                                <GithubIcon/>
                                <span>SokolMark</span>
                            </a>

                            <a href="https://www.linkedin.com/in/mark-sokol-1530032a4/" target="_blank" rel="noopener noreferrer" className="contact-btn">
                                <LinkedInIcon/>
                                <span>LinkedIn</span>
                            </a>

                            <a href="https://www.producthunt.com/@marksokol" target="_blank" rel="noopener noreferrer" className="contact-btn">
                                <ProductHuntIcon/>
                                <span>Product Hunt</span>
                            </a>
                        </div>
                    </div>
                )}

                {activeMenuView === 'dictionaries' && (
                    <div className="menu-view-anim">
                        <div className="menu-header" style={{ paddingRight: '4px' }}>
                            <div className="back-button" onClick={() => setActiveMenuView('main')}><BackIcon/></div>
                            <div className="header-title"><span className="title-ai">Ai</span><span className="title-term">Term</span></div>
                            <div className="close-button" onClick={() => setIsMenuOpen(false)} style={{ marginRight: '2px' }}><CloseIcon/></div>
                        </div>

                        {dictionaries.length > 0 && (
                            <input type="text" className="search-input" placeholder={t.searchDict} value={dictSearchQuery} onChange={(e) => setDictSearchQuery(e.target.value)} />
                        )}

                        <div className="dictionaries-body">
                            {dictionaries.length === 0 ? (
                                <div className="empty-dict-container" style={{marginTop: '20px'}}>
                                    <p className="confirm-text">{t.noDicts}</p>
                                    <button className="confirm-btn primary" style={{width: '100%', marginTop: '10px'}} onClick={() => { setReturnToSaveModal(false); setIsCreateDictModalOpen(true); }}>{t.btnCreateDict}</button>
                                </div>
                            ) : (
                                <div className="dict-list-container">
                                    <div className="dict-list" style={{maxHeight: 'none', overflowY: 'visible'}}>
                                        {filteredDictionaries.length > 0 ? (
                                            filteredDictionaries.map((d: { id: string, name: string, word_count?: number }) => (
                                                <button key={d.id} className="dict-item-btn" onClick={() => handleOpenDictionary(d)}>
                                                    <div className="dict-item-left" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                        <div style={{flexShrink: 0, display: 'flex'}}><BookIcon/></div>
                                                        <span title={d.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{d.name}</span>
                                                    </div>
                                                    <span className="dict-word-count" style={{flexShrink: 0}}>{d.word_count || 0}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="confirm-text" style={{textAlign: 'center', width: '100%', marginTop: '10px'}}>{t.nothingFound}</p>
                                        )}
                                    </div>
                                    <button className="confirm-btn primary" style={{width: '100%', marginTop: '10px'}} onClick={() => { setReturnToSaveModal(false); setIsCreateDictModalOpen(true); }}>{t.btnCreateDict}</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeMenuView === 'dict_view' && activeDictionary && (
                    <div className="menu-view-anim">
                        <div className="menu-header" style={{ paddingRight: '4px' }}>
                            <div className="back-button" onClick={() => { setActiveMenuView('dictionaries'); setDictSearchQuery(''); }}><BackIcon/></div>
                            <div className="header-title" style={{ fontSize: '18px', flex: 1, textAlign: 'center', margin: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: 0 }}>
                                <span title={activeDictionary.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{activeDictionary.name}</span>
                                <div className="edit-button" style={{cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6, flexShrink: 0}} onClick={() => { setDictRenameValue(activeDictionary.name); setIsRenameDictModalOpen(true); }}>
                                    <EditIcon />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                                <div className="close-button danger-btn" onClick={() => setConfirmAction('delete_dict')}><TrashIcon/></div>
                                <div className="close-button" onClick={() => setIsMenuOpen(false)} style={{ marginRight: '2px' }}><CloseIcon/></div>
                            </div>
                        </div>

                        {dictWords.length > 0 && (
                            <input type="text" className="search-input" placeholder={t.searchWord} value={wordSearchQuery} onChange={(e) => setWordSearchQuery(e.target.value)} />
                        )}

                        <div className="dictionaries-body">
                            {dictWords.length === 0 ? (
                                <p className="confirm-text" style={{textAlign: 'center', marginTop: '20px'}}>{t.noWordsSaved}</p>
                            ) : filteredWords.length === 0 ? (
                                <p className="confirm-text" style={{textAlign: 'center', marginTop: '20px'}}>{t.nothingFound}</p>
                            ) : (
                                <div className="words-list-container">
                                    {filteredWords.map((w: any) => (
                                        <div key={w.id} className="word-item-btn" onClick={() => { setSelectedWordDetails(w); setDetailLang('target'); }} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span className="word-item-orig" title={w.word} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{w.word}</span>
                                            <span className="word-item-trans" title={w.translation} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'right', minWidth: 0, color: 'var(--text-secondary)' }}>{w.translation}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <AuthScreen showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} handleGoogleAuth={handleGoogleAuth} isLoggingIn={isLoggingIn} t={t} />

            <div className={`confirm-overlay ${showWelcomeModal ? 'visible' : ''}`} style={{zIndex: 10000}} onClick={handleCloseWelcomeModal}>
                <div className="confirm-box" style={{padding: '40px 24px 30px', maxWidth: '340px', position: 'relative'}} onClick={(e) => e.stopPropagation()}>
                    <div className="close-button absolute-close" onClick={handleCloseWelcomeModal} style={{top: '12px', right: '12px', zIndex: 10}}><CloseIcon/></div>
                    <h3 className="confirm-title" style={{fontSize: '22px', marginBottom: '15px', marginTop: '10px'}}>{t.welcomeTitle}</h3>
                    <p className="confirm-text" style={{fontSize: '14.5px', marginBottom: '12px', color: 'var(--text-color)'}}>
                        {t.welcomeText1}
                    </p>
                    <p className="confirm-text" style={{fontSize: '14px', marginBottom: '24px'}}>
                        {t.welcomeText2}
                    </p>
                    <button className="confirm-btn primary" style={{width: '100%', fontSize: '16px', padding: '12px 0'}} onClick={handleCloseWelcomeModal}>
                        {t.welcomeBtn}
                    </button>
                </div>
            </div>

            {renderLangModal('source', 'left', availableLanguages)}
            {renderLangModal('target', 'right', availableLanguages)}
            {renderLangModal('ui', 'bottom', availableLanguages.filter(l => l.supportsUI))}
        </div>
    );
}

export default Popup;