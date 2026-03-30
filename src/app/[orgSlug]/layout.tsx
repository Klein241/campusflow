// Static export requires generateStaticParams for dynamic routes.
// We use '_' as a placeholder slug — at runtime, Cloudflare Pages
// _redirects will rewrite any /:orgSlug/* to the matching static page.
export function generateStaticParams() {
  return [{ orgSlug: '_' }];
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
