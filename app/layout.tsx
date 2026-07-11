import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav";
import { MobileNav } from "@/components/mobile-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaRegister } from "@/components/pwa-register";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "HSH ProjectOS",
  description:
    "Construction project operating system — projects, procurement, site progress, claims and profitability in one place.",
  applicationName: "HSH ProjectOS",
  appleWebApp: {
    capable: true,
    title: "HSH ProjectOS",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();

  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <PwaRegister />
        <OfflineBanner />
        {profile ? (
          <>
            <Sidebar
              role={profile.role}
              fullName={profile.fullName}
              email={profile.email}
            />
            <MobileNav
              role={profile.role}
              fullName={profile.fullName}
              email={profile.email}
            />
            <main className="lg:ml-60 min-h-screen pt-14 lg:pt-0 pb-24 lg:pb-0">
              <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
                {children}
              </div>
            </main>
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
