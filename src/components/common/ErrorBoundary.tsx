import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Robust React Error Boundary preventing white-screen crashes.
 * Displays an authoritative recovery UI with retry and return-to-dashboard capabilities.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Physenra ErrorBoundary] Uncaught render exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              {this.props.fallbackTitle || 'Unable to display content'}
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              {this.props.fallbackMessage ||
                'An unexpected error occurred while rendering this view. Your records remain safe. You can try again or return to the dashboard.'}
            </p>
            {this.state.error?.message && (
              <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-left">
                <p className="text-xs font-mono text-slate-600 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition"
              >
                <RefreshCw size={16} />
                <span>Try Again</span>
              </button>
              <Link
                to="/app/dashboard"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
              >
                <Home size={16} />
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
