import type { RulesetApiType } from './rulesets'

export type ValidatedDocumentDto = {
  slug: string
  specificationType: RulesetApiType
  documentName: string // E.g. Public API.yaml
}

export type ValidatedDocument = ValidatedDocumentDto
