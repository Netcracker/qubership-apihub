import type { Dispatch, SetStateAction } from 'react'
import { useEffect } from 'react'
import { useFilteredPackageRefs } from '../../useRefPackage'
import type { PackageReferenceWithStatus } from '../DashboardPage/configure-dashboard'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export function useSetReferences(
  packageKey: Key | undefined,
  versionKey: Key | undefined,
  setReferences: Dispatch<SetStateAction<PackageReferenceWithStatus[]>>,
  onLoading: (value: boolean) => void,
): void {

  const { data: packageReferences, isInitialLoading } = useFilteredPackageRefs({
    packageKey: packageKey!,
    version: versionKey!,
    enabled: !!versionKey,
  })

  useEffect(() => onLoading(isInitialLoading), [isInitialLoading, onLoading])

  useEffect(() => {
    isNotEmpty(packageReferences) && setReferences(packageReferences.map(packageReference => {
      return {
        packageReference: packageReference,
        added: false,
      }
    }))
  }, [setReferences, packageReferences])
}
