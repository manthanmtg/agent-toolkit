import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import {
  LayoutDashboard,
  Puzzle,
  PlusCircle,
  FolderOpen,
  Layers,
  Stethoscope,
  Plug,
  Settings,
  Zap,
} from "lucide-react";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Toolkit",
  description: "Universal infrastructure for AI coding agents",
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/skills", label: "Skills", icon: Puzzle },
  { href: "/add-skill", label: "Add Skill", icon: PlusCircle },
  { href: "/profiles", label: "Profiles", icon: Layers },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/doctor", label: "Doctor", icon: Stethoscope },
  { href: "/mcp", label: "MCP", icon: Plug },
  { href: "/install", label: "Install", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
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
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground">v0.1.0</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-8">{children}</div>
          </main>
        </div>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
