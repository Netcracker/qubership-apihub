import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath, useParams } from 'react-router-dom'
import type { InternalDocuments, QueryResult } from './useInternalDocumentsByPackageVersion'
import { useVersionSearchParam } from '@apihub/routes/root/useVersionSearchParam'
import {
  usePackageSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import { usePackageKind } from '@apihub/routes/root/PortalPage/usePackageKind'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const QUERY_KEY = 'query-key-comparison-internal-documents-by-package-version'

type Options = {
  currentPackageId: PackageKey | undefined
  currentVersionId: VersionKey | undefined
  previousPackageId: PackageKey | undefined
  previousVersionId: VersionKey | undefined
  refPackageId?: PackageKey | undefined
}

export function useComparisonInternalDocumentsByPackageVersion(
  options: Options,
): QueryResult<InternalDocuments, Error | null> {
  const [previousDashboardVersion] = useVersionSearchParam()
  const [previousDashboardId] = usePackageSearchParam()
  const { packageId: currentDashboardId, versionId: currentDashboardVersion } = useParams()
  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND

  if (isDashboard) {
    options = {
      ...options,
      currentPackageId: currentDashboardId,
      currentVersionId: currentDashboardVersion,
      previousPackageId: previousDashboardId || currentDashboardId,
      previousVersionId: previousDashboardVersion,
      refPackageId: options.currentPackageId,
    }
  }

  const { currentPackageId, currentVersionId, previousPackageId, previousVersionId } = options
  const currentPackageKey = encodeURIComponent(currentPackageId ?? '')
  const currentPackageVersion = encodeURIComponent(currentVersionId ?? '')
  const enabled = !!currentPackageKey && !!currentPackageVersion && !!previousPackageId


  const { data, isFetching, error } = useQuery<InternalDocuments, Error, InternalDocuments>({
    queryKey: [QUERY_KEY, currentPackageKey, currentPackageVersion, previousPackageId, previousVersionId],
    queryFn: () => (
      enabled
        ? getComparisonInternalDocumentsByPackageVersion(options)
        : Promise.resolve([])
    ),
    enabled: enabled,
  })

  return {
    data: data,
    isLoading: isFetching,
    error: error,
  }
}

function getComparisonInternalDocumentsByPackageVersion({
    currentPackageId,
    currentVersionId,
    previousPackageId,
    previousVersionId,
    refPackageId,
}: Options): Promise<InternalDocuments> {
  const endpointPattern = '/packages/:packageId/versions/:versionId/comparison-internal-documents'
  const queryParams = optionalSearchParams({
    previousVersion: { value: previousVersionId },
    previousVersionPackageId: { value: previousPackageId },
    refPackageId: { value: refPackageId },
  })
  const endpoint = generatePath(
    endpointPattern,
    {
      packageId: currentPackageId ?? '',
      versionId: currentVersionId ?? '',
    },
  )
  return requestJson<InternalDocuments>(
    `${endpoint}?${queryParams}`,
    { method: 'GET' },
    { basePath: API_V1 },
  )
}
