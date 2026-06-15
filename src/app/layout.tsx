import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";

const DEFAULT_NAME = "Medisync";
const DEFAULT_DESC = "Modern Pharmacy Management System";

async function getPlatformBranding() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;

    const res = await fetch(`${url}/rest/v1/platform_settings?select=app_name,tagline,favicon_url&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  return {
    title: branding?.app_name || DEFAULT_NAME,
    description: branding?.tagline || DEFAULT_DESC,
    manifest: "/manifest.json",
    icons: branding?.favicon_url ? { icon: branding.favicon_url } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
