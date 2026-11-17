import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let parsedDetails: Record<string, unknown> | null = null;
      try {
        parsedDetails = JSON.parse(this.state.errorMessage);
      } catch {
        parsedDetails = null;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Security or Data Operation Alert
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              The operation was stopped by security validation rules or a network constraint.
            </p>
            {parsedDetails ? (
              <pre className="text-xs font-mono bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-3 rounded-lg overflow-x-auto mb-4">
                {JSON.stringify(parsedDetails, null, 2)}
              </pre>
            ) : (
              <p className="text-xs font-mono bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-3 rounded-lg mb-4">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
