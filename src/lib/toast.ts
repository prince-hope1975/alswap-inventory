/**
 * Simple toast notification utility
 * Can be replaced with react-hot-toast or sonner later
 */

type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
    duration?: number;
    position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
}

class ToastManager {
    private container: HTMLDivElement | null = null;

    private ensureContainer() {
        if (typeof window === "undefined") return null;

        if (!this.container) {
            this.container = document.createElement("div");
            this.container.id = "toast-container";
            // Announce toasts to screen readers without stealing focus.
            this.container.setAttribute("role", "status");
            this.container.setAttribute("aria-live", "polite");
            this.container.setAttribute("aria-atomic", "false");
            // Placement lives in the stylesheet below: bottom-centre, so a
            // toast never covers the navbar cart button or a drawer header,
            // and on phones it clears the storefront bottom bar.
            this.container.className = "app-toast-container";
            document.body.appendChild(this.container);
        }
        return this.container;
    }

    private show(message: string, type: ToastType, options: ToastOptions = {}) {
        const container = this.ensureContainer();
        if (!container) return;

        const toast = document.createElement("div");
        toast.style.cssText = `
            padding: 0.875rem 1.25rem;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25);
            max-width: min(24rem, calc(100vw - 2rem));
            pointer-events: auto;
            animation: toastIn 0.25s ease-out;
            font-size: 0.875rem;
            font-weight: 500;
            ${this.getTypeStyles(type)}
        `;
        toast.textContent = message;

        container.appendChild(toast);

        const duration = options.duration ?? 4000;
        setTimeout(() => {
            toast.style.animation = "toastOut 0.25s ease-in forwards";
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    private getTypeStyles(type: ToastType): string {
        const styles = {
            success: "background-color: #047857; color: white;",
            error: "background-color: #b91c1c; color: white;",
            warning: "background-color: #b45309; color: white;",
            info: "background-color: #1d4ed8; color: white;",
        };
        return styles[type];
    }

    success(message: string, options?: ToastOptions) {
        this.show(message, "success", options);
    }

    error(message: string, options?: ToastOptions) {
        this.show(message, "error", options);
    }

    warning(message: string, options?: ToastOptions) {
        this.show(message, "warning", options);
    }

    info(message: string, options?: ToastOptions) {
        this.show(message, "info", options);
    }
}

// Placement + animations
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        .app-toast-container {
            position: fixed;
            left: 50%;
            transform: translateX(-50%);
            bottom: calc(5.5rem + env(safe-area-inset-bottom));
            z-index: 9999;
            display: flex;
            flex-direction: column-reverse;
            align-items: center;
            gap: 0.5rem;
            pointer-events: none;
            width: max-content;
            max-width: calc(100vw - 2rem);
        }
        @media (min-width: 1024px) {
            .app-toast-container { bottom: 1.5rem; }
        }
        @keyframes toastIn {
            from { transform: translateY(1rem); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes toastOut {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(1rem); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
            .app-toast-container > * { animation: none !important; }
        }
    `;
    document.head.appendChild(style);
}

export const toast = new ToastManager();
