import { API_V1, requestText } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router'
import type { InternalDocumentMetaData, QueryResult } from './useInternalDocumentsByPackageVersion'

const QUERY_KEY = 'query-key-internal-document-content'

export function useInternalDocumentContent(
  hash: InternalDocumentMetaData['hash'] | undefined,
): QueryResult<string, Error> {
  const { data, isLoading, error } = useQuery<string, Error, string>({
    queryKey: [QUERY_KEY, hash],
    queryFn: () => (hash ? getInternalDocumentContent(hash) : Promise.resolve('')),
    enabled: !!hash,
  })

  return { data, isLoading, error }
}

function getInternalDocumentContent(
  hash: InternalDocumentMetaData['hash'],
): Promise<string> {
  const endpointPattern = '/version-internal-documents/:hash'
  const endpoint = generatePath(endpointPattern, { hash })

  return requestText(
    endpoint,
    { method: 'GET' },
    { basePath: API_V1 },
  )
}
