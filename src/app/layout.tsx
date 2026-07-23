import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CustomDomainResolver } from "@/components/custom-domain-resolver";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusFlow",
  description: "CampusFlow — Plateforme SaaS de gestion scolaire. Cursus, notes, paiements et marketplace.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-campusflow.png",
    apple: "/logo-campusflow.png",
  },
  openGraph: {
    title: "CampusFlow",
    description: "Plateforme SaaS de gestion scolaire & universitaire.",
    images: ["/logo-campusflow.png"],
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CampusFlow",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0E14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-campusflow.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-campusflow.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CampusFlow" />
        <meta name="msapplication-TileImage" content="/logo-campusflow.png" />
        <meta name="msapplication-TileColor" content="#0B0E14" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-[#0B0E14] text-white`}>
        <CustomDomainResolver />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
