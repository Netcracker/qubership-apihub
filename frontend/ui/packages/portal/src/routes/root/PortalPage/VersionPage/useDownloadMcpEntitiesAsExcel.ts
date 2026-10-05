import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import { generatePath } from 'react-router-dom'

import {
  type McpCollection,
  mcpCollectionToApiSegment,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import type { Key } from '@portal/entities/keys'
import { portalRequestBlob } from '@portal/utils/requests'
import { useShowErrorNotification } from '../../BasePage/Notification'

type DownloadMcpEntitiesAsExcelOptions = Readonly<{
  packageKey: Key
  version: Key
  collection: McpCollection
  textFilter?: Key
  refPackageId?: Key
}>

type DownloadMcpEntitiesAsExcelFunction = (options: DownloadMcpEntitiesAsExcelOptions) => void

async function downloadMcpEntitiesAsExcel(
  options: DownloadMcpEntitiesAsExcelOptions,
): Promise<void> {
  const { packageKey, version, collection, textFilter, refPackageId } = options

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    refPackageId: { value: refPackageId },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/mcp/export/:entity'

  const response = await portalRequestBlob(
    `${
      generatePath(pathPattern, {
        packageId: packageKey,
        versionId: version,
        entity: mcpCollectionToApiSegment(collection),
      })
    }?${queryParams}`,
    { method: 'GET' },
    {
      basePath: API_V1,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )

  const contentDisposition = response.headers.get('content-disposition')
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1]!.split(';')[0]!
    : `mcp-entities-${packageKey}-${version}.xlsx`

  fileDownload(await response.blob(), filename)
}

export function useDownloadMcpEntitiesAsExcel(): [DownloadMcpEntitiesAsExcelFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, DownloadMcpEntitiesAsExcelOptions>({
    mutationFn: downloadMcpEntitiesAsExcel,
    onError: (error: Error) => {
      showErrorNotification({ message: error.message })
    },
  })

  return [mutate, isLoading]
}
