import type { IssueSeverity } from './issue-severities'
import type { RulesetMetadataDto } from './rulesets'
import type { LinterApiType } from './linter-api-types'
import type { ValidationStatus } from './validation-statuses'

export type IssuesSummary = Record<IssueSeverity, number>

// DTO

export type DocumentValidationSummaryDto = {
  slug: string
  documentName: string
  apiType: LinterApiType
  rulesetId?: RulesetMetadataDto['id']
  issuesSummary?: IssuesSummary
  status: ValidationStatus
  // TODO 05.09.25 // Change it
  details?: Record<PropertyKey, unknown>
}

export type ValidationSummaryDto = {
  status: ValidationStatus
  rulesets: RulesetMetadataDto[]
  documents: DocumentValidationSummaryDto[]
}

// UI

export type DocumentValidationSummary = DocumentValidationSummaryDto

export type ValidationSummary = ValidationSummaryDto
