"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Puzzle,
  MonitorSmartphone,
  PlusCircle,
  FolderOpen,
  Layers,
  Stethoscope,
  Plug,
  Settings,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/skills", label: "Skills", icon: Puzzle },
  { href: "/my-skills", label: "My Skills", icon: MonitorSmartphone },
  { href: "/add-skill", label: "Add Skill", icon: PlusCircle },
  { href: "/profiles", label: "Profiles", icon: Layers },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/doctor", label: "Doctor", icon: Stethoscope },
  { href: "/mcp", label: "MCP", icon: Plug },
  { href: "/install", label: "Install", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-4 space-y-1" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon
              className={`w-4 h-4 ${isActive ? "text-primary" : ""}`}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
