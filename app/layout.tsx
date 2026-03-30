import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Zap } from "lucide-react";
import { Toaster } from "sonner";
import { SidebarNav } from "./sidebar-nav";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Toolkit",
  description: "Universal infrastructure for AI coding agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 border-r border-border bg-card flex flex-col">
            <div className="p-6 border-b border-border">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg">Agent Toolkit</span>
              </Link>
            </div>
            <SidebarNav />
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">v0.1.0</p>
              <ThemeToggle />
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-8">{children}</div>
          </main>
        </div>
        <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
