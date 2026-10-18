import { type QueryClient, useQuery } from '@tanstack/react-query'

import type { DocumentsDto } from '@netcracker/qubership-apihub-ui-shared/entities/documents'
import type { FileKey, PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getAllResolvedVersionDocuments } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

const DOCUMENT_ERROR_FILE_KEYS_QUERY_KEY = 'document-error-file-keys-query-key'

const EMPTY_DOCUMENT_ERROR_FILE_KEYS: ReadonlySet<FileKey> = new Set()

type UseDocumentErrorFileKeysOptions = {
  packageKey: PackageKey
  versionKey: VersionKey
}

/**
 * Returns the file keys of the documents with errors in a published version. All callers for one package version
 * share one query and its cached response.
 */
export function useDocumentErrorFileKeys({
  packageKey,
  versionKey,
}: UseDocumentErrorFileKeysOptions): ReadonlySet<FileKey> {
  const { data } = useQuery<DocumentsDto, Error, ReadonlySet<FileKey>>({
    queryKey: [DOCUMENT_ERROR_FILE_KEYS_QUERY_KEY, versionKey, packageKey],
    // The api-processor type has no hasErrors, so the response is cast to DocumentsDto. That type also declares
    // operations, info, and external docs, which the list does not return. Correct typing is a wider change; see
    // the todo above getResolvedVersionDocuments in packages-builder.ts.
    queryFn: ({ signal }) =>
      getAllResolvedVersionDocuments(packageKey, versionKey, undefined, undefined, signal) as Promise<DocumentsDto>,
    select: toDocumentErrorFileKeys,
  })

  return data ?? EMPTY_DOCUMENT_ERROR_FILE_KEYS
}

/**
 * Removes the cached documents of every package of the version. The query key has no revision, so a new publication
 * of the version would otherwise show the documents of the previous one.
 */
export function removeDocumentErrorFileKeys(client: QueryClient, versionKey: VersionKey): void {
  client.removeQueries({ queryKey: [DOCUMENT_ERROR_FILE_KEYS_QUERY_KEY, versionKey] })
}

function toDocumentErrorFileKeys({ documents }: DocumentsDto): ReadonlySet<FileKey> {
  return new Set(documents.filter(({ hasErrors }) => hasErrors).map(({ fileId }) => fileId))
}
