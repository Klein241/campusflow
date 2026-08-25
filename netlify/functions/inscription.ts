import type { Config, Context } from '@netlify/functions';
import { supabaseAdmin } from '../../src/lib/supabase-admin';

export default async (req: Request, _context: Context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

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

        if (!organization_id || !first_name || !last_name || !phone || !access_code || !pin_code) {
            return new Response(JSON.stringify({ error: 'Champs obligatoires manquants' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Vérification doublon étudiant
        const { data: existingStudent } = await supabaseAdmin
            .from('student_profiles')
            .select('id')
            .eq('organization_id', organization_id)
            .ilike('first_name', first_name.trim())
            .ilike('last_name', last_name.trim())
            .limit(1);

        if (existingStudent && existingStudent.length > 0) {
            return new Response(JSON.stringify({
                error: `Un profil étudiant avec le nom "${first_name.trim()} ${last_name.trim()}" existe déjà dans cet établissement.`
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
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
            console.error('[netlify/inscription]', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Créer immédiatement le student_profile
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
                sky_points:      100,
                is_active:       true,
                pin_set:         true,
            });

        if (profileErr) {
            console.warn('[netlify/inscription] student_profile creation warning:', profileErr.message);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: unknown) {
        console.error('[netlify/inscription] Erreur:', err);
        const message = err instanceof Error ? err.message : 'Erreur serveur';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config: Config = {
    path: '/api/inscription',
};
