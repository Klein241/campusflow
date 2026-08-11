// src/app/api/inscription/route.ts
// Route API server-side — bypasse le RLS grâce au client service_role
// POST /api/inscription

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            organization_id,
            first_name,
            last_name,
            phone,
            access_code,
            pin_code,
            birth_date,
            gender,
            email,
            address,
            classroom_id,
            filiere_id,
        } = body;

        // Validation minimale côté serveur
        if (!organization_id || !first_name || !last_name || !phone || !access_code || !pin_code) {
            return NextResponse.json(
                { error: 'Champs obligatoires manquants' },
                { status: 400 }
            );
        }

        const payload: Record<string, unknown> = {
            organization_id,
            first_name,
            last_name,
            phone,
            access_code,
            pin_code,
        };

        if (birth_date)   payload.birth_date   = birth_date;
        if (gender)       payload.gender        = gender;
        if (email)        payload.email         = email;
        if (address)      payload.address       = address;
        if (classroom_id) payload.classroom_id  = classroom_id;
        if (filiere_id)   payload.filiere_id    = filiere_id;

        const { error } = await supabaseAdmin
            .from('inscription_requests')
            .insert(payload);

        if (error) {
            console.error('[inscription API]', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[inscription API] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
    }
}
