import { YAML_FILE_FORMAT, JSON_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/entities/file-formats'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { encodeKey } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { safeParse } from '@stoplight/json'
import YAML from 'js-yaml'
import type { OriginalDocumentFileFormat } from '../types'
import type { IssuePath } from '@apihub/entities/api-quality/issue-paths'

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
      parsed = YAML.load(value)
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
      return YAML.dump(parsed)
    default:
      return value
  }
}
