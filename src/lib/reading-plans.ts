// ============================================================
// STUB — reading-plans (legacy Bible reading plans)
// ============================================================

import { create } from 'zustand';

export interface MemoryCard {
    id: string;
    reference: string;
    text: string;
    nextReview: string;
    interval: number;
    easeFactor: number;
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export const READING_PLANS: any[] = [];

export const useReadingPlanStore = create<any>(() => ({
    activePlan: null,
    memoryCards: [],
    setActivePlan: () => { },
    addMemoryCard: () => { },
    rateCard: () => { },
}));
