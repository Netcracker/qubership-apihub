import type { FileKey, Key } from './keys'
import type { OperationDto, PackagesRefs } from './operations'
import type { SpecType } from '../utils/specs'
import type { FileFormat } from './file-formats'
import type { ShareabilityStatus } from '@netcracker/qubership-apihub-api-processor'

export type DocumentsDto = Readonly<{
  documents: ReadonlyArray<DocumentDto>
  packages: PackagesRefs
}>

export type DocumentDto = Readonly<{
  fileId: FileKey
  slug: Key
  filename: string
  title: string
  type: SpecType
  format: FileFormat
  version?: string
  labels?: Labels
  description?: string
  info?: Readonly<DocumentInfo>
  externalDocs?: Readonly<ExternalDocsLink>
  operations?: ReadonlyArray<OperationDto>
  packages?: PackagesRefs // For operations
  packageRef?: string // For dashboards
  shareabilityStatus?: ShareabilityStatus
  hasErrors?: boolean
}>

export type DocumentInfo = {
  contact?: Readonly<DocLink & { email?: string }>
  license?: Readonly<DocLink>
  termsOfService?: string
}

export type DocLink = {
  name?: string
  url?: string
}

export type ExternalDocsLink = Omit<DocLink, 'name'> & { description?: string }

export type Labels = string[]
