import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import { generatePath } from 'react-router-dom'

import type { Key, PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V2 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import { portalRequestBlob } from '@portal/utils/requests'
import { useShowErrorNotification } from '../../../../BasePage/Notification'

export function useExportDocumentErrors(): [ExportDocumentErrorsFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({ packageKey, versionKey, documentId, emptyDocumentId }) =>
      exportDocumentErrors(packageKey, versionKey, documentId, emptyDocumentId),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

export async function exportDocumentErrors(
  packageKey: PackageKey,
  versionKey: VersionKey,
  documentId?: Key,
  emptyDocumentId?: boolean,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({
    documentId: { value: documentId },
    emptyDocumentId: { value: emptyDocumentId },
    includeChangelogNotifications: { value: 'false' },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/export/notifications'

  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'GET' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )

  const contentDisposition = response.headers.get('content-disposition')
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1]!.split(';')[0]!.replace(/"/g, '')
    : `document-errors-${documentId ?? 'version'}.xlsx`

  fileDownload(await response.blob(), filename)
}

type ExportDocumentErrorsFunction = (options: Options) => void

type Options = Readonly<{
  packageKey: PackageKey
  versionKey: VersionKey
  documentId?: Key
  emptyDocumentId?: boolean
}>
