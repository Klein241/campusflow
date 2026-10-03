#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════
 * IZITEACH MCP — NATIVE STDIO BRIDGE
 * ══════════════════════════════════════════════════════════
 * Permet d'utiliser le serveur MCP IziTeach via Stdio standard
 * (Claude Desktop, Cursor IDE, Windsurf, CLI autonomes).
 * 
 * Usage:
 *   node scripts/mcp-stdio.js
 *   export IZITEACH_MCP_KEY="cf_live_..."
 * ══════════════════════════════════════════════════════════
 */
import readline from 'readline';

const ENDPOINT = process.env.IZITEACH_MCP_URL || 'https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway';
const API_KEY = process.env.IZITEACH_MCP_KEY || process.argv[2] || '';

if (!API_KEY) {
    console.error('[IziTeach MCP Stdio Bridge] ERREUR: Aucune clé fournie. Définissez la variable d\'environnement IZITEACH_MCP_KEY ou passez-la en premier argument : node scripts/mcp-stdio.js cf_live_...');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    } catch (e) {
        console.error('[IziTeach MCP] JSON invalide reçu sur stdin:', trimmed);
        return;
    }

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(parsed)
        });

        const data = await response.json();
        // Écrire la réponse JSON-RPC sur stdout (standard MCP)
        process.stdout.write(JSON.stringify(data) + '\n');
    } catch (err) {
        const errResponse = {
            jsonrpc: '2.0',
            id: parsed.id ?? null,
            error: {
                code: -32603,
                message: `Erreur passerelle IziTeach: ${err.message || 'Échec réseau'}`
            }
        };
        process.stdout.write(JSON.stringify(errResponse) + '\n');
    }
});
