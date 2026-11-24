import { ApihubApiCompatibilityKind, ContractType } from '../../consts'
import { FileFormat } from '../internal'
import { ResolvedReferenceMap } from './references'
import { FileId, OperationsApiType, PackageId, TemplatePath, VersionId } from './types'

export type ResolvedDocument = {
  fileId: string
  filename: string
  slug: string
  type: string
  format: FileFormat
  title: string
  version?: string
  labels?: Labels
}

export type VersionDocumentsResolver = (
  version: VersionId,
  packageId: PackageId,
  apiType?: OperationsApiType,
  contractType?: ContractType,
) => Promise<ResolvedVersionDocuments | null>

export type ResolvedVersionDocuments = {
  documents: ReadonlyArray<ResolvedVersionDocument>
  packages: ResolvedReferenceMap
}

export type ResolvedVersionDocument = ResolvedDocument & {
  packageRef?: string
  apiKind?: ApihubApiCompatibilityKind
  shareabilityStatus?: ShareabilityStatus
}

export type Labels = string[]

export type GroupDocumentsResolver = (
  apiType: OperationsApiType,
  version: VersionId,
  packageId: PackageId,
  filterByOperationGroup: string,
) => Promise<ResolvedGroupDocuments | null>

export type ResolvedGroupDocuments = {
  documents: ReadonlyArray<ResolvedGroupDocument>
  packages: ResolvedReferenceMap
}

export type ResolvedGroupDocument = ResolvedDocument & {
  includedOperationIds?: string[]
  data?: string
  packageRef?: string
  description: string
}

export type RawDocumentResolver = (
  version: VersionId,
  packageId: PackageId,
  slug: string,
) => Promise<File | null>

export type FileResolver = (fileId: FileId) => Promise<Blob | null>

export type TemplateResolver = (templatePath: TemplatePath) => Promise<Blob | null>

export const SHAREABILITY_STATUS_SHAREABLE = 'shareable' as const
export const SHAREABILITY_STATUS_NON_SHAREABLE = 'non-shareable' as const
export const SHAREABILITY_STATUS_UNKNOWN = 'unknown' as const

export const SHAREABILITY_STATUSES = [
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
] as const

export type ShareabilityStatus = (typeof SHAREABILITY_STATUSES)[number]
