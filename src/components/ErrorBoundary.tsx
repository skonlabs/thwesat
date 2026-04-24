import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  referenceId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, referenceId: null };

  static getDerivedStateFromError(): State {
    const referenceId = Math.random().toString(36).slice(2, 10).toUpperCase();
    return { hasError: true, referenceId };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please reload the page and try again.
          </p>
          {this.state.referenceId && (
            <p className="text-xs text-muted-foreground">
              Error reference: {this.state.referenceId}. If this keeps happening, contact support with this code.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground active:bg-primary/90"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
