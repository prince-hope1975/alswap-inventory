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
            this.container.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
        return this.container;
    }

    private show(message: string, type: ToastType, options: ToastOptions = {}) {
        const container = this.ensureContainer();
        if (!container) return;

        const toast = document.createElement("div");
        toast.style.cssText = `
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            max-width: 24rem;
            pointer-events: auto;
            animation: slideIn 0.3s ease-out;
            font-size: 0.875rem;
            font-weight: 500;
            ${this.getTypeStyles(type)}
        `;
        toast.textContent = message;

        container.appendChild(toast);

        const duration = options.duration ?? 4000;
        setTimeout(() => {
            toast.style.animation = "slideOut 0.3s ease-in";
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duration);
    }

    private getTypeStyles(type: ToastType): string {
        const styles = {
            success: "background-color: #10b981; color: white;",
            error: "background-color: #ef4444; color: white;",
            warning: "background-color: #f59e0b; color: white;",
            info: "background-color: #3b82f6; color: white;",
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

// Add CSS animations
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

export const toast = new ToastManager();
