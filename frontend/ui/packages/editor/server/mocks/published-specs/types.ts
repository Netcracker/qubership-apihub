import type { FileKey, Key, VersionKey } from '../../types'
import type { FileFormat } from '../files/types'
import type { MethodType } from '../projects/types'
import type { SpecType } from '../specs/types'

export type OpenApiOperation = {
  path: string
  method: MethodType
  title: string
  tags: string[]
}

export type OpenApiObject = {
  title: string
  description?: string
  version: VersionKey
  operations: ReadonlyArray<OpenApiOperation>
}

export type PublishedSpecDto = Readonly<{
  fileId: FileKey
  slug: Key
  title: string
  type: SpecType
  format?: FileFormat
  labels?: string[]
  openAPI?: OpenApiObject
}>
