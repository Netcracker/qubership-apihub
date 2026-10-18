import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import { generatePath } from 'react-router-dom'

import type { DiffType } from '@netcracker/qubership-apihub-api-diff'

import type { Key } from '@apihub/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { replaceStringDiffTypeForDTO } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'

import { portalRequestBlob } from '@apihub/utils/requests'
import { useShowErrorNotification } from '../../BasePage/Notification'

export function useDownloadDdlChangesAsExcel(): [DownloadDdlChangesAsExcelFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isPending } = useMutation<void, Error, DownloadDdlChangesOptions>({
    mutationFn: downloadDdlChangesAsExcel,
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isPending]
}

export async function downloadDdlChangesAsExcel(
  options: DownloadDdlChangesOptions,
): Promise<void> {
  const {
    packageKey,
    version,
    textFilter,
    refPackageId,
    severityFilter,
    previousVersion,
    previousVersionPackageId,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)
  const severityDto = replaceStringDiffTypeForDTO(severityFilter)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    refPackageId: { value: refPackageId },
    severity: { value: severityDto },
    previousVersion: { value: previousVersion },
    previousVersionPackageId: { value: previousVersionPackageId },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/ddl/export/changes'

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
    : `ddl-changes-${packageKey}-${version}.xlsx`

  fileDownload(await response.blob(), filename)
}

type DownloadDdlChangesAsExcelFunction = (options: DownloadDdlChangesOptions) => void

type DownloadDdlChangesOptions = Readonly<{
  packageKey: Key
  version: Key
  textFilter?: Key
  refPackageId?: Key
  severityFilter?: DiffType[]
  previousVersion?: Key
  previousVersionPackageId?: Key
}>
