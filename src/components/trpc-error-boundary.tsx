"use client";

import React from "react";
import { ErrorBoundary } from "./error-boundary";
import { WifiOff, AlertCircle, RefreshCcw } from "lucide-react";

interface TrpcErrorBoundaryProps {
    children: React.ReactNode;
}

/**
 * Specialized Error Boundary for TRPC/Network errors.
 * Detects if the error is likely a network error and shows appropriate UI.
 */
export function TrpcErrorBoundary({ children }: TrpcErrorBoundaryProps) {
    return (
        <ErrorBoundary
            componentName="TrpcQuery"
            fallback={({ error, resetErrorBoundary }: any) => {
                const isNetworkError =
                    error?.message?.toLowerCase().includes("fetch") ||
                    error?.message?.toLowerCase().includes("network") ||
                    !window.navigator.onLine;

                return (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            {isNetworkError ? <WifiOff className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                        </div>

                        <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                            {isNetworkError ? "Connection Issue" : "Data Error"}
                        </h3>

                        <p className="mb-6 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                            {isNetworkError
                                ? "We're having trouble reaching the server. Please check your internet connection."
                                : "Something went wrong while fetching data. Our team has been notified."}
                        </p>

                        <button
                            onClick={resetErrorBoundary}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Try Again
                        </button>
                    </div>
                );
            }}
        >
            {children}
        </ErrorBoundary>
    );
}
