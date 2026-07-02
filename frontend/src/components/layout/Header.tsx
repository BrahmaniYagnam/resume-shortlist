"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative rounded-xl p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute inset-0 m-auto h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
        {user && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2 dark:bg-gray-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
              {(user.name || user.email)[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name || "Student"}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
