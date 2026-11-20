import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { ModuleFetchingErrorPopup } from './ModuleFetchingErrorDialog'

type Props = {
  children: ReactNode
  showReloadPopup?: boolean
}

type State = {
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ModuleFetchingErrorBoundary extends Component<Props, State> {

  state: State = {
    error: null,
    errorInfo: null,
  }

  constructor(props: Props) {
    super(props)
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    })
  }

  render(): ReactNode {
    if (isFailedFetchDynamicImport(this.state) || this.props.showReloadPopup) {
      return <ModuleFetchingErrorPopup />
    }

    return this.props.children
  }

}

function isFailedFetchDynamicImport(errorBoundaryState: State): boolean {
  const { error } = errorBoundaryState
  return (
    !!error &&
    error instanceof TypeError &&
    error.message.startsWith('Failed to fetch dynamically imported module')
  )
}
