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

        // ── Créer immédiatement le student_profile pour accès instantané ──
        // L'étudiant peut se connecter dès la fin de l'inscription avec son code.
        const { error: profileErr } = await supabaseAdmin
            .from('student_profiles')
            .insert({
                organization_id: organization_id,
                first_name:      first_name,
                last_name:       last_name,
                phone:           phone,
                email:           email      || null,
                address:         address    || null,
                birth_date:      birth_date || null,
                gender:          gender     || null,
                classroom_id:    classroom_id || null,
                filiere_id:      filiere_id   || null,
                access_code:     access_code,
                pin_code:        pin_code,
                sky_points:      100,   // Points de bienvenue
                is_active:       true,
                pin_set:         true,  // PIN configuré lors de l'inscription
            });

        if (profileErr) {
            // Log mais ne bloque pas — la demande est quand même enregistrée
            console.warn('[inscription API] student_profile creation failed:', profileErr.message);
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[inscription API] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
    }
}
