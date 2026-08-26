const crypto = require('crypto');

async function testSupabaseRpc() {
    const supabaseUrl = 'https://nuisijvopyudmbcqpaua.supabase.co';
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51aXNpanZvcHl1ZG1iY3FwYXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM1NDIwOSwiZXhwIjoyMDg5OTMwMjA5fQ.iiQ84MBnoamamIfDf2iBGgYfrgQwR9n-YClhV5TBI_w';
    const testKey = 'cf_live_sa_dd1653d49768d91a12c67e801e1f063c39196e65345d2d51687097b0142fde5e';

    const hash = crypto.createHash('sha256').update(testKey).digest('hex');
    console.log('Key:', testKey);
    console.log('Computed SHA-256 Hash:', hash);

    // 1. Direct query to ai_agent_keys table
    console.log('\n--- 1. Query table public.ai_agent_keys ---');
    const tableRes = await fetch(`${supabaseUrl}/rest/v1/ai_agent_keys?key_hash=eq.${hash}`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        }
    });
    console.log('Table query status:', tableRes.status);
    const tableData = await tableRes.json();
    console.log('Table record:', JSON.stringify(tableData, null, 2));

    // 2. Query verify_ai_agent_key RPC
    console.log('\n--- 2. Call RPC verify_ai_agent_key ---');
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/verify_ai_agent_key`, {
        method: 'POST',
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_raw_key: testKey })
    });
    console.log('RPC status:', rpcRes.status);
    const rpcData = await rpcRes.json();
    console.log('RPC response:', JSON.stringify(rpcData, null, 2));

    // 3. Query all recent keys to see what's in the table
    console.log('\n--- 3. Last 5 keys in ai_agent_keys ---');
    const allKeysRes = await fetch(`${supabaseUrl}/rest/v1/ai_agent_keys?select=id,name,key_prefix,is_superadmin,is_active,permissions,created_at&order=created_at.desc&limit=5`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        }
    });
    const allKeys = await allKeysRes.json();
    console.log('Recent keys:', JSON.stringify(allKeys, null, 2));
}

testSupabaseRpc();
