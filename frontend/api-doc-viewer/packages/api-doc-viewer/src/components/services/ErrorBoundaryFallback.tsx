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

import { FC, useEffect } from 'react'
import { ErrorBoundaryCaughtError } from './ErrorBoundary'

type ErrorBoundaryFallbackProps = {
  componentName: string
  /**
   * Real error caught by `ErrorBoundary` (pass the fallback as a render function). When set,
   * detailed diagnostics are printed via `console.error` (stderr under Node / Jest / Puppeteer).
   */
  caught?: ErrorBoundaryCaughtError
}

export const ErrorBoundaryFallback: FC<ErrorBoundaryFallbackProps> = (props) => {
  const { componentName, caught } = props
  const hasCaught = caught !== undefined
  const error = caught?.error
  const componentStack = caught?.componentStack

  useEffect(() => {
    // Wait for `componentDidCatch` to provide the component stack so the report is printed once.
    if (!hasCaught || componentStack === undefined) {
      return
    }
    console.error(formatCaughtErrorReport(componentName, { error, componentStack }))
  }, [componentName, hasCaught, error, componentStack])

  return (
    <div>
      Something went wrong in: {componentName}
    </div>
  )
}

function formatCaughtErrorReport(componentName: string, caught: ErrorBoundaryCaughtError): string {
  const lines = [
    `[ErrorBoundary] ${componentName} failed to render`,
    ...describeError(caught.error),
  ]
  if (caught.componentStack) {
    lines.push('Component stack:', caught.componentStack.replace(/^\n+/, ''))
  }
  return lines.join('\n')
}

function describeError(error: unknown, depth = 0): string[] {
  const prefix = depth === 0 ? '' : `Caused by (${depth}): `
  if (!(error instanceof Error)) {
    return [`${prefix}Thrown value (${typeof error}): ${stringifyThrownValue(error)}`]
  }
  const lines = [
    `${prefix}${error.name}: ${error.message}`,
    error.stack ? `Stack:\n${error.stack}` : 'Stack: <unavailable>',
  ]
  if ('cause' in error && error.cause !== undefined && depth < MAX_CAUSE_DEPTH) {
    lines.push(...describeError(error.cause, depth + 1))
  }
  return lines
}

const MAX_CAUSE_DEPTH = 5

function stringifyThrownValue(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}
