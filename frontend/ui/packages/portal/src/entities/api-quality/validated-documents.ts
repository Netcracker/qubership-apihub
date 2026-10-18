import type { LinterApiType } from './linter-api-types'

export type ValidatedDocumentDto = {
  slug: string
  specificationType: LinterApiType
  documentName: string // E.g. Public API.yaml
}

export type ValidatedDocument = ValidatedDocumentDto
