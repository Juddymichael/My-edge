import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Trading Edge:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReturnDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0D0E15] text-stone-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#181A25] border border-rose-500/30 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <AlertTriangle className="w-8 h-8 stroke-[2]" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Une erreur est survenue</h2>
              <p className="text-xs font-medium text-stone-400 mt-2 leading-relaxed">
                Un composant de l'application a rencontré une anomalie inattendue. Vous pouvez tenter de réessayer ou retourner au tableau de bord.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-[#0D0E15] p-3.5 rounded-xl border border-[#282A3A] overflow-x-auto max-h-32">
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 block mb-1">Détail technique</span>
                <p className="text-xs font-mono text-rose-300">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="py-3 px-4 bg-[#242738] hover:bg-[#2F3248] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#3A3D56]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Réessayer</span>
              </button>

              <button
                onClick={this.handleReturnDashboard}
                className="py-3 px-4 bg-gradient-to-r from-[#FF6A00] to-[#FF4D2E] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#FF6A00]/20 hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/10"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

