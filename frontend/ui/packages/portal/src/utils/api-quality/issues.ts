import { IssueSeverities } from '@apihub/entities/api-quality/issue-severities'
import type { Issue } from '@apihub/entities/api-quality/issues'
import type { Linter } from '@apihub/entities/api-quality/linters'
import type { OriginalDocumentFileFormat } from '@apihub/routes/root/PortalPage/VersionPage/VersionApiQualitySubPage/types'
import { findLocationByPath, parseWithPointers } from '@netcracker/qubership-apihub-ui-shared/utils/specifications.v2'
import { type editor as Editor, MarkerSeverity } from 'monaco-editor'
import { getLinterName } from './linters'

export function transformIssuesToMarkers(
  content: string,
  format: OriginalDocumentFileFormat,
  issues: readonly Issue[],
  linters: readonly Linter[],
): Editor.IMarkerData[] {
  const parsedContent = parseWithPointers(content, format)
  return issues
    .map(issue => {
      const { path } = issue
      // TODO 19.09.25 // Remove default because real response doesn't match API
      const location = findLocationByPath(parsedContent, path ?? [], format)
      const linterName = getLinterName(issue.linter, linters)
      const source = `${linterName} (${issue.code})`
      let severity: MarkerSeverity
      switch (issue.severity) {
        case IssueSeverities.ERROR:
          severity = MarkerSeverity.Error
          break
        case IssueSeverities.WARNING:
          severity = MarkerSeverity.Warning
          break
        case IssueSeverities.INFO:
          severity = MarkerSeverity.Info
          break
        case IssueSeverities.HINT:
          severity = MarkerSeverity.Hint
          break
      }
      if (!location) {
        return {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: issue.message,
          severity: severity,
          source: source,
        }
      }
      return {
        startLineNumber: location.range.start.line + 1,
        startColumn: location.range.start.character,
        endLineNumber: location.range.end.line + 1,
        endColumn: location.range.end.character,
        message: issue.message,
        severity: severity,
        source: source,
      }
    })
}
