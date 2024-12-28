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

import type { OperationChange, OperationChanges } from '../entities/operation-changelog'
import type {
  ChangeSeverity,
} from '../entities/change-severities'
import {
  ANNOTATION_CHANGE_SEVERITY,
  BREAKING_CHANGE_SEVERITY,
  DEPRECATED_CHANGE_SEVERITY, NON_BREAKING_CHANGE_SEVERITY,
  SEMI_BREAKING_CHANGE_SEVERITY, UNCLASSIFIED_CHANGE_SEVERITY,
} from '../entities/change-severities'

function getFirstValidPath(change: OperationChange): string[] {
  const validPath = (change.currentDeclarationJsonPaths || change.previousDeclarationJsonPaths || [])
    .find(path => path?.length > 0)
  return validPath?.map(String) || []
}

function comparePaths(path1: string[], path2: string[]): number {
  const len = Math.max(path1.length, path2.length)
  for (let i = 0; i < len; i++) {
    const element1 = path1[i] || ''
    const element2 = path2[i] || ''
    if (element1 !== element2) {
      return element1 < element2 ? -1 : 1
    }
  }
  return 0
}

export function sortChanges(changes: OperationChanges): OperationChange[] {
  return [...changes].sort((a, b) => {

    const severityA = severityOrder[a.severity]
    const severityB = severityOrder[b.severity]
    if (severityA !== severityB) return severityA - severityB

    const pathA = getFirstValidPath(a)
    const pathB = getFirstValidPath(b)
    const pathComparison = comparePaths(pathA, pathB)
    if (pathComparison !== 0) return pathComparison

    return a.description.localeCompare(b.description)
  })
}

const severityOrder: Record<ChangeSeverity, number> = {
  [BREAKING_CHANGE_SEVERITY]: 1,
  [SEMI_BREAKING_CHANGE_SEVERITY]: 2,
  [DEPRECATED_CHANGE_SEVERITY]: 3,
  [NON_BREAKING_CHANGE_SEVERITY]: 4,
  [ANNOTATION_CHANGE_SEVERITY]: 5,
  [UNCLASSIFIED_CHANGE_SEVERITY]: 6,
}
