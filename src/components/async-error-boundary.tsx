"use client";

import React, { Suspense } from "react";
import { ErrorBoundary } from "./error-boundary";
import { ComponentErrorFallback } from "./route-error-boundary";

interface AsyncErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    loadingFallback?: React.ReactNode;
    componentName?: string;
}

/**
 * Combines ErrorBoundary and Suspense for handling async components and TRPC queries.
 */
export function AsyncErrorBoundary({
    children,
    fallback,
    loadingFallback,
    componentName = "AsyncComponent",
}: AsyncErrorBoundaryProps) {
    return (
        <ErrorBoundary
            componentName={componentName}
            fallback={fallback || <ComponentErrorFallback title="Async Error" message="Failed to load async data" />}
        >
            <Suspense fallback={loadingFallback || <DefaultLoadingState />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}

function DefaultLoadingState() {
    return (
        <div className="flex h-full min-h-[100px] w-full items-center justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--brand-primary-600)]" />
        </div>
    );
}
