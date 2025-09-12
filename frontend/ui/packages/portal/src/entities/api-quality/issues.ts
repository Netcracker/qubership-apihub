import type { IssuePath } from './issue-paths'
import type { IssueSeverity } from './issue-severities'

export type IssueDto = {
  path: IssuePath
  severity: IssueSeverity
  message: string
  code: string
}

export type Issue = IssueDto
