import type { RulesetMetadataDto, RulesetMetadata } from './rulesets'
import type { IssueDto, Issue } from './issues'
import type { ValidatedDocumentDto, ValidatedDocument } from './validated-documents'

export type ValidationDetailsDto = {
  ruleset: RulesetMetadataDto
  issues: readonly IssueDto[]
  document: ValidatedDocumentDto
}

export type ValidationDetails = {
  ruleset: RulesetMetadata
  issues: readonly Issue[]
  document: ValidatedDocument
}
