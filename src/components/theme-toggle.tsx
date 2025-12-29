"use client";

import { Moon, Sun, Monitor, Laptop } from "lucide-react";
import { useTheme } from "~/hooks/use-theme";
import { useState, useRef, useEffect } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
    const { theme, setTheme, mounted } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <div className={`h-9 w-9 rounded-lg border border-gray-200 bg-white/5 dark:border-white/10 ${className}`} />
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/5 text-gray-500 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/10 ${className}`}
                aria-label="Toggle theme"
            >
                {theme === "light" && <Sun className="h-4 w-4" />}
                {theme === "dark" && <Moon className="h-4 w-4" />}
                {theme === "system" && <Laptop className="h-4 w-4" />}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 origin-top-right rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                    <button
                        onClick={() => {
                            setTheme("light");
                            setIsOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                            theme === "light"
                                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
                        }`}
                    >
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                    </button>
                    <button
                        onClick={() => {
                            setTheme("dark");
                            setIsOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                            theme === "dark"
                                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
                        }`}
                    >
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                    </button>
                    <button
                        onClick={() => {
                            setTheme("system");
                            setIsOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                            theme === "system"
                                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
                        }`}
                    >
                        <Laptop className="h-4 w-4" />
                        <span>System</span>
                    </button>
                </div>
            )}
        </div>
    );
}
