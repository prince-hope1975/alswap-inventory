"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "~/hooks/use-theme";

export function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme();

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <button
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="Toggle theme"
            >
                <Sun className="h-4 w-4" />
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
            {theme === "light" ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
        </button>
    );
}

