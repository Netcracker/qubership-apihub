import { requestText } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import type { InternalDocumentMetaData, QueryResult } from './useInternalDocumentsByPackageVersion'

const QUERY_KEY = 'query-key-comparison-internal-document-content'

export function useComparisonInternalDocumentContent(
  hash: InternalDocumentMetaData['hash'] | undefined,
): QueryResult<string, Error | null> {
  const { data, isFetching, error } = useQuery<string, Error, string>({
    queryKey: [QUERY_KEY, hash],
    queryFn: () => (hash ? getComparisonInternalDocumentContent(hash) : Promise.resolve('')),
    enabled: !!hash,
  })
  return { 
    data: data,
    isLoading: isFetching,
    error: error,
  }
}

function getComparisonInternalDocumentContent(
  hash: InternalDocumentMetaData['hash'],
): Promise<string> {
  const endpointPattern = '/comparison-internal-documents/:hash'
  const endpoint = generatePath(endpointPattern, { hash })
  return requestText(endpoint, { method: 'GET' }, { basePath: API_V1 })
}
