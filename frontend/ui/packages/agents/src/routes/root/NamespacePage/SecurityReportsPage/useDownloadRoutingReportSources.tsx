import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMutation } from '@tanstack/react-query'
import type { Key } from '@agents/entities/keys'
import fileDownload from 'js-file-download'
import { API_V3, requestBlob } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { generatePath } from 'react-router-dom'
import {
  useGetNcServicePrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export function useDownloadRoutingReportSources(): [DownloadRoutingReportSourcesFunction, IsLoading] {
  const prefix = useGetNcServicePrefix()
  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({ processKey }) => downloadRoutingReportSources(processKey!, prefix),
  })
  return [mutate, isLoading]
}

export const downloadRoutingReportSources = async (
  processId: Key,
  prefix: string,
): Promise<void> => {

  const pathPattern = '/security/gatewayRouting/:processId/source'
  const response = await requestBlob(
    generatePath(pathPattern, { processId }),
    {
      method: 'GET',
    }, {
      basePath: `${prefix}${API_V3}`,
    },
  )

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]
    .slice(1, -1)

  fileDownload(await response.blob(), getFilename())
}

export type DownloadRoutingReportSourcesFunction = (options: Options) => void

type Options = {
  processKey: Key
}
