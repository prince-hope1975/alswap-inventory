"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "~/lib/error-logger";
import { AlertCircle, RefreshCcw, Home, ChevronLeft } from "lucide-react";
import { cn } from "~/lib/utils";

interface Props {
    children: ReactNode;
    fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
    componentName?: string;
    onReset?: () => void;
    className?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Base Error Boundary component that catches runtime errors in its child component tree.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.log(error, {
            componentName: this.props.componentName || "ErrorBoundary",
            extra: { errorInfo },
        });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    private handleGoHome = () => {
        window.location.href = "/";
    };

    private handleGoBack = () => {
        window.history.back();
    };

    public render() {
        if (this.state.hasError && this.state.error) {
            if (typeof this.props.fallback === "function") {
                return this.props.fallback({
                    error: this.state.error,
                    resetErrorBoundary: this.handleReset,
                });
            }

            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    className={cn(
                        "flex min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/30 p-8 text-center dark:border-red-900/20 dark:bg-red-900/5",
                        this.props.className
                    )}
                >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle className="h-8 w-8" />
                    </div>

                    <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                        Something went wrong
                    </h2>

                    <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
                        We encountered an error while rendering this component. Our team has been notified.
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <span className="mt-4 block rounded bg-gray-100 p-2 text-left font-mono text-xs text-red-600 dark:bg-gray-800">
                                {this.state.error.message}
                            </span>
                        )}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:scale-105 active:scale-95"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Try Again
                        </button>

                        <button
                            onClick={this.handleGoBack}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Go Back
                        </button>

                        <button
                            onClick={this.handleGoHome}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <Home className="h-4 w-4" />
                            Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
