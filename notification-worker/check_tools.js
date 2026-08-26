/**
 * IZITEACH MCP & WORKER TOOLS VERIFIER
 * Script de vérification et diagnostic des outils MCP, D1, Supabase et IA
 */

const WORKER_URL = process.env.WORKER_URL || 'https://campusflow-worker.kleintaptue1.workers.dev';
const API_KEY = process.env.MCP_API_KEY || 'cf_live_92c515b2e6291cefffd2ddf714fefb10138fe7f89dc58580e69f9c46dd152d33';

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    try {
        return { status: res.status, ok: res.ok, data: JSON.parse(text) };
    } catch {
        return { status: res.status, ok: res.ok, data: text };
    }
}

async function callMcp(method, params = {}) {
    return await fetchJson(`${WORKER_URL}/mcp-gateway`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'check_' + Date.now(),
            method,
            params,
        }),
    });
}

async function runDiagnostics() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   🔍 IZITEACH — VÉRIFICATION DES OUTILS & SERVICES');
    console.log(`   Worker Target: ${WORKER_URL}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Health Check
    console.log('1️⃣  Vérification de l\'état de santé (/health)...');
    const health = await fetchJson(`${WORKER_URL}/health`);
    if (health.ok) {
        console.log('   ✅ Worker & D1 opérationnels :', JSON.stringify(health.data));
    } else {
        console.log('   ❌ Erreur Health :', health.status, health.data);
    }

    // 2. MCP Tools List
    console.log('\n2️⃣  Liste des Outils MCP (tools/list)...');
    const toolsRes = await callMcp('tools/list');
    if (toolsRes.ok && toolsRes.data?.result?.tools) {
        const tools = toolsRes.data.result.tools;
        console.log(`   ✅ ${tools.length} outils MCP détectés :\n`);
        tools.forEach((t, i) => {
            console.log(`   [${String(i + 1).padStart(2, '0')}] ${t.name.padEnd(30, ' ')} : ${t.description?.slice(0, 70)}...`);
        });
    } else {
        console.log('   ❌ Échec tools/list :', toolsRes.status, toolsRes.data);
    }

    // 3. Test Appel Tool MCP (get_org_info)
    console.log('\n3️⃣  Test d\'exécution MCP : get_org_info...');
    const orgCall = await callMcp('tools/call', { name: 'get_org_info', arguments: {} });
    if (orgCall.ok && orgCall.data?.result?.content) {
        console.log('   ✅ Réponse get_org_info :', orgCall.data.result.content[0]?.text?.slice(0, 150) + '...');
    } else {
        console.log('   ⚠️ get_org_info :', orgCall.data);
    }

    // 4. Test Service Traduction IziTeach IA
    console.log('\n4️⃣  Vérification du catalogue de langues (/api/translate/languages)...');
    const langs = await fetchJson(`${WORKER_URL}/api/translate/languages`);
    if (langs.ok && langs.data?.languages) {
        const list = Object.values(langs.data.languages);
        console.log(`   ✅ ${list.length} langues supportées avec indicateur de qualité (étoiles 1-5)`);
        const sample = list.slice(0, 5).map(l => `${l.name_native} (${l.quality_stars}★)`).join(', ');
        console.log(`   Exemples : ${sample}...`);
    } else {
        console.log('   ❌ Échec endpoint langues :', langs.status, langs.data);
    }

    // 5. Test Traduction en direct
    console.log('\n5️⃣  Test de traduction IA directe (Français → Anglais)...');
    const translateRes = await fetchJson(`${WORKER_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: 'Bonjour, bienvenue sur IziTeach.',
            target_lang: 'en',
            source_lang: 'fr',
        }),
    });
    if (translateRes.ok && translateRes.data?.translated_text) {
        console.log(`   ✅ Traduction réussie : "${translateRes.data.translated_text}"`);
        console.log(`   └─ Méthode : ${translateRes.data.method}`);
    } else {
        console.log('   ❌ Échec traduction :', translateRes.status, translateRes.data);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   🎉 DIAGNOSTIC TERMINÉ AVEC SUCCÈS !');
    console.log('═══════════════════════════════════════════════════════════\n');
}

runDiagnostics().catch(console.error);
