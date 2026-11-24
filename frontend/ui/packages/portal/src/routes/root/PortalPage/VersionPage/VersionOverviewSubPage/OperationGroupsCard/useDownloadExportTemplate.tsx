import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMutation } from '@tanstack/react-query'
import type { Key } from '@portal/entities/keys'
import fileDownload from 'js-file-download'
import { useShowErrorNotification } from '@portal/routes/root/BasePage/Notification'
import { fetchExportTemplate } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export function useDownloadExportTemplate(): [DownloadExportTemplate, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({ packageKey, version, apiType, groupName }) =>
      downloadExportTemplate(packageKey, version, apiType, groupName),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

async function downloadExportTemplate(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType,
  groupName: string,
): Promise<void> {
  const [content, fileName] = await fetchExportTemplate(packageKey, versionKey, apiType, groupName)
  fileDownload(content, fileName)
}

type DownloadExportTemplate = (options: Options) => void

type Options = {
  packageKey: Key
  version: Key
  groupName: string
  apiType: ApiType
}
