'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-rose-500/30 text-zinc-100 flex flex-col items-center justify-center text-center space-y-4 my-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-zinc-100">
              {this.props.fallbackTitle || 'Operational View Temporarily Unavailable'}
            </h3>
            <p className="text-xs text-zinc-400">
              An unexpected render error occurred. Your fleet state is preserved in local cache.
            </p>
          </div>
          {this.state.error?.message && (
            <p className="text-[11px] font-mono text-rose-400 bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-900/50 max-w-full truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Module</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
