/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { ModuleFetchingErrorPopup } from './ModuleFetchingErrorDialog'

type Props = {
  children: ReactNode
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
    if (isFailedFetchDynamicImport(this.state)) {
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
