'use client';

import { TemplateCustomizerStudio, type TemplateCustomConfig } from '@/components/campus/template-customizer-studio';

export type { TemplateCustomConfig };

interface TemplateCustomizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    org: any;
    currentTemplateId: string;
    onSaveSuccess: (updatedOrg: any) => void;
    classrooms?: any[];
    filieres?: any[];
    teacherCount?: number;
    studentCount?: number;
}

/**
 * Ancien composant Modal re-routé vers le Studio Plein Écran pour une expérience haut de gamme
 */
export function TemplateCustomizerModal({
    isOpen,
    onClose,
    org,
    currentTemplateId,
    onSaveSuccess,
    classrooms = [],
    filieres = [],
    teacherCount = 12,
    studentCount = 280
}: TemplateCustomizerModalProps) {
    if (!isOpen) return null;

    return (
        <TemplateCustomizerStudio
            org={org}
            orgSlug={org.slug}
            currentTemplateId={currentTemplateId}
            onClose={onClose}
            onSaveSuccess={onSaveSuccess}
            classrooms={classrooms}
            filieres={filieres}
            teacherCount={teacherCount}
            studentCount={studentCount}
        />
    );
}
