import { useShowErrorNotification } from '@apihub/routes/root/BasePage/Notification'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1, requestUnknown } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router'

export enum ExportStatusValue {
  RUNNING = 'running',
  ERROR = 'error',
  NONE = 'none'
}

type ExportStatusDto = Partial<{
  status: ExportStatusValue
  message: string
}>

type ExportStatus = ExportStatusDto

const QUERY_KEY_EXPORT_STATUS = 'query-key-export-status'

export function useExportStatus(
  exportId: Key | undefined,
  enabled: boolean,
  onSuccess?: () => void,
  onError?: () => void,
): [ExportStatus | null, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY_EXPORT_STATUS, exportId],
    queryFn: () => getExportStatus(exportId!),
    refetchInterval: (result) => {
      const receivedExportStatus = isExportStatusDto(result)
      if (
        result === undefined ||
        receivedExportStatus && [
          ExportStatusValue.NONE,
          ExportStatusValue.RUNNING,
        ].some(status => result.status === status)
      ) {
        return 2000
      }
      if (receivedExportStatus && result.status === ExportStatusValue.ERROR) {
        showErrorNotification({
          title: 'Export failed',
          message: result.message ?? 'Unknown error',
        })
        onError?.()
        return false
      }
      onSuccess?.()
      return false
    },
    refetchIntervalInBackground: true,
    enabled: enabled,
  })

  return [data ?? null, isLoading]
}

async function getExportStatus(exportId: Key): Promise<ExportStatusDto | null> {
  const pattern = '/export/:exportId/status'

  const response = await requestUnknown<ExportStatusDto | null>(
    generatePath(pattern, { exportId }),
    { method: 'GET' },
    {
      basePath: API_V1,
      mediaTypes: ['application/json', 'application/octet-stream'],
    },
  )

  if (isExportStatusDto(response)) {
    return response
  }

  return null
}

function isExportStatusDto(value: unknown): value is ExportStatusDto {
  return !!value && typeof value === 'object' && 'status' in value
}
