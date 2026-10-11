import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Capture toute exception JS non gérée pendant le rendu d'un descendant.
 * Empêche l'écran blanc — affiche une page de fallback avec un bouton
 * « Réessayer » qui remonte au dashboard.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Erreur React capturée :', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Une erreur inattendue est survenue
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            L'application a rencontré un problème. Tu peux réessayer ou recharger la page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 overflow-auto max-h-40">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack?.split('\n').slice(0, 4).join('\n')}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Réessayer
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }
}
