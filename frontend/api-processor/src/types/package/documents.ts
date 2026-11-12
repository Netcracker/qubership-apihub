import { FileId, OperationId } from '../external'
import { ApihubApiCompatibilityKind } from '../../consts'

export type PackageDocuments = {
  documents: PackageDocument[]
}

export interface PackageDocument {
  fileId: FileId
  filename: string

  slug: string
  type: string
  format: string

  title: string
  description: string
  version?: string

  operationIds: OperationId[]
  // true when at least one Error-severity build notification names this document's slug
  hasErrors?: boolean

  // items should be passthrough from buildConfig.files
  metadata?: Record<string, unknown>
  apiKind?: ApihubApiCompatibilityKind
}
