'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/use-org-slug';

// Students don't self-register — only admin creates accounts
// Redirect to login page
export default function StudentPage() {
    const orgSlug = useOrgSlug();
    const router = useRouter();
    useEffect(() => { router.replace(`/${orgSlug}/login`); }, [orgSlug, router]);
    return null;
}
