import { supabase } from './supabase';

// ════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════
export type FieldType =
    | 'short_text'
    | 'long_text'
    | 'multiple_choice'
    | 'checkbox'
    | 'dropdown'
    | 'date'
    | 'time'
    | 'rating'
    | 'number'
    | 'section_header';

export type FormType = 'survey' | 'quiz' | 'registration';

export interface FormField {
    id?: string;
    form_id?: string;
    field_type: FieldType;
    label: string;
    description?: string;
    options?: string[];
    required: boolean;
    sort_order: number;
    correct_answer?: string;
    points?: number;
}

export interface CampusForm {
    id?: string;
    organization_id: string;
    created_by_role: 'teacher' | 'student' | 'admin';
    created_by_id: string;
    title: string;
    description?: string;
    slug: string;
    form_type: FormType;
    is_published: boolean;
    accepts_responses: boolean;
    show_results_to_respondents: boolean;
    created_at?: string;
    updated_at?: string;
    form_fields?: FormField[];
}

export interface FormResponse {
    id?: string;
    form_id: string;
    respondent_name?: string;
    respondent_email?: string;
    total_score?: number;
    submitted_at?: string;
    form_answers?: FormAnswer[];
}

export interface FormAnswer {
    id?: string;
    response_id?: string;
    field_id: string;
    answer_value: any; // string | string[] | number | null
}

// ════════════════════════════════════════════════
// SLUG GENERATION
// ════════════════════════════════════════════════
function generateSlug(title: string): string {
    const base = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 28);
    const unique = Math.random().toString(36).slice(2, 7);
    return `${base}-${unique}`;
}

// ════════════════════════════════════════════════
// SERVICE
// ════════════════════════════════════════════════
export const formsService = {
    // ── Create a new form ──────────────────────
    async createForm(data: {
        organization_id: string;
        created_by_role: 'teacher' | 'student' | 'admin';
        created_by_id: string;
        title: string;
        description?: string;
        form_type: FormType;
    }): Promise<CampusForm | null> {
        const slug = generateSlug(data.title);
        const { data: form, error } = await supabase
            .from('forms')
            .insert({
                ...data,
                slug,
                is_published: false,
                accepts_responses: true,
                show_results_to_respondents: false,
            })
            .select()
            .single();
        if (error) { console.error('[forms] createForm:', error); return null; }
        return form;
    },

    // ── Update form metadata ───────────────────
    async updateForm(id: string, updates: Partial<CampusForm>): Promise<boolean> {
        const { error } = await supabase
            .from('forms')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) { console.error('[forms] updateForm:', error); return false; }
        return true;
    },

    // ── Delete a form ──────────────────────────
    async deleteForm(id: string): Promise<boolean> {
        const { error } = await supabase.from('forms').delete().eq('id', id);
        if (error) { console.error('[forms] deleteForm:', error); return false; }
        return true;
    },

    // ── Get forms created by a user ────────────
    async getFormsByCreator(organizationId: string, creatorId: string): Promise<CampusForm[]> {
        const { data, error } = await supabase
            .from('forms')
            .select('*, form_fields(*)')
            .eq('organization_id', organizationId)
            .eq('created_by_id', creatorId)
            .order('created_at', { ascending: false });
        if (error) { console.error('[forms] getFormsByCreator:', error); return []; }
        // Sort fields by sort_order
        return (data || []).map((f: any) => ({
            ...f,
            form_fields: (f.form_fields || []).sort((a: FormField, b: FormField) => a.sort_order - b.sort_order),
        }));
    },

    // ── Get published forms for an org ────────
    async getOrgPublishedForms(organizationId: string): Promise<CampusForm[]> {
        const { data, error } = await supabase
            .from('forms')
            .select('id, title, description, form_type, slug, created_by_id, created_by_role, created_at')
            .eq('organization_id', organizationId)
            .eq('is_published', true)
            .eq('accepts_responses', true)
            .order('created_at', { ascending: false });
        if (error) { console.error('[forms] getOrgPublishedForms:', error); return []; }
        return data || [];
    },

    // ── Get a form by slug (public) ────────────
    async getFormBySlug(slug: string): Promise<(CampusForm & { form_fields: FormField[] }) | null> {
        const { data, error } = await supabase
            .from('forms')
            .select('*, form_fields(*)')
            .eq('slug', slug)
            .single();
        if (error) { console.error('[forms] getFormBySlug:', error); return null; }
        if (data?.form_fields) {
            data.form_fields = data.form_fields.sort(
                (a: FormField, b: FormField) => a.sort_order - b.sort_order
            );
        }
        return data;
    },

    // ── Save / replace all fields for a form ──
    async upsertFields(formId: string, fields: FormField[]): Promise<boolean> {
        // Delete existing fields first
        await supabase.from('form_fields').delete().eq('form_id', formId);
        if (fields.length === 0) return true;

        const toInsert = fields.map((f, i) => ({
            form_id: formId,
            field_type: f.field_type,
            label: f.label,
            description: f.description || null,
            options: f.options?.length ? f.options : null,
            required: f.required,
            sort_order: i,
            correct_answer: f.correct_answer || null,
            points: f.points ?? 0,
        }));

        const { error } = await supabase.from('form_fields').insert(toInsert);
        if (error) { console.error('[forms] upsertFields:', error); return false; }
        return true;
    },

    // ── Submit a response ──────────────────────
    async submitResponse(
        formId: string,
        answers: { field_id: string; answer_value: any }[],
        respondentName?: string,
        respondentEmail?: string,
    ): Promise<string | null> {
        const { data: response, error: respError } = await supabase
            .from('form_responses')
            .insert({
                form_id: formId,
                respondent_name: respondentName || null,
                respondent_email: respondentEmail || null,
                total_score: 0,
            })
            .select()
            .single();

        if (respError || !response) { console.error('[forms] submitResponse:', respError); return null; }

        if (answers.length > 0) {
            const toInsert = answers.map(a => ({
                response_id: response.id,
                field_id: a.field_id,
                answer_value: a.answer_value,
            }));
            const { error: ansError } = await supabase.from('form_answers').insert(toInsert);
            if (ansError) console.error('[forms] insertAnswers:', ansError);
        }

        return response.id;
    },

    // ── Get all responses for a form ───────────
    async getResponses(formId: string): Promise<FormResponse[]> {
        const { data, error } = await supabase
            .from('form_responses')
            .select('*, form_answers(*)')
            .eq('form_id', formId)
            .order('submitted_at', { ascending: false });
        if (error) { console.error('[forms] getResponses:', error); return []; }
        return data || [];
    },

    // ── Get response count ─────────────────────
    async getResponseCount(formId: string): Promise<number> {
        const { count, error } = await supabase
            .from('form_responses')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', formId);
        if (error) return 0;
        return count || 0;
    },
};
