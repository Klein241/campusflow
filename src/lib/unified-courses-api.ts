// ============================================================
// STUB — unified-courses-api (legacy Bible API remplacée)
// Ce fichier existe uniquement pour satisfaire les imports
// des composants hérités. Les fonctions retournent des valeurs
// par défaut inoffensives.
// ============================================================

export const DEFAULT_TRANSLATION = 'LSG';

export interface CoursesBook {
    id: string;
    name: string;
    chapters: number;
}

export const courses_BOOKS: CoursesBook[] = [];

export const coursesApi = {
    parseReference: (_ref: string) => null,
    getVerse: async (_ref: string) => null,
    getChapter: async (_book: string, _chapter: number) => [],
    search: async (_query: string) => [],
};

export function coursesVerse(_ref: string): string {
    return '';
}

export const coursesBook = {
    getBooks: () => [],
    getChapters: (_bookId: string) => 0,
};
