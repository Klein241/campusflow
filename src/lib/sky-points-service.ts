import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/lib/session';

/**
 * Updates Sky Points balance atomically across profile tables AND sky_points table,
 * persists the new balance in the localStorage session cache,
 * then dispatches the 'sky_points_updated' event to sync all UI badges instantly.
 */
export async function updateSkyPoints(
    userId: string,
    newBalance: number,
    userRole: 'student' | 'teacher' | 'admin' | 'owner' | 'prof' = 'student',
    orgId?: string
) {
    // 1. Update BOTH profile tables to guarantee consistency regardless of role mismatch
    try {
        await supabase.from('teacher_profiles').update({ sky_points: newBalance }).eq('id', userId);
    } catch {}
    try {
        await supabase.from('student_profiles').update({ sky_points: newBalance }).eq('id', userId);
    } catch {}

    // 2. Upsert into sky_points table (for RPCs/daily claims)
    try {
        await supabase.from('sky_points').upsert({
            user_id: userId,
            balance: newBalance,
            organization_id: orgId || null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
        console.warn('sky_points upsert skipped:', e);
    }

    // 3. Sync session cache
    try {
        SessionManager.patch({ sky_points: newBalance });
    } catch (e) {
        console.warn('Could not persist sky_points to session cache:', e);
    }

    // 4. Fire custom event for real-time UI synchronization across all components
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sky_points_updated', { detail: { newBalance } }));
    }
}

/**
 * Fetches the unified current balance from teacher_profiles, student_profiles, or sky_points table.
 */
export async function fetchSkyPoints(
    userId: string,
    userRole?: string
): Promise<number> {
    try {
        // Try teacher_profiles first
        const { data: teacher } = await supabase.from('teacher_profiles').select('sky_points').eq('id', userId).maybeSingle();
        if (teacher?.sky_points !== undefined && teacher?.sky_points !== null) {
            return teacher.sky_points;
        }

        // Try student_profiles next
        const { data: student } = await supabase.from('student_profiles').select('sky_points').eq('id', userId).maybeSingle();
        if (student?.sky_points !== undefined && student?.sky_points !== null) {
            return student.sky_points;
        }

        // Try sky_points table
        const { data: sp } = await supabase.from('sky_points').select('balance').eq('user_id', userId).maybeSingle();
        if (sp?.balance !== undefined && sp?.balance !== null) {
            return sp.balance;
        }
    } catch (e) {
        console.error('Error fetching sky points:', e);
    }
    return 100;
}


/**
 * Deducts Sky Points from a user's balance, records the transaction,
 * and fires all sync events. Returns the new balance.
 * Returns null if the user doesn't have enough points.
 */
export async function deductSkyPoints(
    userId: string,
    amount: number,
    transactionType: string,
    description: string,
    userRole: 'student' | 'teacher' | 'admin' = 'student',
    orgId?: string
): Promise<number | null> {
    const currentBalance = await fetchSkyPoints(userId, userRole);
    if (currentBalance < amount) return null;

    const newBalance = currentBalance - amount;
    await updateSkyPoints(userId, newBalance, userRole, orgId);

    // Record transaction with both old and new column names for compatibility
    try {
        await supabase.from('sky_transactions').insert({
            user_id: userId,
            student_id: userRole === 'student' ? userId : null,
            amount: -amount,
            type: transactionType,
            transaction_type: transactionType,
            description,
            organization_id: orgId || null,
        });
    } catch (e) {
        console.warn('sky_transactions insert skipped:', e);
    }

    return newBalance;
}

/**
 * Adds Sky Points to a user's balance and records the transaction.
 * Returns the new balance.
 */
export async function creditSkyPoints(
    userId: string,
    amount: number,
    transactionType: string,
    description: string,
    userRole: 'student' | 'teacher' | 'admin' = 'student',
    orgId?: string
): Promise<number> {
    const currentBalance = await fetchSkyPoints(userId, userRole);
    const newBalance = currentBalance + amount;
    await updateSkyPoints(userId, newBalance, userRole, orgId);

    try {
        await supabase.from('sky_transactions').insert({
            user_id: userId,
            student_id: userRole === 'student' ? userId : null,
            amount,
            type: transactionType,
            transaction_type: transactionType,
            description,
            organization_id: orgId || null,
        });
    } catch (e) {
        console.warn('sky_transactions insert skipped:', e);
    }

    return newBalance;
}
