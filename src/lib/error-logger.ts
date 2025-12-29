/**
 * Centralized error logging utility for the application.
 * In a real production app, this would send logs to a service like Sentry or LogRocket.
 */

type ErrorContext = {
    componentName?: string;
    route?: string;
    userId?: string;
    extra?: Record<string, any>;
};

class ErrorLogger {
    private static instance: ErrorLogger;
    private isDevelopment = process.env.NODE_ENV === "development";

    private constructor() { }

    public static getInstance(): ErrorLogger {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }

    /**
     * Log an error with context
     */
    public log(error: Error | unknown, context: ErrorContext = {}) {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stackTrace = error instanceof Error ? error.stack : undefined;

        const logEntry = {
            timestamp,
            level: "ERROR",
            message: errorMessage,
            context,
            stack: stackTrace,
        };

        if (this.isDevelopment) {
            console.group(`🔴 Error [${context.componentName || "Unknown Component"}]`);
            console.error("Message:", errorMessage);
            console.error("Context:", context);
            if (stackTrace) {
                console.error("Stack:", stackTrace);
            }
            console.groupEnd();
        } else {
            // In production, we would send this to an external service
            // fetch('/api/logs/error', { method: 'POST', body: JSON.stringify(logEntry) }).catch(() => {});
            console.error(`[${timestamp}] ERROR:`, errorMessage, context);
        }
    }

    /**
     * Log a warning with context
     */
    public warn(message: string, context: ErrorContext = {}) {
        if (this.isDevelopment) {
            console.warn(`[WARN] ${message}`, context);
        }
    }

    /**
     * Log info with context
     */
    public info(message: string, context: ErrorContext = {}) {
        if (this.isDevelopment) {
            console.info(`[INFO] ${message}`, context);
        }
    }
}

export const logger = ErrorLogger.getInstance();
