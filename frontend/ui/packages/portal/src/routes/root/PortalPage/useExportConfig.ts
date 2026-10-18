import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router'

export type OasExtensionDto = Readonly<{
  oasExtension: string
  packageId: PackageKey
  packageName: string
  packageKind: PackageKind
}>

export type ExportConfigDto = Readonly<{
  allowedOasExtensions: OasExtensionDto[]
}>

export type OasExtension = Readonly<Omit<OasExtensionDto, 'packageId'> & Partial<{
  packageKey: PackageKey
}>>

export type ExportConfig = Readonly<{
  allowedOasExtensions: ReadonlyArray<OasExtension>
}>

export const QUERY_KEY_EXPORT_CONFIG = 'query-key-export-config'

const DEFAULT_EXPORT_CONFIG: ExportConfig = { allowedOasExtensions: [] }

export function useExportConfig(packageKey: PackageKey): [ExportConfig, IsLoading] {
  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY_EXPORT_CONFIG, packageKey],
    queryFn: () => getExportConfig(packageKey),
    select: toExportConfig,
  })

  return [data ?? DEFAULT_EXPORT_CONFIG, isLoading]
}

function getExportConfig(packageId: PackageKey): Promise<ExportConfigDto> {
  const pattern = '/packages/:packageId/exportConfig'
  return requestJson<ExportConfigDto>(
    generatePath(pattern, { packageId }),
    { method: 'GET' },
    { basePath: API_V1 },
  )
}

function toExportConfig(dto: ExportConfigDto): ExportConfig {
  return {
    allowedOasExtensions: dto.allowedOasExtensions?.map(dto => ({
      ...dto,
      packageKey: dto.packageId,
    })),
  }
}
