// ============================================================
// STUB — courses-features (legacy Bible features remplacées)
// ============================================================

import { useState } from 'react';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange'];

export function usecoursesFavorites() {
    const [favorites] = useState<any[]>([]);
    return {
        favorites,
        addFavorite: (_v: any) => { },
        removeFavorite: (_id: string) => { },
        isFavorite: (_id: string) => false,
    };
}

export function usecoursesHighlights() {
    const [highlights] = useState<any[]>([]);
    return {
        highlights,
        addHighlight: (_id: string, _color: HighlightColor) => { },
        removeHighlight: (_id: string) => { },
        getHighlight: (_id: string) => null,
    };
}

export function shareVerse(_text: string, _ref: string) {
    if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ text: `${_text} — ${_ref}` }).catch(() => { });
    }
}
