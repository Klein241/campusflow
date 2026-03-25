
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const resources = [
    {
        day_number: 1,
        resource_type: 'video',
        title: 'Introduction au Jeûne',
        description: 'Comprendre les fondements spirituels du jeûne et de la prière.',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder
        sort_order: 1,
        is_active: true
    },
    {
        day_number: 1,
        resource_type: 'pdf',
        title: 'Guide de Prière - Jour 1',
        description: 'Les points de prière essentiels pour bien démarrer.',
        url: 'https://example.com/guide-jour-1.pdf',
        sort_order: 2,
        is_active: true
    },
    {
        day_number: 2,
        resource_type: 'audio',
        title: 'Adoration Matinale',
        description: 'Une playlist pour votre temps de prière.',
        url: 'https://example.com/worship.mp3',
        sort_order: 1,
        is_active: true
    },
    {
        day_number: 3,
        resource_type: 'image',
        title: 'Verset Illustré',
        description: 'Une image à partager pour encourager vos proches.',
        url: 'https://images.unsplash.com/photo-1507692049790-de58293a4654?w=800',
        sort_order: 1,
        is_active: true
    }
];

async function seed() {
    console.log('🌱 Starting seed...');

    const { error } = await supabase.from('day_resources').insert(resources);

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.error('❌ Error: Table "day_resources" does not exist.');
            console.error('👉 Please run the SQL from FINAL_INSTRUCTIONS.md first!');
        } else {
            console.error('❌ Error inserting resources:', error.message);
        }
    } else {
        console.log('✅ Successfully seeded day_resources!');
    }

    // Attempt to seed a demo prayer request if empty
    const { data: prayers } = await supabase.from('tutoring_requests').select('id').limit(1);
    if (prayers && prayers.length === 0) {
        console.log('📝 Seeding first prayer request...');
        // We need a user ID. If we are anon, we might fail unless RLS allows.
        // Usually insert requires auth. This might fail if run as anon script.
        // So we skip it or warn.
        console.log('⚠️ Skipping prayer request seed (requires authenticated user).');
    }
}

seed();
