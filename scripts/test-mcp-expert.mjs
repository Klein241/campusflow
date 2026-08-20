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

    // 14. Test Salle d'évaluation : create_exam_paper
    const examRes = await callMcp('tools/call', {
        name: 'create_exam_paper',
        arguments: {
            title: 'Examen Blanc : Mathématiques & Analyse',
            subject: 'Mathématiques',
            coefficient: 3,
            duration_minutes: 90,
            instructions: 'Calculatrice interdite. Justifiez chaque étape.',
            questions: [
                {
                    id: 'q1',
                    text: 'Calculer la dérivée de f(x) = ln(x^2 + 1)',
                    type: 'redaction',
                    points: 5
                },
                {
                    id: 'q2',
                    text: 'Quelle est la valeur de l\'intégrale de 0 à 1 de exp(x) dx ?',
                    type: 'qcm',
                    points: 5,
                    options: ['e - 1', 'e', '1', 'ln(2)'],
                    correct: 'e - 1'
                }
            ],
            status: 'published'
        }
    });
    const examData = JSON.parse(examRes.result?.content?.[0]?.text || '{}');
    const testExamId = examData.paper_id;
    assert(examData.success && testExamId, '14. create_exam_paper crée une épreuve dans la Salle d\'Évaluation avec push auto', examData);

    // 15. Test list_exam_papers
    const listExamRes = await callMcp('tools/call', {
        name: 'list_exam_papers',
        arguments: { subject: 'Mathématiques' }
    });
    const listExamData = JSON.parse(listExamRes.result?.content?.[0]?.text || '{}');
    assert(listExamData.exam_papers?.length >= 1, '15. list_exam_papers liste les épreuves de la Salle d\'Évaluation', { count: listExamData.total });

    // 16. Test update_exam_paper
    const updateExamRes = await callMcp('tools/call', {
        name: 'update_exam_paper',
        arguments: { paper_id: testExamId, duration_minutes: 120, coefficient: 4 }
    });
    const updateExamData = JSON.parse(updateExamRes.result?.content?.[0]?.text || '{}');
    assert(updateExamData.success, '16. update_exam_paper modifie la durée et le coefficient de l\'épreuve', updateExamData);

    // 17. Test launch_exam_session (Démarrer une session en direct)
    const launchRes = await callMcp('tools/call', {
        name: 'launch_exam_session',
        arguments: { paper_id: testExamId }
    });
    const launchData = JSON.parse(launchRes.result?.content?.[0]?.text || '{}');
    assert(launchData.success && launchData.session_id, '17. launch_exam_session lance l\'évaluation en direct avec push', launchData);

    // 18. Test Création de Formulaire / Sondage : create_form
    const createFormRes = await callMcp('tools/call', {
        name: 'create_form',
        arguments: {
            title: 'Sondage : Qualité des cours et vie sur le campus',
            description: 'Donnez votre avis pour nous aider à améliorer votre formation.',
            form_type: 'survey',
            is_published: true,
            fields: [
                {
                    label: 'Comment évaluez-vous la clarté des cours ?',
                    field_type: 'rating',
                    required: true
                },
                {
                    label: 'Quels sont vos points d\'amélioration prioritaires ?',
                    field_type: 'long_text',
                    description: 'Sky Agent peut vous aider à formuler vos propositions.',
                    required: false
                }
            ]
        }
    });
    const formData = JSON.parse(createFormRes.result?.content?.[0]?.text || '{}');
    const testFormId = formData.form_id;
    assert(formData.success && testFormId && formData.public_url, '18. create_form crée un formulaire/sondage avec lien direct et notification push', {
        form_id: testFormId,
        public_url: formData.public_url,
        slug: formData.slug
    });

    // 19. Test list_forms
    const listFormsRes = await callMcp('tools/call', {
        name: 'list_forms',
        arguments: { form_type: 'survey' }
    });
    const listFormsData = JSON.parse(listFormsRes.result?.content?.[0]?.text || '{}');
    assert(listFormsData.forms?.length >= 1, '19. list_forms retourne la liste des formulaires actifs', { count: listFormsData.total });

    // 20. Test get_form_results
    const formResultsRes = await callMcp('tools/call', {
        name: 'get_form_results',
        arguments: { form_id: testFormId }
    });
    const formResultsData = JSON.parse(formResultsRes.result?.content?.[0]?.text || '{}');
    assert(formResultsData.form && formResultsData.fields?.length === 2, '20. get_form_results retourne les champs et résultats du sondage', {
        title: formResultsData.form?.title,
        fields_count: formResultsData.fields?.length
    });

    // 21. Nettoyage de la base de données (Tests de suppression delete_*)
    console.log('\n🧹 NETTOYAGE DES DONNÉES DE TEST...');
    const delEx = await callMcp('tools/call', { name: 'delete_exercise', arguments: { exercise_id: testExerciseId } });
    assert(JSON.parse(delEx.result?.content?.[0]?.text || '{}').success, '21. delete_exercise supprime l\'exercice', delEx.result);

    const delLes = await callMcp('tools/call', { name: 'delete_lesson', arguments: { lesson_id: testLessonId } });
    assert(JSON.parse(delLes.result?.content?.[0]?.text || '{}').success, '22. delete_lesson supprime la leçon', delLes.result);

    const delCh = await callMcp('tools/call', { name: 'delete_chapter', arguments: { chapter_id: testChapterId } });
    assert(JSON.parse(delCh.result?.content?.[0]?.text || '{}').success, '23. delete_chapter supprime le chapitre', delCh.result);

    const delSub = await callMcp('tools/call', { name: 'delete_subject', arguments: { subject_id: testSubjectId } });
    assert(JSON.parse(delSub.result?.content?.[0]?.text || '{}').success, '24. delete_subject supprime la matière de test 1', delSub.result);

    if (bulkSubjectId) {
        const delBulkSub = await callMcp('tools/call', { name: 'delete_subject', arguments: { subject_id: bulkSubjectId } });
        assert(JSON.parse(delBulkSub.result?.content?.[0]?.text || '{}').success, '25. delete_subject supprime la matière bulk de test 2', delBulkSub.result);
    }

    if (testExamId) {
        const delExam = await callMcp('tools/call', { name: 'delete_exam_paper', arguments: { paper_id: testExamId } });
        assert(JSON.parse(delExam.result?.content?.[0]?.text || '{}').success, '26. delete_exam_paper supprime l\'épreuve de test', delExam.result);
    }

    console.log(`\n═════════════════════════════════════════════════════════════════════`);
    console.log(`📊 BILAN DU PROTOCOLE DE TEST EXPERT : ${passed} RÉUSSIS / ${passed + failed} TOTAL (${failed} ÉCHECS)`);
    console.log(`═════════════════════════════════════════════════════════════════════\n`);
}

runExpertTests().catch(console.error);
