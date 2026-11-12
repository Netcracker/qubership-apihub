import { Component, ErrorInfo, PropsWithChildren, ReactNode } from 'react'

export type ErrorBoundaryCaughtError = {
  error: unknown
  /**
   * React component stack; `undefined` until `componentDidCatch` has run (the fallback is first
   * rendered from `getDerivedStateFromError`, which has no access to it).
   */
  componentStack: string | undefined
}

type ErrorBoundaryProps = {
  /**
   * Static node, or a render function receiving the real caught error. With a render function
   * the fallback owns error reporting and the boundary does not log on its own.
   */
  fallback?: ReactNode | ((caught: ErrorBoundaryCaughtError) => ReactNode)
} & PropsWithChildren

type ErrorBoundaryState = {
  hasError: boolean
  error: unknown
  componentStack: string | undefined
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {hasError: false, error: undefined, componentStack: undefined};
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return {hasError: true, error};
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Example "componentStack":
    //   in ComponentThatThrows (created by App)
    //   in ErrorBoundary (created by App)
    //   in div (created by App)
    //   in App
    this.setState({componentStack: info.componentStack ?? ''})
    if (typeof this.props.fallback === 'function') {
      return
    }
    console.debug('operation-viewer:failed')
    console.error('[ERROR]', error)
    console.error('Stacktrace: ', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const {fallback} = this.props
      if (typeof fallback === 'function') {
        return fallback({error: this.state.error, componentStack: this.state.componentStack})
      }
      // You can render any custom fallback UI
      return fallback;
    }

    return this.props.children;
  }
}