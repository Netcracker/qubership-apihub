import { useMutation } from '@tanstack/react-query'
import { useShowErrorNotification, useShowSuccessNotification } from './BasePage/Notification'
import type { PackageVersionDto } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import {
  deletePackageVersion, editPackageVersion,
  useInvalidatePackageVersions,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

type DeletePackageVersion = (data: DeletePackageVersionData) => void
type DeletePackageVersionData = { packageKey: Key; versionId: Key }

export function useDeletePackageVersion(): [DeletePackageVersion, IsLoading] {
  const invalidatePackageVersions = useInvalidatePackageVersions()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, DeletePackageVersionData>({
    mutationFn: ({ packageKey, versionId }) => deletePackageVersion(packageKey, versionId),
    onSuccess: () => {
      showNotification({ message: 'Package version has been deleted' })
      return invalidatePackageVersions()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return [mutate, isLoading]
}

type EditPackageVersion = (data: EditPackageVersionData) => void
type EditPackageVersionData = {
  packageKey: Key
  version: VersionKey
  value: Partial<PackageVersionDto>
  oldValue: Partial<PackageVersionDto>
}

export function useEditPackageVersion(): [EditPackageVersion, IsLoading, IsSuccess] {
  const invalidatePackageVersions = useInvalidatePackageVersions()
  const showNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<void, Error, EditPackageVersionData>({
    mutationFn: ({ packageKey, version, value, oldValue }) => editPackageVersion(packageKey, version, value, oldValue),
    onSuccess: () => {
      showNotification({ message: 'Package version has been updated' })
      return invalidatePackageVersions()
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })
  return [mutate, isLoading, isSuccess]
}
