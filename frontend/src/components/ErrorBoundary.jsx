import { Component } from 'react'

/**
 * Catches render errors in children so the app doesn't crash.
 * Shows a fallback UI with option to reload.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-indigo-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-indigo-950">Something went wrong</h1>
            <p className="mt-2 text-sm text-indigo-700">
              The page ran into an error. Try refreshing.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
