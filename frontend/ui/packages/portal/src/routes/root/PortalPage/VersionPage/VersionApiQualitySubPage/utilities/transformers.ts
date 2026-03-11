import type { ValidationDetails } from '@apihub/entities/api-quality/document-validation-details'
import type { IssuePath } from '@apihub/entities/api-quality/issue-paths'
import type { Issue } from '@apihub/entities/api-quality/issues'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'
import { JSON_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/entities/file-formats'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { encodeKey } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { safeParse } from '@stoplight/json'
import { dump } from 'js-yaml'
import type { OriginalDocumentFileFormat } from '../types'
import type { RulesetMetadata } from '@apihub/entities/api-quality/rulesets'

export function issuePathToSpecItemUri(issuePath: IssuePath): SpecItemUri {
  return `/${issuePath.map(pathItem => encodeKey(`${pathItem}`)).join('/')}`
}

export function transformRawDocumentByFormat(
  value: string,
  format: OriginalDocumentFileFormat,
): string {
  value = value.trim()

  let currentFormat: OriginalDocumentFileFormat | undefined
  let parsed: unknown
  if (
    value.startsWith('{') && value.endsWith('}') ||
    value.startsWith('[') && value.endsWith(']')
  ) {
    try {
      parsed = safeParse(value)
      currentFormat = JSON_FILE_FORMAT
    } catch { /* do nothing */ }
  } else {
    try {
      parsed = loadYaml(value)
      currentFormat = YAML_FILE_FORMAT
    } catch { /* do nothing */ }
  }

  if (currentFormat === format) {
    return value
  }

  switch (format) {
    case JSON_FILE_FORMAT:
      return JSON.stringify(parsed, null, 2)
    case YAML_FILE_FORMAT:
      return dump(parsed)
    default:
      return value
  }
}

export function flatMapValidationIssues(validationDetails: ValidationDetails | undefined): Issue[] {
  return (validationDetails?.results ?? []).flatMap(result => result.issues)
}

export function sortIssuesBySeveralFields(issues: Issue[]): Issue[] {
  const severityPriority: Record<Issue['severity'], number> = {
    error: 0,
    warning: 1,
    info: 2,
    hint: 3,
  }

  return [...issues].sort((issueA, issueB) => {
    const severityDiff = severityPriority[issueA.severity] - severityPriority[issueB.severity]
    if (severityDiff !== 0) {
      return severityDiff
    }

    const linterDiff = issueA.linter.localeCompare(issueB.linter)
    if (linterDiff !== 0) {
      return linterDiff
    }

    return issueA.message.localeCompare(issueB.message)
  })
}

export function flatMapValidationRulesets(validationDetails: ValidationDetails | undefined): RulesetMetadata[] {
  return (validationDetails?.results ?? []).flatMap(result => result.ruleset)
}
