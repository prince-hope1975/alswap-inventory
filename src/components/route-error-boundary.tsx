"use client";

import React from "react";
import { ErrorBoundary } from "./error-boundary";
import { cn } from "~/lib/utils";
import { Terminal, AlertTriangle, ShieldAlert } from "lucide-react";

interface RouteErrorBoundaryProps {
    children: React.ReactNode;
    routeName: string;
    className?: string;
}

/**
 * Specialized Error Boundary for route-level errors.
 * Provides a full-page branded error experience.
 */
export function RouteErrorBoundary({ children, routeName, className }: RouteErrorBoundaryProps) {
    return (
        <ErrorBoundary
            componentName={`Route:${routeName}`}
            className={cn("min-h-[70vh]", className)}
        >
            {children}
        </ErrorBoundary>
    );
}

interface ComponentErrorFallbackProps {
    error?: Error;
    resetErrorBoundary?: () => void;
    title?: string;
    message?: string;
}

/**
 * Minimal error fallback for small components (widgets, cards).
 */
export function ComponentErrorFallback({
    title = "Component Error",
    message = "Failed to load content",
    resetErrorBoundary
}: ComponentErrorFallbackProps) {
    return (
        <div className="flex h-full min-h-[100px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-900/50">
            <AlertTriangle className="mb-2 h-5 w-5 text-amber-500" />
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{message}</p>
            {resetErrorBoundary && (
                <button
                    onClick={resetErrorBoundary}
                    className="mt-2 text-[10px] font-medium text-[var(--brand-primary-600)] hover:underline"
                >
                    Retry
                </button>
            )}
        </div>
    );
}
