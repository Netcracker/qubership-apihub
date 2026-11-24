import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import type { Key } from '@portal/entities/keys'
import { generatePath } from 'react-router-dom'
import { portalRequestBlob } from '@portal/utils/requests'
import { useShowErrorNotification } from '@portal/routes/root/BasePage/Notification'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export function useDownloadPublicationReport(): [DownloadPublicationReportFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: (options) => downloadPublicationReport(options),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

export const downloadPublicationReport = async ({
  packageKey,
  versionKey,
  publishKey,
}: Options): Promise<void> => {
  const packageId = encodeURIComponent(packageKey)
  const publishId = encodeURIComponent(publishKey)

  const pathPattern = '/packages/:packageId/publish/:publishId/withOperationsGroup/report'
  const response = await portalRequestBlob(
    generatePath(pathPattern, { packageId, publishId }),
    {
      method: 'GET',
    }, {
      basePath: API_V1,
    },
  )

  fileDownload(await response.blob(), `Report_${packageKey}_${versionKey}.csv`)
}

export type DownloadPublicationReportFunction = (options: Options) => void

type Options = {
  packageKey: Key
  versionKey: Key
  publishKey: Key
}
