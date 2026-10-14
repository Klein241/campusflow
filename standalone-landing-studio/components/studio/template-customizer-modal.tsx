'use client';

import { TemplateCustomizerStudio, type TemplateCustomConfig, type TemplateCustomizerStudioProps } from './template-customizer-studio';

export type { TemplateCustomConfig };

export interface TemplateCustomizerModalProps extends Partial<TemplateCustomizerStudioProps> {
    isOpen: boolean;
    onClose: () => void;
    org: any;
    currentTemplateId?: string;
    onSaveSuccess?: (updatedOrg: any) => void;
}

/**
 * Modale Studio Plein Écran pour intégration directe dans les pages d'administration
 */
export function TemplateCustomizerModal({
    isOpen,
    onClose,
    org,
    currentTemplateId = 'bento_grid',
    onSaveSuccess,
    classrooms = [],
    filieres = [],
    teacherCount = 12,
    studentCount = 280,
    workerUrl,
    onSave,
    onUploadImage,
}: TemplateCustomizerModalProps) {
    if (!isOpen) return null;

    return (
        <TemplateCustomizerStudio
            org={org}
            orgSlug={org.slug || ''}
            currentTemplateId={currentTemplateId}
            onClose={onClose}
            onSaveSuccess={onSaveSuccess}
            classrooms={classrooms}
            filieres={filieres}
            teacherCount={teacherCount}
            studentCount={studentCount}
            workerUrl={workerUrl}
            onSave={onSave}
            onUploadImage={onUploadImage}
        />
    );
}

export default TemplateCustomizerModal;
