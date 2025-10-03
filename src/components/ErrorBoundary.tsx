import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error } as State;
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('UI error boundary caught:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="text-center text-gray-700">
            <div className="font-semibold mb-2">Произошла ошибка при загрузке раздела</div>
            <div className="text-sm text-gray-500 mb-3">Попробуйте еще раз или обновите страницу</div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={this.handleRetry} className="px-3 py-1.5 text-sm rounded-md border border-gray-300">Повторить</button>
              <button onClick={this.handleReload} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white">Обновить</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;


