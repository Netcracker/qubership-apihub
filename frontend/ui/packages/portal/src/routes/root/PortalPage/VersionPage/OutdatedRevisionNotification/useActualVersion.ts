import { useQuery } from '@tanstack/react-query'
import { getCurrentPackageVersionContent } from '../../../usePackageVersionContent'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  PackageVersionContent,
  PackageVersionContentDto,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'

export function useActualVersion(packageKey: Key | undefined, versionKey: Key | undefined): Key | undefined {
  const {
    data: { version } = {},
  } = useQuery<PackageVersionContentDto, Error, PackageVersionContent>(getCurrentPackageVersionContent(packageKey!, versionKey!))

  return version
}
