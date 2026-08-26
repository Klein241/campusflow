/**
 * IZITEACH IA — SERVICE DE TRADUCTION ASYNCHRONE & MULTI-TÂCHES
 * - Gestion des tâches de traduction en arrière-plan (permet plusieurs traductions simultanées)
 * - Barre de progression et état persistant
 * - Stockage LocalStorage pour réutilisation instantanée sans retraduire
 * - Historique "Mes cours traduits"
 */

export interface TranslatedItem {
    id: string; // lesson.id ou chapter.id
    type: 'lesson' | 'chapter';
    title: string;
    target_lang: string;
    target_lang_name: string;
    target_lang_native: string;
    quality_stars: number;
    translated_text: string;
    original_text: string;
    translated_at: string;
    chapter_title?: string;
    subject_title?: string;
}

export interface TranslationTask {
    id: string; // unique task id
    itemId: string;
    type: 'lesson' | 'chapter';
    title: string;
    targetLang: string;
    targetLangName: string;
    targetLangNative: string;
    qualityStars: number;
    progress: number; // 0 à 100
    status: 'pending' | 'translating' | 'completed' | 'error';
    error?: string;
    chapterTitle?: string;
    subjectTitle?: string;
    startTime: number;
}

const WORKER_URL = 'https://campusflow-worker.kleintaptue1.workers.dev';
const STORAGE_PREFIX = 'iziteach_translations_v2_';

// Tâches actives en mémoire
const activeTasks = new Map<string, TranslationTask>();
const listeners = new Set<(tasks: TranslationTask[]) => void>();

function notifyListeners() {
    const list = Array.from(activeTasks.values());
    listeners.forEach(fn => fn(list));
    // Dispatch window event pour que n'importe quel composant React puisse réagir
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('iziteach_translation_tasks_updated', { detail: list }));
    }
}

export function subscribeToTranslationTasks(callback: (tasks: TranslationTask[]) => void): () => void {
    listeners.add(callback);
    callback(Array.from(activeTasks.values()));
    return () => {
        listeners.delete(callback);
    };
}

export function getActiveTranslationTasks(): TranslationTask[] {
    return Array.from(activeTasks.values());
}

export function getActiveTaskForItem(itemId: string, targetLang?: string): TranslationTask | undefined {
    return Array.from(activeTasks.values()).find(t => 
        t.itemId === itemId && (!targetLang || t.targetLang === targetLang) && t.status !== 'completed' && t.status !== 'error'
    );
}

// ── Stockage LocalStorage ──
export function getSavedTranslations(userId: string): TranslatedItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
        if (!raw) return [];
        return JSON.parse(raw) as TranslatedItem[];
    } catch {
        return [];
    }
}

export function getSavedTranslation(userId: string, itemId: string, targetLang?: string): TranslatedItem | undefined {
    const all = getSavedTranslations(userId);
    return all.find(item => item.id === itemId && (!targetLang || item.target_lang === targetLang));
}

export function saveTranslation(userId: string, item: TranslatedItem) {
    if (typeof window === 'undefined') return;
    try {
        const all = getSavedTranslations(userId);
        // Remplacer si déjà présent (même id et même langue)
        const filtered = all.filter(t => !(t.id === item.id && t.target_lang === item.target_lang));
        filtered.unshift(item);
        // Conserver les 150 dernières traductions max
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(filtered.slice(0, 150)));
        window.dispatchEvent(new CustomEvent('iziteach_translations_changed', { detail: filtered }));
    } catch (e) {
        console.warn('[saveTranslation error]', e);
    }
}

export function deleteSavedTranslation(userId: string, itemId: string, targetLang: string) {
    if (typeof window === 'undefined') return;
    try {
        const all = getSavedTranslations(userId);
        const filtered = all.filter(t => !(t.id === itemId && t.target_lang === targetLang));
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('iziteach_translations_changed', { detail: filtered }));
    } catch (e) {
        console.warn('[deleteSavedTranslation error]', e);
    }
}

// ── Lancement d'une traduction asynchrone avec suivi de pourcentage ──
export async function startBackgroundTranslation(params: {
    itemId: string;
    type: 'lesson' | 'chapter';
    title: string;
    rawText: string;
    targetLang: string;
    targetLangName: string;
    targetLangNative: string;
    qualityStars: number;
    userId: string;
    chapterTitle?: string;
    subjectTitle?: string;
    onCompleted?: (item: TranslatedItem) => void;
    onError?: (err: string) => void;
}): Promise<string> {
    const taskId = `${params.itemId}_${params.targetLang}_${Date.now()}`;
    
    // Vérifier si déjà traduit en cache
    const cached = getSavedTranslation(params.userId, params.itemId, params.targetLang);
    if (cached) {
        if (params.onCompleted) params.onCompleted(cached);
        return taskId;
    }

    const task: TranslationTask = {
        id: taskId,
        itemId: params.itemId,
        type: params.type,
        title: params.title,
        targetLang: params.targetLang,
        targetLangName: params.targetLangName,
        targetLangNative: params.targetLangNative,
        qualityStars: params.qualityStars,
        progress: 10,
        status: 'translating',
        chapterTitle: params.chapterTitle,
        subjectTitle: params.subjectTitle,
        startTime: Date.now(),
    };

    activeTasks.set(taskId, task);
    notifyListeners();

    // Simulation d'une progression réaliste pendant l'appel IA
    const interval = setInterval(() => {
        const cur = activeTasks.get(taskId);
        if (!cur || cur.status !== 'translating') {
            clearInterval(interval);
            return;
        }
        if (cur.progress < 85) {
            cur.progress = Math.min(85, cur.progress + Math.floor(Math.random() * 12) + 6);
            notifyListeners();
        }
    }, 450);

    // Exécution de la requête vers le Worker
    try {
        const res = await fetch(`${WORKER_URL}/api/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: params.rawText,
                target_lang: params.targetLang,
                source_lang: 'fr',
            }),
        });

        clearInterval(interval);

        const data = await res.json() as any;
        if (!res.ok || !data.ok || !data.translated_text) {
            throw new Error(data.error || 'Erreur lors de la traduction');
        }

        task.progress = 100;
        task.status = 'completed';
        notifyListeners();

        const translatedItem: TranslatedItem = {
            id: params.itemId,
            type: params.type,
            title: params.title,
            target_lang: params.targetLang,
            target_lang_name: params.targetLangName,
            target_lang_native: params.targetLangNative,
            quality_stars: params.qualityStars,
            translated_text: data.translated_text,
            original_text: params.rawText,
            translated_at: new Date().toISOString(),
            chapter_title: params.chapterTitle,
            subject_title: params.subjectTitle,
        };

        saveTranslation(params.userId, translatedItem);

        if (params.onCompleted) params.onCompleted(translatedItem);

        // Nettoyage de la tâche complétée après 4 secondes
        setTimeout(() => {
            activeTasks.delete(taskId);
            notifyListeners();
        }, 4000);

        return taskId;
    } catch (e: any) {
        clearInterval(interval);
        task.status = 'error';
        task.error = e.message || 'Erreur de connexion';
        notifyListeners();
        if (params.onError) params.onError(task.error || 'Erreur de connexion');
        // Supprimer après 5 secondes
        setTimeout(() => {
            activeTasks.delete(taskId);
            notifyListeners();
        }, 5000);
        throw e;
    }
}
