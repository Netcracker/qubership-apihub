import type { Key } from '@portal/entities/keys'
import { portalRequestJson } from '@portal/utils/requests'
import type { RefetchQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useQuery } from '@tanstack/react-query'

const SHARED_KEY_QUERY_KEY = 'shared-key-query-key'

export function useGetSharedKey(
  slug: string,
  docPackageKey: string | undefined,
  docPackageVersionKey: string | undefined,
): RefetchQuery<string, Error> {
  const { refetch } = useQuery<string, Error, string>({
    queryKey: [SHARED_KEY_QUERY_KEY, docPackageKey, docPackageVersionKey, slug],
    queryFn: () => getSharedKey(docPackageKey!, docPackageVersionKey!, slug!),
    enabled: false,
  })

  return refetch
}

async function getSharedKey(
  packageKey: Key,
  versionKey: Key,
  fileKey: Key,
): Promise<string> {
  const packageId = encodeURIComponent(packageKey)
  const fileId = encodeURIComponent(fileKey)

  const data = await portalRequestJson<SharedIdType>(
    '/sharedFiles',
    {
      method: 'post',
      body: JSON.stringify({
        packageId: packageId,
        version: versionKey,
        slug: fileId,
      }),
    },
  )
  const { sharedFileId } = data

  return sharedFileId
}

type SharedIdType = {
  sharedFileId: string
}
