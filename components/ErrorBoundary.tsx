import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isQuotaError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isQuotaError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorMsg = error.message.toLowerCase();
    const isQuota = errorMsg.includes('quota') || 
                    errorMsg.includes('limit exceeded') || 
                    errorMsg.includes('quota_exceeded');
    return { 
      hasError: true, 
      error,
      isQuotaError: isQuota
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, isQuotaError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {this.state.isQuotaError ? 'Daily Limit Reached' : 'Something went wrong'}
            </h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              {this.state.isQuotaError 
                ? "We've reached our daily free limit for news updates. The quota will reset automatically tomorrow. You can still browse cached content or check back later."
                : "An unexpected error occurred while loading the news. Please try refreshing the page."}
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleReset}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <RefreshCw size={18} /> Refresh Page
              </button>
              
              <a 
                href="/"
                className="w-full bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Home size={18} /> Back to Home
              </a>
            </div>

            {this.state.isQuotaError && (
              <p className="mt-6 text-xs text-gray-400">
                Detailed quota information can be found in the Firebase pricing documentation.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
