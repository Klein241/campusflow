async function testMcpConnection() {
    const endpoint = 'https://campusflow-worker.kleintaptue1.workers.dev/mcp-gateway';
    const apiKey = 'cf_live_sa_dd1653d49768d91a12c67e801e1f063c39196e65345d2d51687097b0142fde5e';

    console.log('=== TEST 1: Ping ===');
    try {
        const pingRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'ping',
                id: 1
            })
        });
        console.log('Ping Status:', pingRes.status, pingRes.statusText);
        console.log('Ping Body:', await pingRes.text());
    } catch (err) {
        console.error('Ping Error:', err.message);
    }

    console.log('\n=== TEST 2: Initialize ===');
    try {
        const initRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'IziTeach-Tester', version: '1.0.0' }
                },
                id: 2
            })
        });
        console.log('Initialize Status:', initRes.status, initRes.statusText);
        console.log('Initialize Body:', await initRes.text());
    } catch (err) {
        console.error('Initialize Error:', err.message);
    }

    console.log('\n=== TEST 3: Tools/List ===');
    try {
        const toolsRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/list',
                params: {},
                id: 3
            })
        });
        console.log('Tools/List Status:', toolsRes.status, toolsRes.statusText);
        const toolsData = await toolsRes.json();
        if (toolsData.result && toolsData.result.tools) {
            console.log(`Tools/List Success! Found ${toolsData.result.tools.length} available tools.`);
            console.log('Tools Names:', toolsData.result.tools.map(t => t.name).join(', '));
        } else {
            console.log('Tools/List Response:', JSON.stringify(toolsData, null, 2));
        }
    } catch (err) {
        console.error('Tools/List Error:', err.message);
    }
}

testMcpConnection();
