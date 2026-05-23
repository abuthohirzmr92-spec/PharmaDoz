"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * Route-level error boundary for tenant pages.
 *
 * Catches unhandled render exceptions and shows a diagnostic panel
 * with the error message + stack trace instead of the Next.js
 * "This page couldn't load" crash screen.
 *
 * Designed to be placed in the tenant shell so ALL tenant routes
 * are protected by a single boundary.
 */
export class TenantPageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[TENANT-ROUTE-CRASH]", {
      message: error.message,
      name: error.name,
      componentStack: errorInfo.componentStack?.split("\n").slice(0, 5).join("\n"),
      stack: error.stack?.split("\n").slice(0, 8).join("\n"),
    });
    this.setState({ errorInfo: errorInfo.componentStack ?? null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      );
    }

    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Fallback UI                                                        */
/* ------------------------------------------------------------------ */

function ErrorFallbackUI({
  error,
  errorInfo,
  onRetry,
}: {
  error: Error | null;
  errorInfo: string | null;
  onRetry: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white shadow-sm dark:border-red-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="border-b border-red-100 px-5 py-4 dark:border-red-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
                Halaman Tidak Dapat Dimuat
              </h2>
              <p className="mt-0.5 text-xs text-red-500 dark:text-red-400/80">
                Terjadi kesalahan saat memuat halaman ini. Tim teknis telah diberitahu.
              </p>
            </div>
          </div>
        </div>

        {/* Error details */}
        <div className="px-5 py-4">
          {error && (
            <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
              <p className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300">
                {error.name}: {error.message}
              </p>

              {/* Expandable stack trace */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Detail Teknis
              </button>

              {showDetails && (
                <div className="mt-2 space-y-2">
                  {error.stack && (
                    <pre className="max-h-48 overflow-auto rounded bg-neutral-100 p-2 text-[10px] text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 whitespace-pre-wrap break-all">
                      {error.stack}
                    </pre>
                  )}
                  {errorInfo && (
                    <details className="text-[10px] text-neutral-500">
                      <summary className="cursor-pointer">Component Stack</summary>
                      <pre className="mt-1 max-h-32 overflow-auto rounded bg-neutral-100 p-2 dark:bg-neutral-900 whitespace-pre-wrap">
                        {errorInfo}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    </div>
  );
}
