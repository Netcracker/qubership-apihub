import { FileId, KeyOfConstType, OperationId } from '../external'
import { McpEntityId } from '../package'
import { OperationClaim } from './operation'
import { ApihubApiCompatibilityKind, FILE_FORMAT } from '../../consts'

export interface VersionDocuments {
  documents: VersionDocument[]
}

export interface ExportDocument {
  data: Blob
  filename: string
}

export interface ZippableDocument<T = any> {
  fileId: FileId
  type: string
  data: T
  description: string
  source?: Blob

  filename: string
  publish?: boolean
}

export interface VersionInternalDocument {
  versionDocumentId: string
  serializedVersionDocument?: string
}

export interface VersionDocument<T = any> extends ZippableDocument<T> {
  format: FileFormat
  slug: string
  title: string
  description: string
  version?: string
  filename: string
  dependencies: string[]
  operationIds: OperationId[]
  /**
   * Every operation this document derived, winner or not. `reconcileOwnedIds` shrinks `operationIds`; this list
   * stays whole and is what `reportOperationCollisionsOf` grades collisions from.
   */
  operationClaims?: OperationClaim[]
  /** Every MCP entity this document derived, winner or not — the `operationClaims` twin. */
  mcpEntityClaims?: McpEntityId[]
  //TODO: split typing, document can't have both operationIds and mcpEntityIds
  mcpEntityIds?: McpEntityId[]
  metadata: Record<string, unknown>
  errors?: number
  /*
  {
    labels?: string[]
    commitId?: string
    repositoryUrl?: string
    // other properties
  }
  */
  publish?: boolean
  source?: Blob
  apiKind?: ApihubApiCompatibilityKind
  versionInternalDocument: VersionInternalDocument
}

export type FileFormat = KeyOfConstType<typeof FILE_FORMAT>
