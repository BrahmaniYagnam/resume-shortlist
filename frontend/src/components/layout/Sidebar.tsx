"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileSearch, FilePlus, Briefcase, Mic,
  Code2 as GitHubIcon, Target, ClipboardList, User, Shield, LogOut,
  ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resume-analyzer", label: "Resume Analyzer", icon: FileSearch },
  { href: "/resume-builder", label: "Resume Builder", icon: FilePlus },
  { href: "/job-matcher", label: "Job Matcher", icon: Briefcase },
  { href: "/interview", label: "Interview Prep", icon: Sparkles },
  { href: "/voice-coach", label: "Voice Coach", icon: Mic },
  { href: "/github", label: "GitHub Analyzer", icon: GitHubIcon },
  { href: "/skills", label: "Skill Gap", icon: Target },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200/80 bg-white transition-all dark:border-gray-800 dark:bg-gray-950",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      <div className="flex h-16 items-center gap-2 border-b border-gray-200/80 px-4 dark:border-gray-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Career Copilot</p>
            <p className="text-[10px] text-gray-500">AI Placement Assistant</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/admin"
                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900"
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admin Panel</span>}
          </Link>
        )}
      </nav>

      <div className="border-t border-gray-200/80 p-3 dark:border-gray-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-2 flex w-full items-center justify-center rounded-xl p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
