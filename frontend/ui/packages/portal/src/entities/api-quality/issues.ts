import type { IssuePath } from './issue-paths'
import type { IssueSeverity } from './issue-severities'
import type { Linter } from './linters'

export type IssueDto = {
  path: IssuePath
  severity: IssueSeverity
  message: string
  code: string
}

export type Issue = IssueDto & {
  linter: Linter['linter']
  rulesetId: string
}
