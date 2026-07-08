import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "HSH ProjectOS",
  description:
    "Construction project operating system — projects, procurement, site progress, claims and profitability in one place.",
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
        {profile ? (
          <>
            <Sidebar
              role={profile.role}
              fullName={profile.fullName}
              email={profile.email}
            />
            <main className="ml-60 min-h-screen">
              <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
            </main>
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
