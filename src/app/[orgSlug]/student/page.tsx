'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Students don't self-register — only admin creates accounts
// Redirect to login page
export default function StudentPage() {
    const { orgSlug } = useParams<{ orgSlug: string }>();
    const router = useRouter();
    useEffect(() => { router.replace(`/${orgSlug}/login`); }, [orgSlug, router]);
    return null;
}
