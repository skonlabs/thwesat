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

// Read lang from localStorage directly — ErrorBoundary is a class component and
// must remain usable even when React hooks/context have failed.
function getLang(): "en" | "my" {
  try {
    return (localStorage.getItem("thwesat_lang") as "en" | "my") || "en";
  } catch {
    return "en";
  }
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
      const lang = getLang();
      const my = lang === "my";
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-foreground">
            {my ? "တစ်ခုခု မှားယွင်းနေပါသည်" : "Something went wrong"}
          </p>
          <p className="text-sm text-muted-foreground">
            {my
              ? "မမျှော်လင့်သော အမှားတစ်ခု ဖြစ်ပွားပါသည်။ စာမျက်နှာကို refresh လုပ်ပြီး ထပ်စမ်းကြည့်ပါ။"
              : "An unexpected error occurred. Please reload the page and try again."}
          </p>
          {this.state.referenceId && (
            <p className="text-xs text-muted-foreground">
              {my
                ? `အမှား ကုဒ်: ${this.state.referenceId}။ ထပ်ဖြစ်ပါက ဤကုဒ်ဖြင့် support သို့ ဆက်သွယ်ပါ။`
                : `Error reference: ${this.state.referenceId}. If this keeps happening, contact support with this code.`}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground active:bg-primary/90"
          >
            {my ? "ပြန် Reload လုပ်ရန်" : "Reload page"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
