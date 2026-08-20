const ENDPOINT = 'https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway';
const API_KEY = 'cf_live_92c515b2e6291cefffd2ddf714fefb10138fe7f89dc58580e69f9c46dd152d33';

async function callMcp(method, params = {}) {
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'test_' + Date.now(),
            method,
            params
        })
    });
    return await res.json();
}

async function runExpertTests() {
    console.log('🚀 DÉMARRAGE DES TESTS EXPERTS MCP IZITEACH...\n');
    let passed = 0;
    let failed = 0;

    function assert(condition, name, details) {
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            if (details) console.log(`   └─ ${JSON.stringify(details)}`);
            passed++;
        } else {
            console.log(`❌ [FAIL] ${name}`);
            if (details) console.log(`   └─ Erreur: ${JSON.stringify(details)}`);
            failed++;
        }
    }

    // 1. Test tools/list
    const toolsRes = await callMcp('tools/list');
    const toolNames = (toolsRes.result?.tools || []).map(t => t.name);
    assert(toolsRes.result?.tools?.length >= 15, '1. tools/list retourne tous les outils déclarés', { count: toolNames.length, tools: toolNames });

    // 2. Test get_org_info
    const orgRes = await callMcp('tools/call', { name: 'get_org_info', arguments: {} });
    assert(orgRes.result?.content?.[0]?.text?.includes('organization'), '2. get_org_info retourne l\'organisation', JSON.parse(orgRes.result?.content?.[0]?.text || '{}'));

    // 3. Test list_classes
    const classesRes = await callMcp('tools/call', { name: 'list_classes', arguments: {} });
    assert(classesRes.result?.content?.[0]?.text?.includes('classes'), '3. list_classes liste les classes', JSON.parse(classesRes.result?.content?.[0]?.text || '{}'));

    // 4. Test SÉCURITÉ FK : create_exercise avec une leçon inexistante DOIT ÉCHOUER
    const orphanExRes = await callMcp('tools/call', {
        name: 'create_exercise',
        arguments: {
            lesson_id: '00000000-0000-0000-0000-000000000000',
            title: 'Test Sécurité Orphelin',
            question: 'Question test',
            type: 'qcm',
            choices: ['A', 'B'],
            correct_answer: 'A'
        }
    });
    assert(orphanExRes.error && orphanExRes.error.message.includes('n\'existe pas'), '4. [SÉCURITÉ FK] Rejet immédiat de create_exercise avec lesson_id inexistant', orphanExRes.error);

    // 5. Test Création Matière
    const createSubRes = await callMcp('tools/call', {
        name: 'create_subject',
        arguments: { name: 'TEST QA - Mathématiques Avancées', description: 'Matière de validation automatique' }
    });
    const subData = JSON.parse(createSubRes.result?.content?.[0]?.text || '{}');
    const testSubjectId = subData.subject_id;
    assert(subData.success && testSubjectId, '5. create_subject crée la matière avec succès', subData);

    // 6. Test Modification Matière (update_subject)
    const updateSubRes = await callMcp('tools/call', {
        name: 'update_subject',
        arguments: { subject_id: testSubjectId, name: 'TEST QA - Mathématiques Renommées' }
    });
    const updateSubData = JSON.parse(updateSubRes.result?.content?.[0]?.text || '{}');
    assert(updateSubData.success, '6. update_subject modifie le nom de la matière', updateSubData);

    // 7. Test Création Chapitre (create_chapter)
    const createChRes = await callMcp('tools/call', {
        name: 'create_chapter',
        arguments: { subject_id: testSubjectId, title: 'Chapitre 1 : Algèbre Linéaire', position: 1 }
    });
    const chData = JSON.parse(createChRes.result?.content?.[0]?.text || '{}');
    const testChapterId = chData.chapter_id;
    assert(chData.success && testChapterId, '7. create_chapter crée le chapitre', chData);

    // 8. Test Modification Chapitre (update_chapter)
    const updateChRes = await callMcp('tools/call', {
        name: 'update_chapter',
        arguments: { chapter_id: testChapterId, title: 'Chapitre 1 : Algèbre Linéaire & Matrices' }
    });
    const updateChData = JSON.parse(updateChRes.result?.content?.[0]?.text || '{}');
    assert(updateChData.success, '8. update_chapter modifie le chapitre', updateChData);

    // 9. Test Création Leçon (create_lesson)
    const createLesRes = await callMcp('tools/call', {
        name: 'create_lesson',
        arguments: {
            chapter_id: testChapterId,
            title: 'Leçon 1.1 : Espaces Vectoriels',
            content: '# Introduction\n\nUn espace vectoriel $E$ est stable par combinaison linéaire.',
            duration_minutes: 25
        }
    });
    const lesData = JSON.parse(createLesRes.result?.content?.[0]?.text || '{}');
    const testLessonId = lesData.lesson_id;
    assert(lesData.success && testLessonId, '9. create_lesson crée la leçon avec Markdown supporté', lesData);

    // 10. Test Modification Leçon (update_lesson)
    const updateLesRes = await callMcp('tools/call', {
        name: 'update_lesson',
        arguments: { lesson_id: testLessonId, duration_minutes: 30 }
    });
    const updateLesData = JSON.parse(updateLesRes.result?.content?.[0]?.text || '{}');
    assert(updateLesData.success, '10. update_lesson modifie la durée de la leçon', updateLesData);

    // 11. Test Création Exercice QCM (create_exercise avec format JSONB)
    const createExRes = await callMcp('tools/call', {
        name: 'create_exercise',
        arguments: {
            lesson_id: testLessonId,
            title: 'Quiz 1 : Définitions Vectorielles',
            type: 'qcm',
            question: 'Quelle est la dimension de R^3 ?',
            choices: ['1', '2', '3', '4'],
            correct_answer: '3',
            explanation: 'R^3 est de dimension 3 engendré par les 3 vecteurs de la base canonique.',
            max_score: 20
        }
    });
    const exData = JSON.parse(createExRes.result?.content?.[0]?.text || '{}');
    const testExerciseId = exData.exercise_id;
    assert(exData.success && testExerciseId, '11. create_exercise crée l\'exercice QCM au format JSONB', exData);

    // 12. Test list_lessons AVEC exercices_count et liste d'exercices
    const listLesRes = await callMcp('tools/call', {
        name: 'list_lessons',
        arguments: { chapter_id: testChapterId }
    });
    const listLesData = JSON.parse(listLesRes.result?.content?.[0]?.text || '{}');
    const lessonFound = listLesData.lessons?.find(l => l.id === testLessonId);
    assert(lessonFound && lessonFound.exercises_count >= 1 && lessonFound.exercises?.length >= 1, '12. list_lessons inclut exercises_count et la liste des exercices', {
        title: lessonFound?.title,
        exercises_count: lessonFound?.exercises_count,
        exercises: lessonFound?.exercises
    });

    // 13. Test bulk_create (Création complète d'un cursus en 1 seul appel)
    const bulkRes = await callMcp('tools/call', {
        name: 'bulk_create',
        arguments: {
            subject_name: 'TEST QA - Physique Quantique Bulk',
            chapters: [
                {
                    title: 'Chapitre 1 : Les Ondes de De Broglie',
                    lessons: [
                        {
                            title: 'Leçon 1 : Dualité Onde-Corpuscule',
                            content: 'La relation de De Broglie est lambda = h / p.',
                            duration_minutes: 20,
                            exercises: [
                                {
                                    title: 'QCM Dualité',
                                    type: 'qcm',
                                    question: 'Quelle constante relie l\'onde au corpuscule ?',
                                    choices: ['Planck (h)', 'Gravitation (G)', 'Vitesse lumière (c)'],
                                    correct_answer: 'Planck (h)'
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    });
    const bulkData = JSON.parse(bulkRes.result?.content?.[0]?.text || '{}');
    const bulkSubjectId = bulkData.subject_id;
    assert(bulkData.success && bulkData.summary?.chapters === 1 && bulkData.summary?.lessons === 1 && bulkData.summary?.exercises === 1, '13. bulk_create crée toute l\'arborescence en 1 seul appel éclair', bulkData);

    // 14. Nettoyage de la base de données (Tests de suppression delete_*)
    console.log('\n🧹 NETTOYAGE DES DONNÉES DE TEST...');
    const delEx = await callMcp('tools/call', { name: 'delete_exercise', arguments: { exercise_id: testExerciseId } });
    assert(JSON.parse(delEx.result?.content?.[0]?.text || '{}').success, '14. delete_exercise supprime l\'exercice', delEx.result);

    const delLes = await callMcp('tools/call', { name: 'delete_lesson', arguments: { lesson_id: testLessonId } });
    assert(JSON.parse(delLes.result?.content?.[0]?.text || '{}').success, '15. delete_lesson supprime la leçon', delLes.result);

    const delCh = await callMcp('tools/call', { name: 'delete_chapter', arguments: { chapter_id: testChapterId } });
    assert(JSON.parse(delCh.result?.content?.[0]?.text || '{}').success, '16. delete_chapter supprime le chapitre', delCh.result);

    const delSub = await callMcp('tools/call', { name: 'delete_subject', arguments: { subject_id: testSubjectId } });
    assert(JSON.parse(delSub.result?.content?.[0]?.text || '{}').success, '17. delete_subject supprime la matière de test 1', delSub.result);

    if (bulkSubjectId) {
        const delBulkSub = await callMcp('tools/call', { name: 'delete_subject', arguments: { subject_id: bulkSubjectId } });
        assert(JSON.parse(delBulkSub.result?.content?.[0]?.text || '{}').success, '18. delete_subject supprime la matière bulk de test 2', delBulkSub.result);
    }

    console.log(`\n═════════════════════════════════════════════════════════════════════`);
    console.log(`📊 BILAN DU PROTOCOLE DE TEST EXPERT : ${passed} RÉUSSIS / ${passed + failed} TOTAL (${failed} ÉCHECS)`);
    console.log(`═════════════════════════════════════════════════════════════════════\n`);
}

runExpertTests().catch(console.error);
