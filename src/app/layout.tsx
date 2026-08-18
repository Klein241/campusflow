import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CustomDomainResolver } from "@/components/custom-domain-resolver";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { NotificationListener } from "@/components/notification-listener";
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
  title: "IziTeach — Enseigner simplement",
  description: "IziTeach — Plateforme SaaS de gestion d'écoles physiques et académies en ligne. Enseigner simplement.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon-192.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: "IziTeach — Enseigner simplement",
    description: "Plateforme tout-en-un pour établissements scolaires et académies en ligne.",
    images: ["/logo-campusflow.png"],
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IziTeach",
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="IziTeach" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
        <meta name="msapplication-TileColor" content="#0B0E14" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-[#0B0E14] text-white`}>
        <CustomDomainResolver />
        <PushNotificationManager />
        <NotificationListener />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

