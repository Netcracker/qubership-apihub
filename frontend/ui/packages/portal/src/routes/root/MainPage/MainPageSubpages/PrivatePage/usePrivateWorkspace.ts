import { useShowErrorNotification } from '../../../BasePage/Notification'
import { useMutation } from '@tanstack/react-query'
import { SPACE_QUERY_KEY } from './usePrivateWorkspaceUser'
import { useRefetchPackage } from '../../../usePackage'
import { useRefetchPackages } from '../../../usePackages'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACES_PAGE_REFERER } from '@portal/entities/referer-pages-names'
import type { PackageDto } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { portalRequestJson } from '@portal/utils/requests'

export function useCreatePersonalPackage(): [CreatePersonalPackage, IsLoading, IsSuccess, Error | null] {
  const showErrorNotification = useShowErrorNotification()
  const refetchPackage = useRefetchPackage(SPACE_QUERY_KEY)
  const refetchPackages = useRefetchPackages({ refererPageName: WORKSPACES_PAGE_REFERER })

  const { mutate, isLoading, isSuccess, error } = useMutation<PackageDto, Error, Key>({
    mutationFn: (userId) => createPersonalPackage(userId),
    onSuccess: () => {
      refetchPackage()
      refetchPackages()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading, isSuccess, error]
}

export async function createPersonalPackage(
  userId: Key,
): Promise<PackageDto> {
  return await portalRequestJson<PackageDto>(`/users/${userId}/space`, {
    method: 'POST',
  })
}

type CreatePersonalPackage = (userId: Key) => void
