import { useMutation, useQueryClient } from '@tanstack/react-query'
import { generatePath } from 'react-router'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import type {
  OasSettingsExtensions,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/ExportSettingsTab/package-export-config'
import {
  toOasExtensionNames,
  toOasSettingsExtensions,
} from '@apihub/routes/root/PortalPage/PackageSettingsPage/ExportSettingsTab/package-export-config'
import type { ExportConfigDto } from '@apihub/routes/root/PortalPage/useExportConfig'
import { QUERY_KEY_EXPORT_CONFIG, useExportConfig } from '@apihub/routes/root/PortalPage/useExportConfig'

type UpdateExportConfigDto = {
  allowedOasExtensions: ReadonlyArray<string>
}

interface AllowedOasExtensionsResult {
  oasExtensions: OasSettingsExtensions
  isOasExtensionsLoading: IsLoading
}

interface UpdateAllowedOasExtensionsResult {
  updateOasExtensions: (packageId: Key, extensions: OasSettingsExtensions) => void
  isOasExtensionsUpdating: IsLoading
  isOasExtensionsUpdatingSuccess: IsSuccess
}

export function useAllowedOasExtensions(packageId: Key): AllowedOasExtensionsResult {

  const [data, isLoading] = useExportConfig(packageId)

  return {
    oasExtensions: toOasSettingsExtensions(data, packageId),
    isOasExtensionsLoading: isLoading,
  }
}

export function useUpdateAllowedOasExtensions(): UpdateAllowedOasExtensionsResult {
  const queryClient = useQueryClient()

  const { mutate, isLoading, isSuccess } = useMutation<
    ExportConfigDto,
    Error,
    { packageId: Key; extensions: OasSettingsExtensions }
  >({
    mutationFn: ({ packageId, extensions }) => updatePackageExportConfig(packageId, extensions),
    onSuccess: () =>
      queryClient.refetchQueries({ queryKey: [QUERY_KEY_EXPORT_CONFIG] }),
  })

  const updateOasExtensions = (packageId: Key, extensions: OasSettingsExtensions): void =>
    mutate({ packageId, extensions })

  return {
    updateOasExtensions: updateOasExtensions,
    isOasExtensionsUpdating: isLoading,
    isOasExtensionsUpdatingSuccess: isSuccess,
  }
}

async function updatePackageExportConfig(packageId: Key, extensions: OasSettingsExtensions): Promise<ExportConfigDto> {
  const payload: UpdateExportConfigDto = {
    allowedOasExtensions: toOasExtensionNames(extensions),
  }

  return await requestJson<ExportConfigDto>(
    generatePath('/packages/:packageId/exportConfig', { packageId }),
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    { basePath: API_V1 },
  )
}
