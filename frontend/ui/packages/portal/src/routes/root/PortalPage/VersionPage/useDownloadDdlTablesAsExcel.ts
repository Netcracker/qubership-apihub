import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import { generatePath } from 'react-router-dom'

import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import type { Key } from '@apihub/entities/keys'
import { portalRequestBlob } from '@apihub/utils/requests'
import { useShowErrorNotification } from '../../BasePage/Notification'

export function useDownloadDdlTablesAsExcel(): [DownloadDdlTablesAsExcelFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({ packageKey, version, textFilter, refPackageId }) =>
      downloadDdlTablesAsExcel(packageKey!, version!, textFilter, refPackageId),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

export async function downloadDdlTablesAsExcel(
  packageId: Key,
  versionId: Key,
  textFilter?: Key,
  refPackageId?: Key,
): Promise<void> {
  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    refPackageId: { value: refPackageId },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/ddl/export/entities'

  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'GET' },
    {
      basePath: API_V1,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )

  const contentDisposition = response.headers.get('content-disposition')
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1]!.split(';')[0]!
    : `ddl-tables-${packageId}-${versionId}.xlsx`

  fileDownload(await response.blob(), filename)
}

type DownloadDdlTablesAsExcelFunction = (options: Options) => void

type Options = Readonly<{
  packageKey: Key
  version: Key
  textFilter?: Key
  refPackageId?: Key
}>
