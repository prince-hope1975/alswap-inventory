/**
 * Inline script to prevent flash of wrong theme
 * Must be placed in <head> before any content renders
 */
export function ThemeScript() {
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `
                (function() {
                    try {
                        const theme = localStorage.getItem('theme');
                        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        const shouldBeDark = theme === 'dark' || (!theme && systemPrefersDark);
                        
                        if (shouldBeDark) {
                            document.documentElement.classList.add('dark');
                        } else {
                            document.documentElement.classList.remove('dark');
                        }
                    } catch (e) {
                        // Ignore errors
                    }
                })();
                `,
            }}
        />
    );
}

