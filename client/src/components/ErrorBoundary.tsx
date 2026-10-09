import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('Unhandled React ErrorBoundary caught an exception:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#191A1A] text-[#EDEDED] flex flex-col items-center justify-center p-6 selection:bg-[#20B2AA] selection:text-black">
          <div className="w-full max-w-lg bg-[#141515] border border-[#2C2E2E] rounded-2xl p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Glow Icon */}
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-6 shadow-lg shadow-rose-500/10">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[#9EA3A3] mb-6 max-w-sm">
              An unexpected render error occurred in Whhispr. Your messages and account remain safe and intact.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black font-semibold text-xs transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Whhispr</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#202222] hover:bg-[#262828] text-[#EDEDED] font-semibold text-xs border border-[#2D3030] transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>

            {/* Collapsible Error Trace */}
            {this.state.error && (
              <div className="w-full border-t border-[#2C2E2E] pt-4 text-left">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="flex items-center justify-between w-full text-xs font-semibold text-[#9EA3A3] hover:text-[#EDEDED] py-1 transition cursor-pointer"
                >
                  <span>Technical details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#191A1A] border border-[#2C2E2E] text-left font-mono text-[11px] text-rose-400 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    <p className="font-bold mb-1">{this.state.error.toString()}</p>
                    {this.state.errorInfo?.componentStack && (
                      <p className="text-[#737878] mt-2">{this.state.errorInfo.componentStack}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
