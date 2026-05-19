import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apotek Manage",
  description: "Modern Pharmacy Management System",
  manifest: "/manifest.json",
};

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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
