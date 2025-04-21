import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generatePath } from 'react-router'
import type { Key } from '../../entities/keys'
import type { IsLoading, IsSuccess } from '../../utils/aliases'
import { API_V1, requestJson } from '../../utils/requests'
import type {
  OasExtensions,
  PackageExportConfigDto,
  UpdatePackageExportConfigDto,
} from '../../entities/package-export-config'
import { toOasExtensionNames, toOasExtensions } from '../../entities/package-export-config'

const QUERY_KEY_PACKAGE_EXPORT_CONFIG = 'package-export-config-query'
const EXPORT_CONFIG_PATH_PATTERN = '/packages/:packageId/exportConfig'

interface AllowedOasExtensionsResult {
  oasExtensions: OasExtensions
  isOasExtensionsLoading: IsLoading
}

interface UpdateAllowedOasExtensionsResult {
  updateOasExtensions: (packageId: Key, extensions: OasExtensions) => void
  isOasExtensionsUpdating: IsLoading
  isOasExtensionsUpdatingSuccess: IsSuccess
}

export function useAllowedOasExtensions(packageId: Key): AllowedOasExtensionsResult {
  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY_PACKAGE_EXPORT_CONFIG, packageId],
    queryFn: () => getPackageExportConfig(packageId),
    select: (value: PackageExportConfigDto) => toOasExtensions(value, packageId),
  })

  return {
    oasExtensions: data ?? [],
    isOasExtensionsLoading: isLoading,
  }
}

export function useUpdateAllowedOasExtensions(): UpdateAllowedOasExtensionsResult {
  const queryClient = useQueryClient()

  const { mutate, isLoading, isSuccess } = useMutation<
    PackageExportConfigDto,
    Error,
    { packageId: Key; extensions: OasExtensions }
  >({
    mutationFn: ({ packageId, extensions }) => updatePackageExportConfig(packageId, extensions),
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: [QUERY_KEY_PACKAGE_EXPORT_CONFIG] }),
  })

  const updateOasExtensions = (packageId: Key, extensions: OasExtensions): void =>
    mutate({ packageId, extensions })

  return {
    updateOasExtensions: updateOasExtensions,
    isOasExtensionsUpdating: isLoading,
    isOasExtensionsUpdatingSuccess: isSuccess,
  }
}

async function getPackageExportConfig(packageId: Key): Promise<PackageExportConfigDto> {
  return await requestJson<PackageExportConfigDto>(
    generatePath(EXPORT_CONFIG_PATH_PATTERN, { packageId }),
    { method: 'GET' },
    { basePath: API_V1 },
  )
}

async function updatePackageExportConfig(packageId: Key, extensions: OasExtensions): Promise<PackageExportConfigDto> {
  const payload: UpdatePackageExportConfigDto = {
    allowedOasExtensions: toOasExtensionNames(extensions),
  }

  return await requestJson<PackageExportConfigDto>(
    generatePath(EXPORT_CONFIG_PATH_PATTERN, { packageId }),
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    { basePath: API_V1 },
  )
}
