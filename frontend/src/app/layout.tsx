import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "JKT48 Tracker",
  description: "Track JKT48 members, schedules, and more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen bg-background antialiased">
        <div className="bg-red-500/10 border-b border-red-500/40 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
          Data is still being compiled — some historical shows and member records may be incomplete.
        </div>
        <AppHeader />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
