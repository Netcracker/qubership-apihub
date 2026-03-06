import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export type InternalDocumentMetaData = {
  id: Key
  fileName: string
  hash: string
}

export type InternalDocuments = ReadonlyArray<InternalDocumentMetaData>

export type QueryResult<T, E = Error> = {
  data: T | undefined
  isLoading: boolean
  error: E | null
}

export type QueryResultWithNoInternalDocument<T, E = Error> = QueryResult<T, E> & {
  hasInternalDocument: boolean
}
