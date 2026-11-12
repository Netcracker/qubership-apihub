import { useMutation } from '@tanstack/react-query'
import { useShowErrorNotification, useShowSuccessNotification } from '../BasePage/Notification'
import { useRefetchAllPackages } from '../usePackages'
import { useInvalidatePackage } from '../usePackage'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestVoid } from '@portal/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

type FavorPackage = (packageKey: Key) => void

export function useFavorPackage(packageKey?: Key, refererPageName?: string, isWorkspace: boolean = false): [FavorPackage, IsLoading, IsSuccess] {
  const showErrorNotification = useShowErrorNotification()
  const showNotification = useShowSuccessNotification()
  const invalidatePackage = useInvalidatePackage()
  const refetchAllPackages = useRefetchAllPackages()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, Key>({
    mutationFn: packageKey => favorPackage(packageKey),
    onSuccess: () => {
      refetchAllPackages()
      packageKey && invalidatePackage(packageKey)
      isWorkspace && showNotification({ message: 'List of workspaces successfully updated' })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

export async function favorPackage(
  packageKey: Key,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)

  const pathPattern = '/packages/:packageId/favor'
  return await portalRequestVoid(generatePath(pathPattern, { packageId }), {
    method: 'POST',
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}
