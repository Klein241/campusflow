import { supabase } from '@/lib/supabase';

export interface DuplicationResult {
    success: boolean;
    error?: string;
    newClassroomId?: string;
    newClassroomName?: string;
    stats?: {
        subjects: number;
        chapters: number;
        lessons: number;
        exercises: number;
    };
}

/**
 * Duplique intégralement une filière / formation (classroom)
 * Copie en profondeur :
 * 1. La classe/filière elle-même (titre, description, affiches, tarifs, durées, rythmes, configuration des sessions)
 * 2. Toutes ses matières/modules constitutifs (subjects)
 * 3. Tous les chapitres de chaque matière (chapters)
 * 4. Toutes les leçons de chaque chapitre (lessons)
 * 5. Tous les exercices de chaque chapitre (exercises)
 *
 * Le résultat est une nouvelle entité 100% indépendante : modifier le titre,
 * les prix, l'affiche, ou le contenu de la copie ne modifie en rien l'original.
 */
export async function duplicateFormation(
    sourceClassroomId: string,
    organizationId: string,
    options?: {
        customName?: string;
    }
): Promise<DuplicationResult> {
    try {
        if (!sourceClassroomId || !organizationId) {
            return { success: false, error: 'Identifiant de formation ou d\'organisation manquant.' };
        }

        // 1. Récupérer la formation source complète
        const { data: sourceClass, error: classErr } = await supabase
            .from('classrooms')
            .select('*')
            .eq('id', sourceClassroomId)
            .single();

        if (classErr || !sourceClass) {
            return { success: false, error: `Formation introuvable : ${classErr?.message || 'ID invalide'}` };
        }

        const newName = (options?.customName || `Copie de ${sourceClass.name}`).trim();

        // 2. Insérer la nouvelle classe (nouvelle formation)
        const newClassPayload: any = {
            organization_id: organizationId,
            name: newName,
            level: sourceClass.level || 1,
            cycle: sourceClass.cycle || null,
            capacity: sourceClass.capacity || 100,
            tuition_fee: sourceClass.tuition_fee || 0,
            frais_scolarite: sourceClass.frais_scolarite || sourceClass.tuition_fee || 0,
            registration_fee: sourceClass.registration_fee || 0,
            frais_inscription: sourceClass.frais_inscription || sourceClass.registration_fee || 0,
            training_duration: sourceClass.training_duration || null,
            duree_mois: sourceClass.duree_mois || null,
            rhythm: sourceClass.rhythm || 'Cours du Jour (Plein temps)',
            description: sourceClass.description || null,
            prix_barre: sourceClass.prix_barre || null,
            poster_url: sourceClass.poster_url || null,
            image_url: sourceClass.image_url || null,
            status: sourceClass.status || 'in_progress',
            certification_type: sourceClass.certification_type || 'attestation_reussite',
            schedule_config: sourceClass.schedule_config ? JSON.parse(JSON.stringify(sourceClass.schedule_config)) : {},
            competencies_list: Array.isArray(sourceClass.competencies_list) ? [...sourceClass.competencies_list] : [],
            filiere_id: sourceClass.filiere_id || null,
        };

        let createdClass: any = null;
        const { data: directInsert, error: directErr } = await supabase
            .from('classrooms')
            .insert(newClassPayload)
            .select()
            .single();

        if (directErr || !directInsert) {
            console.warn('[duplicateFormation] Insert direct classrooms bloqué par RLS, tentative de secours via create_classroom_secure:', directErr);
            const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)('create_classroom_secure', {
                p_org_id: organizationId,
                p_name: newName,
                p_cycle: newClassPayload.cycle,
                p_level: newClassPayload.level,
                p_capacity: newClassPayload.capacity,
                p_tuition_fee: newClassPayload.tuition_fee,
                p_registration_fee: newClassPayload.registration_fee,
                p_training_duration: newClassPayload.training_duration,
                p_description: newClassPayload.description,
                p_prix_barre: newClassPayload.prix_barre,
                p_schedule_config: newClassPayload.schedule_config,
                p_competencies_list: newClassPayload.competencies_list
            });

            if (rpcErr || !rpcData?.classroom) {
                return { success: false, error: directErr?.message || rpcErr?.message || 'Échec de duplication de la classe' };
            }
            createdClass = rpcData.classroom;
        } else {
            createdClass = directInsert;
        }

        const newClassId = createdClass.id;
        const stats = { subjects: 0, chapters: 0, lessons: 0, exercises: 0 };

        // 3. Récupérer et cloner toutes les matières / modules (subjects)
        const { data: sourceSubjects } = await supabase
            .from('subjects')
            .select('*')
            .eq('classroom_id', sourceClassroomId)
            .order('created_at', { ascending: true });

        if (sourceSubjects && sourceSubjects.length > 0) {
            for (const sub of sourceSubjects) {
                const newSubPayload: any = {
                    organization_id: organizationId,
                    classroom_id: newClassId,
                    name: sub.name,
                    code: sub.code || null,
                    coefficient: sub.coefficient || 1,
                    hours_per_week: sub.hours_per_week || 2,
                    teacher_id: sub.teacher_id || null
                };

                const { data: createdSub, error: subErr } = await supabase
                    .from('subjects')
                    .insert(newSubPayload)
                    .select()
                    .single();

                if (subErr || !createdSub) {
                    console.warn(`[duplicateFormation] Échec clonage matière "${sub.name}":`, subErr);
                    continue;
                }
                stats.subjects++;

                // 4. Récupérer et cloner tous les chapitres de cette matière
                const { data: sourceChapters } = await supabase
                    .from('chapters')
                    .select('*')
                    .eq('subject_id', sub.id)
                    .order('position', { ascending: true });

                if (sourceChapters && sourceChapters.length > 0) {
                    for (const ch of sourceChapters) {
                        const newChPayload: any = {
                            organization_id: organizationId,
                            subject_id: createdSub.id,
                            title: ch.title,
                            description: ch.description || null,
                            content: ch.content || null,
                            video_url: ch.video_url || null,
                            position: ch.position || 0,
                            status: ch.status || 'published',
                            unlock_date: ch.unlock_date || null,
                            lock_date: ch.lock_date || null,
                            is_drip_locked: ch.is_drip_locked ?? false,
                            period_name: ch.period_name || null,
                            language: ch.language || 'fr'
                        };

                        const { data: createdCh, error: chErr } = await supabase
                            .from('chapters')
                            .insert(newChPayload)
                            .select()
                            .single();

                        if (chErr || !createdCh) {
                            console.warn(`[duplicateFormation] Échec clonage chapitre "${ch.title}":`, chErr);
                            continue;
                        }
                        stats.chapters++;

                        // 5. Cloner toutes les leçons de ce chapitre
                        const { data: sourceLessons } = await supabase
                            .from('lessons')
                            .select('*')
                            .eq('chapter_id', ch.id)
                            .order('position', { ascending: true });

                        if (sourceLessons && sourceLessons.length > 0) {
                            for (const lsn of sourceLessons) {
                                const newLsnPayload: any = {
                                    organization_id: organizationId,
                                    chapter_id: createdCh.id,
                                    title: lsn.title,
                                    content: lsn.content || null,
                                    video_url: lsn.video_url || null,
                                    position: lsn.position || 0,
                                    status: lsn.status || 'published',
                                    language: lsn.language || 'fr'
                                };

                                const { error: lsnErr } = await supabase
                                    .from('lessons')
                                    .insert(newLsnPayload);

                                if (!lsnErr) {
                                    stats.lessons++;
                                }
                            }
                        }

                        // 6. Cloner les exercices de ce chapitre
                        const { data: sourceExercises } = await supabase
                            .from('exercises')
                            .select('*')
                            .eq('chapter_id', ch.id);

                        if (sourceExercises && sourceExercises.length > 0) {
                            for (const ex of sourceExercises) {
                                const newExPayload: any = {
                                    organization_id: organizationId,
                                    chapter_id: createdCh.id,
                                    subject_id: createdSub.id,
                                    title: ex.title,
                                    description: ex.description || null,
                                    content: ex.content || null,
                                    max_score: ex.max_score || 20,
                                    type: ex.type || 'text'
                                };

                                const { error: exErr } = await supabase
                                    .from('exercises')
                                    .insert(newExPayload);

                                if (!exErr) {
                                    stats.exercises++;
                                }
                            }
                        }
                    }
                }
            }
        }

        return {
            success: true,
            newClassroomId: newClassId,
            newClassroomName: newName,
            stats
        };
    } catch (err: any) {
        console.error('[duplicateFormation] Exception:', err);
        return { success: false, error: err.message || 'Erreur inattendue pendant la duplication' };
    }
}
