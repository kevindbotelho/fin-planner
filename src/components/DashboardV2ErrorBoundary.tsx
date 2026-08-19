import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardV2ErrorBoundaryProps {
  children: ReactNode;
}

interface DashboardV2ErrorBoundaryState {
  hasError: boolean;
}

export class DashboardV2ErrorBoundary extends Component<
  DashboardV2ErrorBoundaryProps,
  DashboardV2ErrorBoundaryState
> {
  state: DashboardV2ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DashboardV2ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard 2.0 failed to render', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="liquid-glass liquid-glass-bevel mx-auto max-w-2xl rounded-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-manrope text-xl font-bold">Não foi possível abrir o Dashboard 2.0</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Seus dados não foram alterados. Você pode continuar usando o dashboard atual enquanto verificamos esta visualização.
        </p>
        <Button asChild className="mt-6 rounded-xl">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Abrir dashboard atual
          </Link>
        </Button>
      </section>
    );
  }
}
