/**
 * Supabase REST Client Wrapper (Service Role)
 */
// ══════════════════════════════════════════════════════════
// SUPABASE CLIENT (simple fetch wrapper)
// ══════════════════════════════════════════════════════════

class SupabaseClient {
    private url: string;
    private key: string;

    constructor(url: string, key: string) {
        this.url = url.replace(/\/$/, '');
        this.key = key;
    }

    async query(table: string, options: {
        method?: string;
        select?: string;
        filters?: string;
        body?: any;
        order?: string;
        limit?: number;
        range?: [number, number];
        prefer?: string;
        single?: boolean;
    } = {}) {
        const { method = 'GET', select, filters, body, order, limit, prefer, single } = options;

        let url = `${this.url}/rest/v1/${table}`;
        const params: string[] = [];

        if (select) params.push(`select=${encodeURIComponent(select)}`);
        if (filters) params.push(filters);
        if (order) params.push(`order=${encodeURIComponent(order)}`);
        if (limit) params.push(`limit=${limit}`);
        if (params.length) url += '?' + params.join('&');

        const headers: Record<string, string> = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
        };

        if (prefer) headers['Prefer'] = prefer;
        if (single) headers['Accept'] = 'application/vnd.pgrst.object+json';

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Supabase error ${response.status}: ${errText}`);
        }

        // For HEAD requests or 204 responses
        if (response.status === 204 || method === 'HEAD') return null;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('json')) {
            return response.json();
        }
        return null;
    }

    async insert(table: string, data: any | any[], options?: { returning?: boolean }) {
        const prefer = options?.returning !== false ? 'return=representation' : 'return=minimal';
        return this.query(table, { method: 'POST', body: data, prefer });
    }

    async update(table: string, data: any, filters: string) {
        return this.query(table, { method: 'PATCH', body: data, filters, prefer: 'return=representation' });
    }

    async select(table: string, options: {
        select?: string;
        filters?: string;
        order?: string;
        limit?: number;
        single?: boolean;
    } = {}) {
        return this.query(table, { method: 'GET', ...options });
    }
}


export { SupabaseClient };
