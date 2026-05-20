"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[WidgetErrorBoundary] "${this.props.title}":`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {this.props.title}
              </p>
              <p className="mt-0.5 text-[11px] text-red-400 dark:text-red-500">
                Widget tidak tersedia
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
