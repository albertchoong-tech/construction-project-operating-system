import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav";

export const metadata: Metadata = {
  title: "HSH ProjectOS",
  description:
    "Construction project operating system — projects, procurement, site progress, claims and profitability in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <Sidebar />
        <main className="ml-60 min-h-screen">
          <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
