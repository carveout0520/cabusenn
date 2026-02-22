import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: 32,
          textAlign: 'center', color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            エラーが発生しました
          </h2>
          <p style={{ fontSize: 14, marginBottom: 20, maxWidth: 400 }}>
            予期しないエラーが発生しました。ページを再読み込みしてください。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 'var(--radius-md)',
              background: 'var(--primary)', color: 'white',
              fontWeight: 600, fontSize: 14,
            }}
          >
            再読み込み
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: 20, padding: 16, background: '#fef2f2',
              borderRadius: 8, fontSize: 11, textAlign: 'left',
              maxWidth: '100%', overflow: 'auto', color: '#dc2626',
            }}>
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
