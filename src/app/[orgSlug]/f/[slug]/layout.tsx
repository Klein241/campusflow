// Static export: generate placeholder for the [slug] segment.
// At runtime, the real slug is read client-side.
export function generateStaticParams() {
    return [{ slug: '_' }];
}

export default function FormPublicLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
