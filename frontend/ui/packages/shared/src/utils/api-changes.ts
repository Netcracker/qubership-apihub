import type { OperationChange, OperationChanges } from '../entities/operation-changelog'
import type {
  ChangeSeverity,
} from '../entities/change-severities'
import {
  ANNOTATION_CHANGE_SEVERITY,
  BREAKING_CHANGE_SEVERITY,
  DEPRECATED_CHANGE_SEVERITY, NON_BREAKING_CHANGE_SEVERITY,
  RISKY_CHANGE_SEVERITY, UNCLASSIFIED_CHANGE_SEVERITY,
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

export const severityOrder: Record<ChangeSeverity, number> = {
  [BREAKING_CHANGE_SEVERITY]: 1,
  [RISKY_CHANGE_SEVERITY]: 2,
  [DEPRECATED_CHANGE_SEVERITY]: 3,
  [NON_BREAKING_CHANGE_SEVERITY]: 4,
  [ANNOTATION_CHANGE_SEVERITY]: 5,
  [UNCLASSIFIED_CHANGE_SEVERITY]: 6,
}
