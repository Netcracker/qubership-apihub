import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import type { Key } from '@portal/entities/keys'
import { useShowErrorNotification } from '../../BasePage/Notification'
import { generatePath } from 'react-router-dom'
import { portalRequestBlob } from '@portal/utils/requests'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { ApiAudience, ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { ALL_API_KIND, API_AUDIENCE_ALL } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import {
  replaceStringDiffTypeForDTO,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/getOperationChangelog'
import { type DiffType } from '@netcracker/qubership-apihub-api-diff'

export function useDownloadChangesAsExcel(): [DownloadChangesAsExcelFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: (options) => downloadChangesAsExcel(options),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

export const downloadChangesAsExcel = async (
  options: Options,
): Promise<void> => {
  const {
    packageKey,
    version,
    apiType,
    textFilter,
    apiKind,
    apiAudience = API_AUDIENCE_ALL,
    tag,
    severityFilter,
    refPackageId,
    group,
    emptyGroup,
    emptyTag,
    previousVersion,
    previousVersionPackageId,
  } = options
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)
  const severityDto = replaceStringDiffTypeForDTO(severityFilter)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    apiKind: { value: apiKind !== ALL_API_KIND ? apiKind : undefined },
    apiAudience: { value: apiAudience },
    tag: { value: tag },
    severity: { value: severityDto},
    group: { value: group },
    emptyGroup: { value: emptyGroup },
    refPackageId: { value: refPackageId },
    emptyTag: { value: emptyTag },
    previousVersion: { value: previousVersion },
    previousVersionPackageId: { value: previousVersionPackageId },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/export/changes'
  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    {
      method: 'GET',
    }, {
    basePath: API_V3,
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  },
  )

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]

  fileDownload(await response.blob(), getFilename())
}

type DownloadChangesAsExcelFunction = (options: Options) => void

type Options = {
  packageKey: Key
  version: Key
  apiType: Key
  textFilter?: Key
  apiKind?: ApiKind
  apiAudience?: ApiAudience
  tag?: Key
  severityFilter?: DiffType[]
  group?: Key
  emptyGroup?: boolean
  refPackageId?: Key
  emptyTag?: boolean
  previousVersion?: string
  previousVersionPackageId?: string
}
