"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
    const [theme, setTheme] = useState<Theme>("system");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check localStorage first
        const stored = localStorage.getItem("theme") as Theme | null;
        if (stored) {
            setTheme(stored);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const applyTheme = () => {
            const systemPrefersDark = mediaQuery.matches;
            
            if (theme === "dark") {
                root.classList.add("dark");
            } else if (theme === "light") {
                root.classList.remove("dark");
            } else {
                // System
                if (systemPrefersDark) {
                    root.classList.add("dark");
                } else {
                    root.classList.remove("dark");
                }
            }
        };

        applyTheme();

        const handleChange = () => {
            if (theme === "system") {
                applyTheme();
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    const setThemeValue = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
    };

    return {
        theme,
        setTheme: setThemeValue,
        mounted,
    };
}
