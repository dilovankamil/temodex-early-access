import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SI-053 model runtime error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="runtime-error-shell" role="alert">
          <div className="panel runtime-error-card">
            <span className="section-kicker">Application recovery</span>
            <h1>SI-053 Strategic Model</h1>
            <p>The interactive model could not start correctly in this browser.</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              Reload model
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
